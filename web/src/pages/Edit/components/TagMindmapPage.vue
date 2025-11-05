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
            type="primary" 
            icon="el-icon-plus"
            @click="createNewMindmap"
          >
            新建导图
          </el-button>
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
      
      // 刷新定时器
      refreshTimer: null
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
      return TagCacheManager.getMindMapTagIds()
    },
    
    // 筛选后的思维导图
    filteredMindMaps() {
      // 确保数据存在
      if (!this.localMindMaps || !Array.isArray(this.localMindMaps)) {
        return []
      }
      
      let filtered = [...this.localMindMaps]
      
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
      
      // 标签筛选
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
    // 监听思维导图数据变化
    localMindMaps: {
      handler(newVal, oldVal) {
        // 确保数据变化时重新渲染
        this.$nextTick(() => {
          this.$forceUpdate()
        })
      },
      immediate: true,
      deep: true
    },
    
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
    
    // 开始数据刷新定时器
    this.startRefreshTimer()
  },
  mounted() {
    // 页面加载完成
    setTimeout(() => {
      this.pageLoading = false
    }, 500)
    
    // 发送页面切换事件
    this.$bus.$emit('pageChanged', 'mindmap-manager')
  },
  beforeDestroy() {
    this.$bus.$off('refreshMindmapData', this.refreshData)
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
  },
  methods: {
    // 初始化页面数据
    async initPageData() {
      try {
        this.isLoading = true
        
        // 强制刷新数据以确保获取最新状态
        await this.$nextTick()
        
        // 确保标签映射数据已加载
        TagCacheManager.refreshCache()
        
        // 强制更新组件以重新计算 computed
        this.$forceUpdate()
        
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
    
    // 创建新思维导图
    createNewMindmap() {
      this.$bus.$emit('createNewMindmap')
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
    refreshData() {
      this.$forceUpdate()
    },
    
    // 开始定时刷新
    startRefreshTimer() {
      this.refreshTimer = setInterval(() => {
        this.refreshData()
      }, 30000) // 30秒刷新一次
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