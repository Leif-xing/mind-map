<template>
  <div class="tagTreePanel" :class="{ isDark: isDark }">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <i class="iconfont iconbiaoqian"></i>
        <span>标签分类</span>
      </div>
      <div class="header-actions">
        <el-button 
          type="text" 
          icon="el-icon-plus" 
          size="mini"
          @click="showCreateTagDialog"
          title="新建标签"
        ></el-button>
        <el-button 
          type="text" 
          icon="el-icon-refresh" 
          size="mini"
          @click="refreshTags"
          title="刷新"
        ></el-button>
      </div>
    </div>

    <!-- 标签统计 -->
    <div class="tag-stats">
      <div class="stat-item">
        <span class="stat-number">{{ Object.keys(userTags).length }}</span>
        <span class="stat-label">标签</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ taggedMindmapsCount }}</span>
        <span class="stat-label">已分类</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ untaggedMindmapsCount }}</span>
        <span class="stat-label">未分类</span>
      </div>
    </div>

    <!-- 快速筛选 -->
    <div class="quick-filters">
      <div class="filter-title">快速筛选</div>
      <div class="filter-buttons">
        <el-button
          size="mini"
          :type="selectedTagIds.length === 0 ? 'primary' : 'default'"
          @click="selectAllTags"
        >
          全部
        </el-button>
        <el-button
          size="mini"
          :type="showOnlyUntagged ? 'primary' : 'default'"
          @click="toggleUntaggedFilter"
        >
          未分类
        </el-button>
        <el-button
          size="mini"
          @click="clearSelection"
          v-if="selectedTagIds.length > 0"
        >
          清除选择
        </el-button>
      </div>
    </div>

    <!-- 标签树 -->
    <div class="tag-tree-container">
      <div class="tree-content">
        <!-- 所有标签节点 -->
        <div 
          v-for="(tag, tagId) in userTags" 
          :key="tagId"
          class="tag-node"
          :class="{ 
            selected: selectedTagIds.includes(tagId),
            'has-mindmaps': getTagMindmapCount(tagId) > 0,
            'drag-over': dragOverTagId === tagId
          }"
          @click="toggleTagSelection(tagId)"
          @contextmenu.prevent="showTagContextMenu($event, tagId, tag)"
          @dragover.prevent="handleDragOver($event, tagId)"
          @dragenter.prevent="handleDragEnter($event, tagId)"
          @dragleave="handleDragLeave($event, tagId)"
          @drop.prevent="handleDrop($event, tagId)"
        >
          <!-- 标签颜色指示器 -->
          <div 
            class="tag-color-indicator"
            :style="{ backgroundColor: tag.color || '#409EFF' }"
          ></div>
          
          <!-- 标签信息 -->
          <div class="tag-info">
            <div class="tag-name">{{ tag.name }}</div>
            <div class="tag-count">{{ getTagMindmapCount(tagId) }} 个导图</div>
          </div>
          
          <!-- 标签操作 -->
          <div class="tag-actions" @click.stop>
            <el-dropdown 
              trigger="click"
              @command="handleTagAction"
            >
              <el-button type="text" size="mini">
                <i class="el-icon-more"></i>
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item :command="{ action: 'edit', tagId }">
                  <i class="el-icon-edit"></i> 编辑
                </el-dropdown-item>
                <el-dropdown-item :command="{ action: 'duplicate', tagId }">
                  <i class="el-icon-copy-document"></i> 复制
                </el-dropdown-item>
                <el-dropdown-item 
                  :command="{ action: 'delete', tagId }"
                  divided
                >
                  <i class="el-icon-delete"></i> 删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </div>

        <!-- 未分类节点 -->
        <div 
          class="tag-node untagged-node"
          :class="{ selected: showOnlyUntagged }"
          @click="toggleUntaggedFilter"
        >
          <div class="tag-color-indicator untagged-color"></div>
          <div class="tag-info">
            <div class="tag-name">未分类</div>
            <div class="tag-count">{{ untaggedMindmapsCount }} 个导图</div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="Object.keys(userTags).length === 0" class="empty-state">
          <div class="empty-icon">
            <i class="iconfont iconbiaoqian"></i>
          </div>
          <div class="empty-text">暂无标签</div>
          <el-button type="primary" size="mini" @click="showCreateTagDialog">
            创建第一个标签
          </el-button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑标签对话框 -->
    <el-dialog
      :title="tagDialogMode === 'create' ? '创建标签' : '编辑标签'"
      :visible.sync="tagDialogVisible"
      width="400px"
      :close-on-press-escape="true"
    >
      <el-form :model="tagForm" :rules="tagFormRules" ref="tagForm" label-width="80px">
        <el-form-item label="标签名称" prop="name">
          <el-input 
            v-model="tagForm.name" 
            placeholder="请输入标签名称"
            maxlength="20"
            show-word-limit
          ></el-input>
        </el-form-item>
        <el-form-item label="标签颜色" prop="color">
          <div class="color-picker-container">
            <el-color-picker 
              v-model="tagForm.color"
              :predefine="predefineColors"
              show-alpha
            ></el-color-picker>
            <span class="color-preview" :style="{ backgroundColor: tagForm.color }"></span>
          </div>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="tagForm.description" 
            type="textarea"
            placeholder="请输入标签描述（可选）"
            maxlength="100"
            show-word-limit
            :rows="3"
          ></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmTagAction">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'TagTreePanel',
  props: {
    userTags: {
      type: Object,
      default: () => ({})
    },
    selectedTagIds: {
      type: Array,
      default: () => []
    },
    mindmapTagMapping: {
      type: Object,
      default: () => ({})
    },
    localMindmaps: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      showOnlyUntagged: false,
      
      // 拖拽相关
      dragOverTagId: null,
      isDragActive: false,
      
      // 标签对话框
      tagDialogVisible: false,
      tagDialogMode: 'create', // 'create' | 'edit'
      editingTagId: null,
      tagForm: {
        name: '',
        color: '#409EFF',
        description: ''
      },
      tagFormRules: {
        name: [
          { required: true, message: '请输入标签名称', trigger: 'blur' },
          { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
        ],
        color: [
          { required: true, message: '请选择标签颜色', trigger: 'change' }
        ]
      },
      
      // 预定义颜色
      predefineColors: [
        '#409EFF',
        '#67C23A',
        '#E6A23C',
        '#F56C6C',
        '#909399',
        '#00D084',
        '#13C2C2',
        '#722ED1',
        '#EB2F96',
        '#FA541C'
      ]
    }
  },
  computed: {
    isDark() {
      return this.$store?.state?.localConfig?.isDark || false
    },
    
    // 已分类的思维导图数量
    taggedMindmapsCount() {
      return this.localMindmaps.filter(mindmap => {
        const tags = this.mindmapTagMapping[mindmap.id] || []
        return tags.length > 0
      }).length
    },
    
    // 未分类的思维导图数量
    untaggedMindmapsCount() {
      return this.localMindmaps.filter(mindmap => {
        const tags = this.mindmapTagMapping[mindmap.id] || []
        return tags.length === 0
      }).length
    }
  },
  watch: {
    selectedTagIds: {
      handler() {
        this.emitTagSelection()
      },
      immediate: true
    },
    
    showOnlyUntagged() {
      this.emitTagSelection()
    }
  },
  
  created() {
    // 监听数据更新事件
    this.$bus.$on('mindmap-tag-data-updated', this.handleTagDataUpdated)
    this.$bus.$on('force-refresh-tag-tree', this.forceRefreshTagTree)
  },
  
  beforeDestroy() {
    // 清理事件监听器
    this.$bus.$off('mindmap-tag-data-updated', this.handleTagDataUpdated)
    this.$bus.$off('force-refresh-tag-tree', this.forceRefreshTagTree)
  },
  
  methods: {
    // 获取标签下的思维导图数量
    getTagMindmapCount(tagId) {
      return this.localMindmaps.filter(mindmap => {
        const tags = this.mindmapTagMapping[mindmap.id] || []
        return tags.includes(tagId)
      }).length
    },
    
    // 切换标签选择
    toggleTagSelection(tagId) {
      this.showOnlyUntagged = false
      
      const selectedIds = [...this.selectedTagIds]
      const index = selectedIds.indexOf(tagId)
      
      if (index > -1) {
        selectedIds.splice(index, 1)
      } else {
        selectedIds.push(tagId)
      }
      
      this.$emit('tag-select', selectedIds)
    },
    
    // 拖拽进入处理
    handleDragEnter(event, tagId) {
      this.dragOverTagId = tagId
      this.isDragActive = true
    },
    
    // 拖拽悬停处理
    handleDragOver(event, tagId) {
      event.dataTransfer.dropEffect = 'copy'
      this.dragOverTagId = tagId
    },
    
    // 拖拽离开处理
    handleDragLeave(event, tagId) {
      // 使用延迟来避免子元素触发的dragLeave
      setTimeout(() => {
        // 确保event和currentTarget存在再调用contains方法
        if (event && event.currentTarget && 
            (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget))) {
          this.dragOverTagId = null
        }
      }, 50)
    },
    
    // 拖拽放置处理
    handleDrop(event, tagId) {
      this.dragOverTagId = null
      this.isDragActive = false
      
      try {
        const dragData = JSON.parse(event.dataTransfer.getData('text/plain'))
        
        if (dragData.type === 'mindmap') {
          this.addTagToMindmap(dragData.mindmapId, tagId, dragData.mindmapTitle)
        }
      } catch (error) {
        console.error('解析拖拽数据失败:', error)
        this.$message.error('拖拽操作失败')
      }
    },
    
    // 为思维导图添加标签
    addTagToMindmap(mindmapId, tagId, mindmapTitle) {
      const tagName = this.userTags[tagId]?.name || '未知标签'
      
      // 检查是否已经有这个标签
      const currentTags = this.mindmapTagMapping[mindmapId] || []
      if (currentTags.includes(tagId)) {
        this.$message.info(`"${mindmapTitle}" 已经包含标签 "${tagName}"`)
        return
      }
      
      // 触发添加标签事件
      this.$emit('mindmap-add-tag', {
        mindmapId,
        tagId,
        mindmapTitle,
        tagName
      })
      
      // 注意：成功消息现在在TagMindmapPage中显示，避免重复提示
    },
    
    // 处理标签数据更新
    handleTagDataUpdated(data) {
      // 强制更新标签统计
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },
    
    // 强制刷新标签树
    forceRefreshTagTree() {
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },
    
    // 选择所有标签
    selectAllTags() {
      this.showOnlyUntagged = false
      this.$emit('tag-select', [])
    },
    
    // 切换未分类筛选
    toggleUntaggedFilter() {
      this.showOnlyUntagged = !this.showOnlyUntagged
      if (this.showOnlyUntagged) {
        this.$emit('tag-select', [])
      }
    },
    
    // 清除选择
    clearSelection() {
      this.showOnlyUntagged = false
      this.$emit('tag-select', [])
    },
    
    // 发送标签选择事件
    emitTagSelection() {
      if (this.showOnlyUntagged) {
        this.$emit('tag-select', ['__untagged__'])
      } else {
        this.$emit('tag-select', this.selectedTagIds)
      }
    },
    
    // 显示创建标签对话框
    showCreateTagDialog() {
      this.tagDialogMode = 'create'
      this.editingTagId = null
      this.tagForm = {
        name: '',
        color: '#409EFF',
        description: ''
      }
      this.tagDialogVisible = true
      
      this.$nextTick(() => {
        this.$refs.tagForm?.clearValidate()
      })
    },
    
    // 显示编辑标签对话框
    showEditTagDialog(tagId, tag) {
      this.tagDialogMode = 'edit'
      this.editingTagId = tagId
      this.tagForm = {
        name: tag.name,
        color: tag.color || '#409EFF',
        description: tag.description || ''
      }
      this.tagDialogVisible = true
      
      this.$nextTick(() => {
        this.$refs.tagForm?.clearValidate()
      })
    },
    
    // 确认标签操作
    confirmTagAction() {
      this.$refs.tagForm.validate((valid) => {
        if (valid) {
          if (this.tagDialogMode === 'create') {
            this.$emit('tag-create', { ...this.tagForm })
          } else {
            this.$emit('tag-edit', this.editingTagId, { ...this.tagForm })
          }
          this.tagDialogVisible = false
        }
      })
    },
    
    // 处理标签操作
    handleTagAction(command) {
      const { action, tagId } = command
      const tag = this.userTags[tagId]
      
      switch (action) {
        case 'edit':
          this.showEditTagDialog(tagId, tag)
          break
        case 'duplicate':
          this.duplicateTag(tagId, tag)
          break
        case 'delete':
          this.deleteTag(tagId, tag)
          break
      }
    },
    
    // 复制标签
    duplicateTag(tagId, tag) {
      this.tagDialogMode = 'create'
      this.editingTagId = null
      this.tagForm = {
        name: tag.name + ' 副本',
        color: tag.color || '#409EFF',
        description: tag.description || ''
      }
      this.tagDialogVisible = true
    },
    
    // 删除标签
    deleteTag(tagId, tag) {
      const mindmapCount = this.getTagMindmapCount(tagId)
      const message = mindmapCount > 0 
        ? `确定要删除标签"${tag.name}"吗？这将影响 ${mindmapCount} 个思维导图。`
        : `确定要删除标签"${tag.name}"吗？`
      
      this.$confirm(message, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$emit('tag-delete', tagId)
      }).catch(() => {
        this.$message.info('已取消删除')
      })
    },
    
    // 显示标签右键菜单
    showTagContextMenu(event, tagId, tag) {
      // 这里可以实现自定义右键菜单
      // 暂时使用下拉菜单替代
    },
    
    // 刷新标签
    refreshTags() {
      this.$emit('refresh-tags')
      this.$message.success('已刷新标签数据')
    }
  }
}
</script>

