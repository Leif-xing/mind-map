<template>
  <Sidebar ref="sidebar" :title="$t('tagManager.title')">
    <div class="tagManagerContainer" :class="{ isDark: isDark }">

      
      <!-- 思维导图标签区域 -->
      <div class="section">
        <div class="sectionHeader">
          <h3 class="sectionTitle">
            <i class="el-icon-collection-tag"></i>
            当前标签
          </h3>
          <el-button 
            size="mini" 
            type="primary" 
            icon="el-icon-plus"
            @click="showAddTagDialog"
            :disabled="!currentMindMapId"
          >
            添加标签
          </el-button>
        </div>
        
        <div class="currentTagsArea" v-if="currentMindMapId">
          <div v-if="currentMindMapTags.length === 0" class="emptyState">
            <i class="el-icon-price-tag"></i>
            <p>暂无标签，点击上方按钮添加标签或双击下方标签快速添加</p>
          </div>
          <div v-else class="tagsList">
            <div 
              v-for="tag in currentMindMapTags" 
              :key="tag.id"
              class="tagChip"
              :style="{ backgroundColor: tag.color }"
            >
              <span class="tagText">{{ tag.name }}</span>
              <i 
                class="el-icon-close removeTag" 
                @click="removeTagFromMindMap(tag.id)"
                :title="'移除标签: ' + tag.name"
              ></i>
            </div>
          </div>
        </div>
        <div v-else class="emptyState">
          <i class="el-icon-document"></i>
          <p>请先选择或创建思维导图</p>
        </div>
      </div>

      <!-- 我的标签管理区域 -->
      <div class="section">
        <div class="sectionHeader">
          <div class="headerActions">
            <el-button 
              size="mini" 
              type="success" 
              icon="el-icon-plus"
              @click="showCreateTagDialog"
            >
              新建标签
            </el-button>
            <el-button 
              size="mini" 
              icon="el-icon-refresh"
              @click="refreshTags"
              :loading="loading"
            >
              刷新
            </el-button>
          </div>
        </div>

        <!-- 搜索框 -->
        <div class="searchBox">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索标签..."
            size="small"
            prefix-icon="el-icon-search"
            clearable
            @input="handleSearch"
          />
        </div>

        <!-- 标签列表 -->
        <div class="myTagsArea">
          <div v-if="filteredTags.length === 0 && !loading" class="emptyState">
            <i class="el-icon-price-tag"></i>
            <p>{{ searchKeyword ? '没有找到匹配的标签' : '暂无标签，点击上方按钮创建标签。创建后可双击标签快速添加到思维导图' }}</p>
          </div>
          <div v-else class="tagsList">
            <div 
              v-for="tag in filteredTags" 
              :key="tag.id"
              class="tagItem"
              :class="{ 
                'is-public': tag.is_public,
                'is-used': isTagUsedInCurrentMindMap(tag.id),
                'is-processing': isProcessing
              }"
              @dblclick="handleDoubleClickTag(tag)"
              :title="isProcessing ? '处理中...' : (isTagUsedInCurrentMindMap(tag.id) ? '双击移除标签' : '双击添加标签到当前思维导图')"
            >
              <div class="tagInfo">
                <div 
                  class="tagColor"
                  :style="{ backgroundColor: tag.color }"
                ></div>
                <span class="tagName">{{ tag.name }}</span>
                <div class="tagMeta">
                  <span v-if="tag.is_public" class="publicTag">公共</span>
                  <span v-else class="privateTag">私有</span>
                  <span class="usageCount">{{ tag.usageCount || 0 }}次使用</span>
                </div>
              </div>
              <div class="tagActions" v-if="tag.isOwned">
                <el-button 
                  size="mini" 
                  type="text" 
                  icon="el-icon-edit"
                  @click="editTag(tag)"
                  title="编辑标签"
                />
                <el-button 
                  size="mini" 
                  type="text" 
                  icon="el-icon-delete"
                  @click="deleteTag(tag)"
                  title="删除标签"
                  class="deleteBtn"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 批量操作区域 -->
      <div class="section" v-if="selectedTags.length > 0">
        <div class="sectionHeader">
          <h3 class="sectionTitle">
            <i class="el-icon-s-operation"></i>
            批量操作 ({{ selectedTags.length }} 个标签)
          </h3>
        </div>
        <div class="batchActions">
          <el-button 
            size="small" 
            type="primary"
            @click="batchAddToMindMap"
            :disabled="!currentMindMapId"
          >
            批量添加到当前思维导图
          </el-button>
          <el-button 
            size="small" 
            @click="clearSelection"
          >
            清空选择
          </el-button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑标签对话框 -->
    <TagCreateEditDialog
      :visible="showTagDialog"
      :tag="editingTag"
      @close="closeTagDialog"
      @success="handleTagSuccess"
    />

    <!-- 添加标签到思维导图对话框 -->
    <TagSelectionDialog
      :visible="showSelectionDialog"
      :available-tags="availableTags"
      :current-mind-map-tags="currentMindMapTags"
      @close="closeSelectionDialog"
      @success="handleAddTagsSuccess"
    />
  </Sidebar>
