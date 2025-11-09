<template>
  <div class="tagMindmapPage" :class="{ isDark: isDark }">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <div class="header-left">
        <el-button 
          type="text" 
          icon="el-icon-arrow-left" 
          @click="backToEditor"
          class="back-btn"
        >
          返回编辑器
        </el-button>
        <div class="breadcrumb">
          <span class="breadcrumb-item">编辑器</span>
          <i class="el-icon-arrow-right breadcrumb-separator"></i>
          <span class="breadcrumb-item active">导图管理</span>
        </div>
      </div>
      
      <div class="header-right">
        <div class="search-container">
          <el-input
            v-model="globalSearchKeyword"
            placeholder="搜索思维导图..."
            prefix-icon="el-icon-search"
            clearable
            class="global-search"
            @input="handleGlobalSearch"
          ></el-input>
        </div>
        
        <el-button-group class="action-buttons">
          <el-button
            icon="el-icon-setting"
            @click="openSettings"
          >
            设置
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="page-content">
      <!-- 左侧标签树面板 -->
      <div class="left-panel">
        <TagTreePanel 
          :user-tags="userTags"
          :selected-tag-ids="selectedTagIds"
          :mindmap-tag-mapping="mindMapTagMapping"
          :local-mindmaps="localMindMaps"
          @tag-select="handleTagSelect"
          @tag-create="handleTagCreate"
          @tag-edit="handleTagEdit"
          @tag-delete="handleTagDelete"
          @mindmap-add-tag="handleMindmapAddTag"
        />
      </div>

      <!-- 右侧思维导图卡片区域 -->
      <div class="right-panel">
        <MindmapCards
          :mindmaps="filteredMindMaps"
          :user-tags="userTags"
          :mindmap-tag-mapping="mindMapTagMapping"
          :selected-mindmap-ids="selectedMindmapIds"
          :loading="isLoading"
          :search-keyword="globalSearchKeyword"
          @mindmap-select="handleMindmapSelect"
          @mindmap-load="handleMindmapLoad"
          @mindmap-delete="handleMindmapDelete"
          @mindmap-rename="handleMindmapRename"
          @mindmap-tag-update="handleMindmapTagUpdate"
          @batch-operation="handleBatchOperation"
        />
      </div>
    </div>

    <!-- 加载遮罩 -->
    <transition name="fade">
      <div v-if="pageLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">加载中...</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import TagCacheManager from '@/utils/tagCacheManager'
import { tagApi } from '@/api/supabase-api'
import { mindMapCacheManager } from '@/utils/mindmap-cache-manager'
import TagTreePanel from './TagTreePanel.vue'
import MindmapCards from './MindmapCards.vue'