<style scoped>
.tagTreePanel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color-1);
}

/* 面板头部 */
.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.header-title i {
  font-size: 18px;
  color: var(--primary-color);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions .el-button {
  color: var(--text-color-2);
}

.header-actions .el-button:hover {
  color: var(--primary-color);
}

/* 标签统计 */
.tag-stats {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 16px;
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-number {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: var(--primary-color);
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--text-color-2);
  margin-top: 4px;
}

/* 快速筛选 */
.quick-filters {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.filter-title {
  font-size: 13px;
  color: var(--text-color-2);
  margin-bottom: 8px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 标签树容器 */
.tag-tree-container {
  flex: 1;
  overflow: hidden;
}

.tree-content {
  height: 100%;
  overflow-y: auto;
  padding: 8px 0;
}

/* 标签节点 */
.tag-node {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.tag-node:hover {
  background: var(--bg-color-2);
}

.tag-node.selected {
  background: var(--primary-color-light);
  border-left-color: var(--primary-color);
}

.tag-node.has-mindmaps {
  font-weight: 500;
}

.tag-node.drag-over {
  background: rgba(103, 194, 58, 0.1);
  border-left-color: #67C23A;
  border-style: solid;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
}

.tag-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.untagged-color {
  background: var(--text-color-3);
}

.tag-info {
  flex: 1;
  min-width: 0;
}

.tag-name {
  font-size: 14px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-count {
  font-size: 12px;
  color: var(--text-color-2);
  margin-top: 2px;
}

.tag-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tag-node:hover .tag-actions {
  opacity: 1;
}

.untagged-node {
  font-style: italic;
}

/* 空状态 */
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-color-2);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  margin-bottom: 16px;
}

/* 对话框样式 */
.color-picker-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

/* 深色主题适配 */
.isDark .tag-stats {
  border-color: #404040 !important;
}

.isDark .quick-filters {
  border-color: #404040 !important;
}

.isDark .panel-header {
  border-color: #404040 !important;
  background: #1E1E1E !important; /* 使用更深的背景色 */
}

.isDark .tag-node {
  color: #E4E7ED !important; /* 文字颜色更亮 */
  background: #252525 !important; /* 添加节点背景色 */
  border-left: 3px solid transparent !important;
}

.isDark .tag-node:hover {
  background: #2D2D2D !important; /* 更清晰的悬停背景 */
  color: #FFFFFF !important;
}

.isDark .tag-node.selected {
  background: #2A2A2A !important; /* 深色选中背景 */
  color: #FFFFFF !important;
  border-left-color: #4A9EFF !important; /* 选中状态的高亮条 */
}

.isDark .tag-name {
  color: #E4E7ED !important; /* 增强标签名称对比度 */
}

.isDark .tag-count {
  color: #A3A6AD !important; /* 增强标签计数对比度 */
}

.isDark .empty-state {
  color: #909399 !important;
}

.isDark .empty-text {
  color: #909399 !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .panel-header {
    padding: 12px 16px;
  }
  
  .tag-stats {
    padding: 12px 16px;
  }
  
  .quick-filters {
    padding: 12px 16px;
  }
  
  .tag-node {
    padding: 10px 16px;
  }
  
  .stat-number {
    font-size: 18px;
  }
}
</style>