</template>

<script>
import Sidebar from './Sidebar.vue'
import TagCreateEditDialog from './TagCreateEditDialog.vue'
import TagSelectionDialog from './TagSelectionDialog.vue'

import { tagApi } from '@/api/supabase-api'
import TagCacheManager from '@/utils/tagCacheManager'
import { mapState } from 'vuex'

export default {
  name: 'MindMapTagManager',
  components: {
    Sidebar,
    TagCreateEditDialog,
    TagSelectionDialog,

  },
  data() {
    return {
      loading: false,
      isProcessing: false, // 防止重复操作
      searchKeyword: '',
      availableTags: [],
      currentMindMapTags: [],
      filteredTags: [],
      selectedTags: [],
      
      // 对话框控制
      showTagDialog: false,
      showSelectionDialog: false,
      editingTag: null,
      
      // 刷新定时器
      refreshTimer: null
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      currentUser: state => state.currentUser,
      currentMindMapId: state => state.currentMindMapId
    })
  },
  watch: {
    currentMindMapId: {
      handler(newId) {
        if (newId) {
          this.loadCurrentMindMapTags()
        } else {
          this.currentMindMapTags = []
        }
      },
      immediate: true
    }
  },
  created() {
    this.$bus.$on('showTagManager', this.show)
    this.loadAvailableTags()
  },
  mounted() {
    // 添加键盘事件监听
    document.addEventListener('keydown', this.handleKeyDown)
  },
  beforeDestroy() {
    this.$bus.$off('showTagManager', this.show)
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    // 移除键盘事件监听
    document.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    // 处理键盘快捷键
    handleKeyDown(event) {
      // 只有在标签管理器打开时才处理ESC键
      if (this.$refs.sidebar && this.$refs.sidebar.show && event.key === 'Escape') {
        event.preventDefault()
        this.hide() // 关闭标签管理器
      }
    },

    // 显示标签管理器
    show() {
      this.$refs.sidebar.show = true
      this.loadAvailableTags()
      if (this.currentMindMapId) {
        this.loadCurrentMindMapTags()
      }
    },

    // 隐藏标签管理器
    hide() {
      if (this.$refs.sidebar) {
        this.$refs.sidebar.show = false
      }
    },

    // 加载可用标签列表（需求2：缓存优化）
    async loadAvailableTags() {
      if (!this.currentUser) return
      
      try {
        this.loading = true
        
        // 先尝试从缓存获取
        const cachedTags = TagCacheManager.getUserTagsArray()
        if (cachedTags.length > 0) {
          this.availableTags = cachedTags
          this.handleSearch() // 更新筛选结果
          this.loading = false
          return
        }
        
        // 缓存未命中，从数据库获取
        const tags = await tagApi.getUserAvailableTags(this.currentUser.id)
        this.availableTags = tags
        
        // 保存到缓存
        const userTags = {}
        tags.forEach(tag => {
          const { id, ...tagData } = tag
          userTags[id] = tagData
        })
        TagCacheManager.setUserTags(userTags)
        
        this.handleSearch() // 更新筛选结果
      } catch (error) {
        this.$message.error('加载标签列表失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },

    // 加载当前思维导图的标签（需求1：缓存优化）
    async loadCurrentMindMapTags() {
      if (!this.currentUser || !this.currentMindMapId) return
      
      try {
        // 先尝试从缓存获取
        const cachedTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
        if (cachedTags.length > 0) {
          this.currentMindMapTags = cachedTags
          return
        }
        
        // 缓存未命中，从数据库获取
        const tags = await tagApi.getMindMapTags(
          this.currentUser.id, 
          this.currentMindMapId
        )
        this.currentMindMapTags = tags
        
        // 保存到缓存
        TagCacheManager.setMindMapTagsFromArray(this.currentMindMapId, tags)
      } catch (error) {
        this.$message.error('加载思维导图标签失败: ' + error.message)
      }
    },

    // 搜索处理
    handleSearch() {
      if (!this.searchKeyword.trim()) {
        this.filteredTags = [...this.availableTags]
      } else {
        const keyword = this.searchKeyword.toLowerCase()
        this.filteredTags = this.availableTags.filter(tag => 
          tag.name.toLowerCase().includes(keyword)
        )
      }
    },

    // 检查标签是否已用于当前思维导图
    isTagUsedInCurrentMindMap(tagId) {
      return this.currentMindMapTags.some(tag => tag.id === tagId)
    },

    // 双击标签处理（快速添加/移除标签）- 优化版本
    async handleDoubleClickTag(tag) {
      if (!this.currentMindMapId) {
        this.$message.warning('请先选择思维导图')
        return
      }

      // 防止重复点击
      if (this.isProcessing) {
        return
      }
      this.isProcessing = true

      try {
        const isUsed = this.isTagUsedInCurrentMindMap(tag.id)
        
        if (isUsed) {
          // 立即更新UI（乐观更新）
          TagCacheManager.removeTagFromMindMap(this.currentMindMapId, tag.id)
          this.currentMindMapTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
          this.$message.success(`标签 "${tag.name}" 移除成功`)
          
          // 后台异步同步到数据库
          tagApi.removeTagFromMindMapOptimized(
            this.currentUser.id,
            this.currentMindMapId,
            tag.id
          ).catch(error => {
            // 如果后台同步失败，回滚UI更改
            TagCacheManager.addTagToMindMap(this.currentMindMapId, tag.id)
            this.currentMindMapTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
            this.$message.error('移除失败: ' + error.message)
          })
        } else {
          // 立即更新UI（乐观更新）
          TagCacheManager.addTagToMindMap(this.currentMindMapId, tag.id)
          this.currentMindMapTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
          this.$message.success(`标签 "${tag.name}" 添加成功`)
          
          // 后台异步同步到数据库
          tagApi.addTagToMindMapOptimized(
            this.currentUser.id,
            this.currentMindMapId,
            tag.id
          ).catch(error => {
            // 如果后台同步失败，回滚UI更改
            TagCacheManager.removeTagFromMindMap(this.currentMindMapId, tag.id)
            this.currentMindMapTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
            this.$message.error('添加失败: ' + error.message)
          })
        }
      } catch (error) {
        this.$message.error('操作失败: ' + error.message)
      } finally {
        this.isProcessing = false
      }
    },

    // 切换标签状态（添加/移除）（需求7：缓存同步）
    async toggleTagForMindMap(tag) {
      if (!this.currentMindMapId) {
        this.$message.warning('请先选择思维导图')
        return
      }

      try {
        const isUsed = this.isTagUsedInCurrentMindMap(tag.id)
        
        if (isUsed) {
          await this.removeTagFromMindMap(tag.id)
        } else {
          await tagApi.addTagToMindMap(
            this.currentUser.id,
            this.currentMindMapId,
            tag.id
          )
          
          // 同步更新缓存
          TagCacheManager.addTagToMindMap(this.currentMindMapId, tag.id)
          
          // 更新本地显示
          this.currentMindMapTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
          
          this.$message.success(`标签 "${tag.name}" 添加成功`)
        }
      } catch (error) {
        this.$message.error('操作失败: ' + error.message)
      }
    },

    // 从思维导图移除标签（需求7：缓存同步）
    async removeTagFromMindMap(tagId) {
      if (!this.currentMindMapId) return

      try {
        await this.$confirm('确定要移除这个标签吗？', '确认操作', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        await tagApi.removeTagFromMindMap(
          this.currentUser.id,
          this.currentMindMapId,
          tagId
        )
        
        // 同步更新缓存
        TagCacheManager.removeTagFromMindMap(this.currentMindMapId, tagId)
        
        // 更新本地显示
        this.currentMindMapTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
        
        const tag = this.availableTags.find(t => t.id === tagId)
        this.$message.success(`标签 "${tag?.name || ''}" 移除成功`)
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('移除标签失败: ' + error.message)
        }
      }
    },

    // 显示创建标签对话框
    showCreateTagDialog() {
      this.editingTag = null
      this.showTagDialog = true
    },

    // 显示添加标签对话框
    showAddTagDialog() {
      this.showSelectionDialog = true
    },

    // 编辑标签
    editTag(tag) {
      this.editingTag = { ...tag }
      this.showTagDialog = true
    },

    // 删除标签（需求6：缓存同步）
    async deleteTag(tag) {
      try {
        await this.$confirm(
          `确定要删除标签 "${tag.name}" 吗？删除后无法恢复。`,
          '确认删除',
          {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        await tagApi.deleteTag(this.currentUser.id, tag.id)
        
        // 同步更新缓存（自动清理所有映射关系）
        TagCacheManager.deleteTag(tag.id)
        
        // 更新本地显示
        this.availableTags = TagCacheManager.getUserTagsArray()
        this.currentMindMapTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
        this.handleSearch() // 更新筛选结果
        
        this.$message.success('标签删除成功')
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除标签失败: ' + error.message)
        }
      }
    },

    // 关闭标签对话框
    closeTagDialog() {
      this.showTagDialog = false
      this.editingTag = null
    },

    // 关闭选择对话框
    closeSelectionDialog() {
      this.showSelectionDialog = false
    },

    // 标签创建/编辑成功（需求3和5：缓存同步）
    handleTagSuccess(tagData) {
      this.closeTagDialog()
      
      if (tagData) {
        if (this.editingTag) {
          // 编辑标签 - 更新缓存中的标签信息
          TagCacheManager.updateUserTag(tagData.id, {
            name: tagData.name,
            color: tagData.color,
            is_public: tagData.is_public
          })
        } else {
          // 创建标签 - 添加到缓存
          TagCacheManager.addUserTag(tagData)
        }
        
        // 更新本地显示
        this.availableTags = TagCacheManager.getUserTagsArray()
        this.handleSearch() // 更新筛选结果
      } else {
        // 如果没有返回标签数据，重新加载
        this.loadAvailableTags()
      }
    },

    // 添加标签成功（需求7：缓存同步）
    handleAddTagsSuccess(addedTagIds) {
      this.closeSelectionDialog()
      
      if (addedTagIds && addedTagIds.length > 0) {
        // 更新缓存中的映射关系
        addedTagIds.forEach(tagId => {
          TagCacheManager.addTagToMindMap(this.currentMindMapId, tagId)
        })
        
        // 更新本地显示
        this.currentMindMapTags = TagCacheManager.getMindMapTags(this.currentMindMapId)
      } else {
        // 如果没有返回添加的标签ID，重新加载
        this.loadCurrentMindMapTags()
      }
    },

    // 批量添加到思维导图
    async batchAddToMindMap() {
      if (!this.currentMindMapId || this.selectedTags.length === 0) return

      try {
        await tagApi.addTagsToMindMap(
          this.currentUser.id,
          this.currentMindMapId,
          this.selectedTags
        )
        this.$message.success(`成功添加 ${this.selectedTags.length} 个标签`)
        this.selectedTags = []
        this.loadCurrentMindMapTags()
      } catch (error) {
        this.$message.error('批量添加失败: ' + error.message)
      }
    },

    // 清空选择
    clearSelection() {
      this.selectedTags = []
    },

    // 刷新标签（需求4：只刷新用户标签）
    async refreshTags() {
      // 清除用户标签缓存
      TagCacheManager.clearUserTagsCache()
      
      // 重新加载用户标签（会从数据库获取并更新缓存）
      await this.loadAvailableTags()
      
      // 思维导图标签不需要刷新，映射关系保持不变
      this.$message.success('刷新完成')
    },


  }
}
</script>

<style lang="less" scoped>
.tagManagerContainer {
  padding: 20px;
  height: 100%;
  overflow-y: auto;

  &.isDark {
    color: #f56c6c;

    .section {
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    .sectionTitle {
      color: #fff;
    }

    .emptyState {
      color: #999;
    }

    .tagItem {
      background-color: #363a3f;
      border-color: hsla(0, 0%, 100%, 0.1);

      &:hover {
        background-color: #404449;
      }
    }

    .tagChip {
      color: #fff;
    }
  }

  .section {
    margin-bottom: 30px;
    border-bottom: 1px solid #e8e8e8;
    padding-bottom: 20px;

    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
  }

  .sectionHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    .sectionTitle {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;

      i {
        color: #409eff;
      }
    }

    .headerActions {
      display: flex;
      gap: 10px;
    }
  }

  .searchBox {
    margin-bottom: 15px;
  }

  .currentTagsArea,
  .myTagsArea {
    min-height: 60px;
  }

  .emptyState {
    text-align: center;
    padding: 40px 20px;
    color: #999;

    i {
      font-size: 48px;
      margin-bottom: 15px;
      display: block;
    }

    p {
      font-size: 14px;
      margin: 0;
    }
  }

  .tagsList {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .tagChip {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 12px;
    color: #fff;
    position: relative;

    .tagText {
      margin-right: 6px;
    }

    .removeTag {
      cursor: pointer;
      font-size: 12px;
      opacity: 0.8;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }
  }

  .tagItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    background-color: #fff;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    margin-bottom: 8px;
    user-select: none;

    &:hover {
      background-color: #f5f7fa;
      border-color: #409eff;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(64, 158, 255, 0.15);
    }

    &:active {
      transform: translateY(0);
      box-shadow: 0 1px 3px rgba(64, 158, 255, 0.1);
    }

    &.is-used {
      background-color: #ecf5ff;
      border-color: #409eff;
    }

    &.is-processing {
      opacity: 0.6;
      cursor: wait;
      pointer-events: none;
      
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        right: 12px;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        border: 2px solid #409eff;
        border-top-color: transparent;
        border-radius: 50%;
        animation: loading-spin 1s linear infinite;
      }
    }

    .tagInfo {
      display: flex;
      align-items: center;
      flex: 1;
      gap: 12px;
    }

    .tagColor {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .tagName {
      font-weight: 500;
      flex: 1;
    }

    .tagMeta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #999;
    }

    .publicTag {
      color: #67c23a;
    }

    .privateTag {
      color: #909399;
    }

    .tagActions {
      display: flex;
      gap: 5px;
      opacity: 0;
      transition: opacity 0.2s;

      .deleteBtn {
        color: #f56c6c;

        &:hover {
          color: #f56c6c;
          background-color: #fef0f0;
        }
      }
    }

    &:hover .tagActions {
      opacity: 1;
    }
  }

  .batchActions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}

@keyframes loading-spin {
  0% {
    transform: translateY(-50%) rotate(0deg);
  }
  100% {
    transform: translateY(-50%) rotate(360deg);
  }
}
</style>