export default {
  name: 'TagMindmapPage',
  components: {
    TagTreePanel,
    MindmapCards
  },
  data() {
    return {
      // 搜索相关
      globalSearchKeyword: '',
      
      // 选择状态
      selectedTagIds: [],
      selectedMindmapIds: [],
      
      // 加载状态
      isLoading: false,
      pageLoading: true,
      
      // 本地缓存数据
      cachedMindMapTagMapping: {},
      
      // 从缓存加载的思维导图数据
      cachedMindMaps: []
    }
  },
  computed: {
    ...mapState(['localMindMaps', 'currentUser', 'localConfig']),
    
    isDark() {
      return this.localConfig.isDark
    },
    
    // 获取用户标签
    userTags() {
      return TagCacheManager.getUserTags()
    },
    
    // 获取思维导图标签映射
    mindMapTagMapping() {
      return this.cachedMindMapTagMapping
    },
    
    // 筛选后的思维导图
    filteredMindMaps() {
      // 如果选择的是未分类，直接返回计算好的结果
      if (this.selectedTagIds.includes('__untagged__')) {
        const result = this.getUntaggedMindMaps()
        return result
      }
      
      // 优先使用从缓存加载的思维导图数据
      const mindMaps = this.getAllMindmapsData()
      
      // 确保数据存在
      if (!mindMaps || !Array.isArray(mindMaps)) {
        return []
      }
      
      let filtered = [...mindMaps]
      
      // 全局搜索筛选
      if (this.globalSearchKeyword.trim()) {
        const keyword = this.globalSearchKeyword.trim().toLowerCase()
        filtered = filtered.filter(mindMap => 
          (mindMap.title || mindMap.name || '').toLowerCase().includes(keyword) ||
          this.getMindmapTagNames(mindMap.id).some(tagName => 
            tagName.toLowerCase().includes(keyword)
          )
        )
      }
      
      // 普通标签筛选
      if (this.selectedTagIds.length > 0) {
        filtered = filtered.filter(mindMap => {
          const mindMapTags = this.mindMapTagMapping[mindMap.id] || []
          return this.selectedTagIds.some(tagId => mindMapTags.includes(tagId))
        })
      }
      
      // 按更新时间排序
      return filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    }
  },
  watch: {
    // 监听标签选择变化
    selectedTagIds: {
      handler(newVal) {
        // 标签选择变化时的处理逻辑
      },
      immediate: true
    }
  },
  created() {
    // 初始化数据
    this.initPageData()
    
    // 监听相关事件
    this.$bus.$on('refreshMindmapData', this.refreshData)
  },
  mounted() {
    // 页面加载完成后再次更新缓存
    this.updateCachedData()
    
    // 页面加载完成
    setTimeout(() => {
      this.pageLoading = false
    }, 500)
    
    // 发送页面切换事件
    this.$bus.$emit('pageChanged', 'mindmap-manager')
  },
  beforeDestroy() {
    this.$bus.$off('refreshMindmapData', this.refreshData)
  },
  methods: {
    // 清理标题，移除HTML标签和多余字符
    cleanTitle(title) {
      if (!title || typeof title !== 'string') {
        return '未命名思维导图'
      }
      
      let cleaned = title.trim()
      // 移除HTML标签
      cleaned = cleaned.replace(/<[^>]+>/g, '')
      // 移除多余的空白字符
      cleaned = cleaned.replace(/\s+/g, ' ').trim()
      
      return cleaned.length > 0 ? cleaned : '未命名思维导图'
    },
    
    // 从缓存加载所有思维导图数据
    loadMindMapsFromCache() {
      try {
        const allIds = mindMapCacheManager.getAllIds()
        const mindMaps = []
        
        // 同时从store获取已有的元数据作为补充
        const storeMindMaps = this.localMindMaps || []
        const storeMap = {}
        storeMindMaps.forEach(mindMap => {
          storeMap[mindMap.id] = mindMap
        })
        
        for (const id of allIds) {
          const cachedContent = mindMapCacheManager.get(id)
          if (cachedContent) {
            // 尝试从store获取元数据
            let mindMapMeta = storeMap[id]
            
            // 如果store中没有，尝试从内容中解析
            if (!mindMapMeta || !mindMapMeta.title || mindMapMeta.title === '未命名思维导图') {
              let parsedTitle = '未命名思维导图'
              
              // 尝试从缓存内容中提取标题
              try {
                if (typeof cachedContent === 'string') {
                  // 如果是字符串，尝试解析为JSON
                  const parsedContent = JSON.parse(cachedContent)
                  parsedTitle = parsedContent.root?.data?.text || 
                                parsedContent.title || 
                                parsedContent.name ||
                                '未命名思维导图'
                } else if (cachedContent) {
                  // 如果已经是对象，尝试多种可能的标题字段
                  parsedTitle = cachedContent.root?.data?.text || 
                                cachedContent.title || 
                                cachedContent.name ||
                                cachedContent.mindMap?.root?.data?.text ||
                                '未命名思维导图'
                }
                
                // 清理标题，移除HTML标签和多余字符
                if (parsedTitle && parsedTitle !== '未命名思维导图') {
                  parsedTitle = this.cleanTitle(parsedTitle)
                }
              } catch (parseError) {
                console.warn(`解析思维导图 ${id} 的标题失败:`, parseError.message)
              }
              
              // 创建一个基础的元数据对象
              mindMapMeta = {
                id: id,
                title: parsedTitle,
                updated_at: cachedContent.updated_at || new Date().toISOString(),
                created_at: cachedContent.created_at || new Date().toISOString(),
                is_public: cachedContent.is_public || false,
                user_id: this.currentUser?.id || 1
              }
            }
            
            mindMaps.push(mindMapMeta)
          }
        }
        
        return mindMaps
      } catch (error) {
        console.error('从缓存加载思维导图数据失败:', error)
        return []
      }
    },
    
    // 获取未分类的思维导图数据
    getUntaggedMindMaps() {
      try {
        // 1. 获取所有思维导图ID
        const allIds = mindMapCacheManager.getAllIds()
        
        // 2. 获取有标签的思维导图ID
        const tagMappings = TagCacheManager.getMindMapTagIds()
        const taggedIds = Object.keys(tagMappings).filter(id => 
          tagMappings[id] && tagMappings[id].length > 0
        )
        
        // 3. 计算差集（未分类的ID）
        const untaggedIds = allIds.filter(id => !taggedIds.includes(id))
        
        // 4. 获取所有思维导图数据并筛选
        const allMindmaps = this.getAllMindmapsData()
        return allMindmaps.filter(mindmap => untaggedIds.includes(mindmap.id))
        
      } catch (error) {
        console.error('获取未分类思维导图失败:', error)
        return []
      }
    },
    
    // 获取所有思维导图数据
    getAllMindmapsData() {
      return this.cachedMindMaps.length > 0 ? this.cachedMindMaps : (this.localMindMaps || [])
    },
    
    // 从数据库加载思维导图数据
    async loadMindMapsFromDatabase() {
      if (!this.currentUser) {
        console.warn('当前用户不存在，无法从数据库加载思维导图')
        return []
      }
      
      try {
        const mindMaps = await this.$store.dispatch('getUserMindMaps', this.currentUser.id)
        
        // 同步到store的localMindMaps
        if (mindMaps && mindMaps.length > 0) {
          this.$store.commit('setLocalMindMaps', mindMaps)
        }
        
        return mindMaps || []
      } catch (error) {
        console.error('从数据库加载思维导图失败:', error)
        this.$message.error('加载思维导图数据失败')
        return []
      }
    },
    
    // 更新本地缓存数据
    updateCachedData() {
      this.cachedMindMapTagMapping = TagCacheManager.getMindMapTagIds()
      
      // 恢复重要的store更新逻辑
      if (this.cachedMindMaps.length > 0) {
        const currentStoreMindMaps = this.localMindMaps || []
        // 简单比较，如果数量不同或者第一个元素不同，则更新
        if (currentStoreMindMaps.length !== this.cachedMindMaps.length ||
            (this.cachedMindMaps.length > 0 && currentStoreMindMaps[0]?.id !== this.cachedMindMaps[0]?.id)) {
          this.$store.commit('setLocalMindMaps', this.cachedMindMaps)
        }
      }
    },
    
    // 初始化页面数据
    async initPageData() {
      try {
        this.isLoading = true
        
        // 更新标签缓存数据
        this.updateCachedData()
        
        // 首先确保store中的数据已加载（如果需要）
        if (this.currentUser && this.localMindMaps.length === 0) {
          await this.$store.dispatch('getUserMindMaps', this.currentUser.id)
        }
        
        // 优先从缓存加载思维导图数据
        this.cachedMindMaps = this.loadMindMapsFromCache()
        
        if (this.cachedMindMaps.length > 0) {
        } else {
          // 如果缓存为空，则从数据库加载
          this.cachedMindMaps = await this.loadMindMapsFromDatabase()
          
          if (this.cachedMindMaps.length > 0) {
          } else {
          }
        }
        
        // 强制刷新数据以确保获取最新状态
        await this.$nextTick()
        
        // 确保标签映射数据已加载
        TagCacheManager.refreshCache()
        
        // 注释掉强制更新，让Vue的响应式系统自动处理
        // this.$forceUpdate()
        
        this.isLoading = false
      } catch (error) {
        console.error('初始化页面数据失败:', error)
        this.$message.error('加载数据失败，请刷新页面重试')
        this.isLoading = false
      }
    },
    
    // 返回编辑器
    backToEditor() {
      this.$bus.$emit('backToEditor')
    },
    
    // 全局搜索处理
    handleGlobalSearch() {
      // 搜索时重置标签选择
      if (this.globalSearchKeyword.trim()) {
        this.selectedTagIds = []
      }
    },
    
    // 标签选择处理
    handleTagSelect(tagIds) {
      // 防止重复调用：如果传入的tagIds和当前selectedTagIds相同，则不处理
      if (JSON.stringify(tagIds) === JSON.stringify(this.selectedTagIds)) {
        return
      }
      
      this.selectedTagIds = tagIds
      this.selectedMindmapIds = [] // 重置思维导图选择
    },
    
    // 思维导图选择处理
    handleMindmapSelect(mindmapIds) {
      this.selectedMindmapIds = mindmapIds
    },
    
    // 加载思维导图
    handleMindmapLoad(mindmapId) {
      this.$bus.$emit('loadMindMap', mindmapId)
      // 加载后返回编辑器
      this.backToEditor()
    },
    
    
    // 打开设置
    openSettings() {
      this.$message.info('设置功能开发中...')
    },
    
    // 标签管理操作
    handleTagCreate(tagData) {
      try {
        TagCacheManager.createTag(tagData)
        this.$message.success('创建标签成功')
        this.refreshData()
      } catch (error) {
        console.error('创建标签失败:', error)
        this.$message.error('创建标签失败')
      }
    },
    
    handleTagEdit(tagId, tagData) {
      try {
        TagCacheManager.updateTag(tagId, tagData)
        this.$message.success('更新标签成功')
        this.refreshData()
      } catch (error) {
        console.error('更新标签失败:', error)
        this.$message.error('更新标签失败')
      }
    },
    
    handleTagDelete(tagId) {
      try {
        TagCacheManager.deleteTag(tagId)
        this.$message.success('删除标签成功')
        this.refreshData()
      } catch (error) {
        console.error('删除标签失败:', error)
        this.$message.error('删除标签失败')
      }
    },
    
    // 思维导图操作
    handleMindmapDelete(mindmapIds) {
      this.$confirm('确定要删除选中的思维导图吗？此操作不可恢复。', '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 这里添加删除逻辑
        this.$message.success('删除成功')
        this.refreshData()
      }).catch(() => {
        this.$message.info('已取消删除')
      })
    },
    
    handleMindmapRename(mindmapId, newTitle) {
      try {
        // 这里添加重命名逻辑
        this.$message.success('重命名成功')
        this.refreshData()
      } catch (error) {
        console.error('重命名失败:', error)
        this.$message.error('重命名失败')
      }
    },
    
    handleMindmapTagUpdate(mindmapId, tagIds) {
      try {
        TagCacheManager.setMindMapTags(mindmapId, tagIds)
        this.$message.success('更新标签成功')
        this.refreshData()
      } catch (error) {
        console.error('更新标签失败:', error)
        this.$message.error('更新标签失败')
      }
    },
    
    // 处理拖拽添加标签
    async handleMindmapAddTag(data) {
      const { mindmapId, tagId, mindmapTitle, tagName } = data
      
      try {
        // 获取当前标签
        const currentTags = this.mindMapTagMapping[mindmapId] || []
        
        // 如果标签不存在，则添加
        if (!currentTags.includes(tagId)) {
          // 先更新本地缓存
          const newTags = [...currentTags, tagId]
          TagCacheManager.setMindMapTags(mindmapId, newTags)
          
          // 立即更新本地数据和UI
          this.updateLocalMindmapTagData(mindmapId, newTags)
          
          // 显示成功消息
          this.$message.success(`已为 "${mindmapTitle}" 添加标签 "${tagName}"`)
          
          // 强制刷新数据和UI
          this.forceRefreshData()
          
          // 异步保存到数据库
          if (this.currentUser) {
            try {
              await tagApi.addTagToMindMapOptimized(
                this.currentUser.id,
                mindmapId,
                tagId
              )
            } catch (dbError) {
              console.error('保存标签到数据库失败:', dbError)
              this.$message.error('标签保存到数据库失败')
              
              // 如果保存失败，回滚本地缓存
              TagCacheManager.setMindMapTags(mindmapId, currentTags)
              this.updateLocalMindmapTagData(mindmapId, currentTags)
              this.forceRefreshData()
            }
          }
        } else {
          this.$message.info(`"${mindmapTitle}" 已经包含标签 "${tagName}"`)
        }
      } catch (error) {
        console.error('添加标签失败:', error)
        this.$message.error('添加标签失败')
      }
    },
    
    // 批量操作处理
    handleBatchOperation(operation, mindmapIds, data) {
      switch (operation) {
        case 'delete':
          this.handleMindmapDelete(mindmapIds)
          break
        case 'addTags':
          this.batchAddTags(mindmapIds, data.tagIds)
          break
        case 'removeTags':
          this.batchRemoveTags(mindmapIds, data.tagIds)
          break
        default:
          this.$message.warning('未知的批量操作类型')
      }
    },
    
    // 批量添加标签
    batchAddTags(mindmapIds, tagIds) {
      try {
        mindmapIds.forEach(mindmapId => {
          const currentTags = this.mindMapTagMapping[mindmapId] || []
          const newTags = [...new Set([...currentTags, ...tagIds])]
          TagCacheManager.setMindMapTags(mindmapId, newTags)
        })
        this.$message.success('批量添加标签成功')
        this.refreshData()
      } catch (error) {
        console.error('批量添加标签失败:', error)
        this.$message.error('批量添加标签失败')
      }
    },
    
    // 批量移除标签
    batchRemoveTags(mindmapIds, tagIds) {
      try {
        mindmapIds.forEach(mindmapId => {
          const currentTags = this.mindMapTagMapping[mindmapId] || []
          const newTags = currentTags.filter(tagId => !tagIds.includes(tagId))
          TagCacheManager.setMindMapTags(mindmapId, newTags)
        })
        this.$message.success('批量移除标签成功')
        this.refreshData()
      } catch (error) {
        console.error('批量移除标签失败:', error)
        this.$message.error('批量移除标签失败')
      }
    },
    
    // 获取思维导图的标签名称
    getMindmapTagNames(mindmapId) {
      const tagIds = this.mindMapTagMapping[mindmapId] || []
      return tagIds.map(tagId => this.userTags[tagId]?.name || '').filter(Boolean)
    },
    
    // 刷新数据
    async refreshData() {
      // 更新标签缓存数据
      this.updateCachedData()
      
      // 重新加载思维导图数据（优先从缓存）
      const cachedMindMaps = this.loadMindMapsFromCache()
      
      if (cachedMindMaps.length > 0) {
        this.cachedMindMaps = cachedMindMaps
      } else {
        // 如果缓存为空，尝试从数据库刷新
        const dbMindMaps = await this.loadMindMapsFromDatabase()
        this.cachedMindMaps = dbMindMaps
      }
      
      this.$forceUpdate()
    },
    
    // 更新本地思维导图标签数据
    updateLocalMindmapTagData(mindmapId, tagIds) {
      // 恢复updateCachedData调用
      this.updateCachedData()
      
      // 直接更新computed依赖的数据源，触发响应式更新
      this.$nextTick(() => {
        // 注释掉强制更新，让Vue的响应式系统自动处理
        // this.$forceUpdate()
        
        // 通知所有子组件数据已更新
        this.$bus.$emit('mindmap-tag-data-updated', {
          mindmapId,
          tagIds
        })
      })
    },
    
    // 强制刷新数据和UI
    async forceRefreshData() {
      // 刷新标签缓存
      TagCacheManager.refreshCache()
      
      // 重新加载思维导图数据
      const cachedMindMaps = this.loadMindMapsFromCache()
      
      if (cachedMindMaps.length > 0) {
        this.cachedMindMaps = cachedMindMaps
      } else {
        // 如果缓存为空，尝试从数据库刷新
        const dbMindMaps = await this.loadMindMapsFromDatabase()
        this.cachedMindMaps = dbMindMaps
      }
      
      // 更新本地缓存数据
      this.updateCachedData()
      
      // 使用nextTick确保数据更新后再更新UI
      await this.$nextTick()
      
      // 注释掉强制更新，让Vue的响应式系统自动处理
      // this.$forceUpdate()
      
        // 通知子组件重新渲染
        this.$bus.$emit('force-refresh-mindmap-cards')
        this.$bus.$emit('force-refresh-tag-tree')
    }
  }
}
</script>

<style scoped>
.tagMindmapPage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  overflow: hidden;
}

/* 顶部导航栏 */
.page-header {
  height: 64px;
  padding: 0 24px;
  background: var(--bg-color-1);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  color: #606266;
  font-size: 14px;
  padding: 8px 12px;
  transition: all 0.2s ease;
}

.back-btn:hover {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-item {
  font-size: 14px;
  color: #909399;
}

.breadcrumb-item.active {
  color: #303133;
  font-weight: 600;
}

.breadcrumb-separator {
  color: var(--text-color-3);
  font-size: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-container {
  width: 300px;
}

.global-search {
  width: 100%;
}

.action-buttons .el-button {
  font-size: 14px;
}

/* 主要内容区域 */
.page-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.left-panel {
  width: 320px;
  flex-shrink: 0;
  background: var(--bg-color-1);
  border-right: 1px solid var(--border-color);
  overflow: hidden;
}

.right-panel {
  flex: 1;
  background: var(--bg-color);
  overflow: hidden;
}

/* 加载遮罩 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.isDark .loading-overlay {
  background: rgba(42, 42, 42, 0.8);
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.loading-text {
  font-size: 14px;
  color: var(--text-color-2);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 淡入淡出动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

/* 深色主题适配 */
.isDark .back-btn {
  color: #C0C4CC !important;
}

.isDark .back-btn:hover {
  color: #4A9EFF !important;
  background: rgba(74, 158, 255, 0.2) !important;
}

.isDark .breadcrumb-item {
  color: #A3A6AD !important; /* 增加对比度 */
}

.isDark .breadcrumb-item.active {
  color: #E4E7ED !important; /* 增加对比度 */
}

.isDark .page-header {
  background: #1E1E1E !important; /* 更深的背景色 */
  border-color: #4C4D4F !important;
}

.isDark .left-panel {
  background: #1E1E1E !important; /* 更深的背景色 */
  border-color: #4C4D4F !important;
}

/* 额外增强暗色模式对比度 */
.isDark .tagMindmapPage {
  background: #121212 !important; /* 深色背景 */
}

.isDark .right-panel {
  background: #121212 !important; /* 深色背景 */
}

/* 深色模式下其他元素 */
.isDark .loading-overlay {
  background: rgba(18, 18, 18, 0.8) !important;
}

.isDark .loading-text {
  color: #C0C4CC !important;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .left-panel {
    width: 280px;
  }
  
  .search-container {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 0 16px;
    height: 56px;
  }
  
  .header-left {
    gap: 12px;
  }
  
  .header-right {
    gap: 12px;
  }
  
  .search-container {
    width: 200px;
  }
  
  .left-panel {
    width: 240px;
  }
  
  .breadcrumb {
    display: none;
  }
}

@media (max-width: 480px) {
  .page-content {
    flex-direction: column;
  }
  
  .left-panel {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .search-container {
    width: 150px;
  }
  
  .action-buttons .el-button span {
    display: none;
  }
}
</style>