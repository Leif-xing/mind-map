<template>
  <div class="mindmapCards" :class="{ isDark: isDark }">
    <!-- 工具栏 -->
    <div class="cards-toolbar">
      <div class="toolbar-left">
        <div class="result-info">
          <span class="result-count">{{ filteredMindmaps.length }} 个思维导图</span>
          <span v-if="selectedMindmapIds.length > 0" class="selected-info">
            (已选择 {{ selectedMindmapIds.length }} 个)
          </span>
        </div>
      </div>
      
      <div class="toolbar-right">
        <!-- 批量操作 -->
        <div v-if="selectedMindmapIds.length > 0" class="batch-actions">
          <el-dropdown @command="handleBatchCommand" trigger="click">
            <el-button size="small" type="primary">
              批量操作 <i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="addTags">
                <i class="el-icon-price-tag"></i> 添加标签
              </el-dropdown-item>
              <el-dropdown-item command="removeTags">
                <i class="el-icon-remove-outline"></i> 移除标签
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <i class="el-icon-delete"></i> 删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        
        
        <!-- 排序 -->
        <el-dropdown @command="handleSortCommand" trigger="click">
          <el-button size="small">
            排序 <i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item :command="{ field: 'updated_at', order: 'desc' }">
              <i class="el-icon-time"></i> 最近更新
            </el-dropdown-item>
            <el-dropdown-item :command="{ field: 'created_at', order: 'desc' }">
              <i class="el-icon-plus"></i> 最近创建
            </el-dropdown-item>
            <el-dropdown-item :command="{ field: 'title', order: 'asc' }">
              <i class="el-icon-sort-up"></i> 名称升序
            </el-dropdown-item>
            <el-dropdown-item :command="{ field: 'title', order: 'desc' }">
              <i class="el-icon-sort-down"></i> 名称降序
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>

    <!-- 卡片容器 -->
    <div class="cards-container">
      <div 
        class="cards-content"
        v-loading="loading"
        element-loading-text="加载中..."
        element-loading-spinner="el-icon-loading"
      >
        <!-- 思维导图卡片 -->
        <div
          v-for="mindmap in sortedMindmaps"
          :key="mindmap.id"
          class="mindmap-card"
          :class="{ 
            selected: selectedMindmapIds.includes(mindmap.id),
            'drag-active': dragActive && dragMindmapId === mindmap.id
          }"
          draggable="true"
          @click="handleCardClick($event, mindmap)"
          @dblclick="handleMindmapDoubleClick($event, mindmap)"
          @contextmenu.prevent="showContextMenu($event, mindmap)"
          @dragstart="handleDragStart($event, mindmap)"
          @dragend="handleDragEnd($event)"
        >
          <!-- 卡片内容 -->
          <div class="card-content">
            <!-- 标题 (显示在左上方) -->
            <div class="card-title" :title="getMindmapTitle(mindmap)">
              {{ getMindmapTitle(mindmap) }}
            </div>
            
            <!-- 标签 -->
            <div class="card-tags" v-if="getMindmapTags(mindmap.id).length > 0">
              <el-tag
                v-for="tag in getMindmapTags(mindmap.id).slice(0, 3)"
                :key="tag.id"
                size="mini"
                :style="{ 
                  backgroundColor: tag.color, 
                  borderColor: tag.color,
                  color: getContrastColor(tag.color)
                }"
              >
                {{ tag.name }}
              </el-tag>
              <el-tag 
                v-if="getMindmapTags(mindmap.id).length > 3"
                size="mini"
                type="info"
              >
                +{{ getMindmapTags(mindmap.id).length - 3 }}
              </el-tag>
            </div>

            <!-- 元信息 -->
            <div class="card-meta">
              <div class="meta-item">
                <i class="el-icon-time"></i>
                <span>{{ formatDate(mindmap.updated_at) }}</span>
              </div>
              <div class="meta-item">
                <i class="el-icon-document"></i>
                <span>创建于 {{ formatDate(mindmap.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="sortedMindmaps.length === 0 && !loading" class="empty-state">
          <div class="empty-icon">
            <i class="iconfont iconwenjian"></i>
          </div>
          <div class="empty-text">
            <div v-if="searchKeyword">没有找到匹配的思维导图</div>
            <div v-else>暂无思维导图</div>
          </div>
          <el-button 
            v-if="!searchKeyword" 
            type="primary" 
            @click="createNewMindmap"
          >
            创建第一个思维导图
          </el-button>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <el-dialog
      title="重命名思维导图"
      :visible.sync="renameDialogVisible"
      width="400px"
      :close-on-press-escape="true"
    >
      <el-input
        v-model="newTitle"
        placeholder="请输入新标题"
        maxlength="50"
        show-word-limit
        @keyup.enter.native="confirmRename"
        ref="titleInput"
      ></el-input>
      <div slot="footer" class="dialog-footer">
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确定</el-button>
      </div>
    </el-dialog>

    <!-- 标签管理对话框 -->
    <el-dialog
      title="管理标签"
      :visible.sync="tagDialogVisible"
      width="500px"
      :close-on-press-escape="true"
    >
      <div class="tag-management">
        <div class="available-tags">
          <div class="section-title">可用标签</div>
          <div class="tag-list">
            <el-tag
              v-for="(tag, tagId) in userTags"
              :key="tagId"
              :type="currentMindmapTags.includes(tagId) ? 'primary' : 'info'"
              :effect="currentMindmapTags.includes(tagId) ? 'dark' : 'plain'"
              @click="toggleMindmapTag(tagId)"
              class="clickable-tag"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmTagUpdate">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'MindmapCards',
  props: {
    mindmaps: {
      type: Array,
      default: () => []
    },
    userTags: {
      type: Object,
      default: () => ({})
    },
    mindmapTagMapping: {
      type: Object,
      default: () => ({})
    },
    selectedMindmapIds: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    searchKeyword: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      sortField: 'updated_at',
      sortOrder: 'desc',
      
      // 拖拽相关
      dragActive: false,
      dragMindmapId: null,
      
      // 重命名对话框
      renameDialogVisible: false,
      renamingMindmap: null,
      newTitle: '',
      
      // 标签管理对话框
      tagDialogVisible: false,
      managingMindmap: null,
      currentMindmapTags: []
    }
  },
  computed: {
    isDark() {
      return this.$store?.state?.localConfig?.isDark || false
    },
    
    filteredMindmaps() {
      return this.mindmaps || []
    },
    
    // 排序后的思维导图
    sortedMindmaps() {
      const filtered = this.filteredMindmaps
      
      if (!filtered || filtered.length === 0) {
        return []
      }
      
      const sorted = [...filtered]
      
      return sorted.sort((a, b) => {
        let aValue = a[this.sortField]
        let bValue = b[this.sortField]
        
        if (this.sortField.includes('_at')) {
          aValue = new Date(aValue)
          bValue = new Date(bValue)
        }
        
        if (this.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    }
  },
  
  created() {
    // 监听数据更新事件
    this.$bus.$on('mindmap-tag-data-updated', this.handleTagDataUpdated)
    this.$bus.$on('force-refresh-mindmap-cards', this.forceRefreshCards)
  },
  
  beforeDestroy() {
    // 清理事件监听器
    this.$bus.$off('mindmap-tag-data-updated', this.handleTagDataUpdated)
    this.$bus.$off('force-refresh-mindmap-cards', this.forceRefreshCards)
  },
  
  methods: {
    
    // 处理排序命令
    handleSortCommand(command) {
      this.sortField = command.field
      this.sortOrder = command.order
    },
    
    // 处理卡片点击 - 实现单选模式：点击选中，再次点击取消
    handleCardClick(event, mindmap) {
      if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd + 点击进行多选
        this.toggleMindmapSelection(mindmap.id)
      } else {
        // 普通点击：实现单选模式
        this.selectSingleMindmap(mindmap.id)
      }
    },
    
    // 处理卡片双击 - 加载思维导图
    handleMindmapDoubleClick(event, mindmap) {
      event.preventDefault(); // 阻止可能的默认行为
      this.loadMindmap(mindmap)
    },
    
    // 选择单个思维导图（如果已选中则取消，否则只选中当前）
    selectSingleMindmap(mindmapId) {
      const index = this.selectedMindmapIds.indexOf(mindmapId)
      
      if (index > -1) {
        // 如果已经选中，取消选中
        this.$emit('mindmap-select', [])
      } else {
        // 如果未选中，只选中当前卡片
        this.$emit('mindmap-select', [mindmapId])
      }
    },
    
    // 切换思维导图选择（用于 Ctrl/Cmd 多选）
    toggleMindmapSelection(mindmapId) {
      const selected = [...this.selectedMindmapIds]
      const index = selected.indexOf(mindmapId)
      
      if (index > -1) {
        selected.splice(index, 1)
      } else {
        selected.push(mindmapId)
      }
      
      this.$emit('mindmap-select', selected)
    },
    
    // 处理批量命令
    handleBatchCommand(command) {
      if (this.selectedMindmapIds.length === 0) {
        this.$message.warning('请先选择思维导图')
        return
      }
      
      this.$emit('batch-operation', command, this.selectedMindmapIds)
    },
    
    // 加载思维导图
    loadMindmap(mindmap) {
      this.$emit('mindmap-load', mindmap.id)
    },
    
    // 显示右键菜单
    showContextMenu(event, mindmap) {
      // 可以实现自定义右键菜单
    },
    
    // 拖拽开始
    handleDragStart(event, mindmap) {
      this.dragActive = true
      this.dragMindmapId = mindmap.id
      
      // 设置拖拽数据
      event.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'mindmap',
        mindmapId: mindmap.id,
        mindmapTitle: this.getMindmapTitle(mindmap)
      }))
      
      // 设置拖拽效果
      event.dataTransfer.effectAllowed = 'copy'
      
      // 通知父组件拖拽开始
      this.$emit('drag-start', mindmap.id)
      
      // 向全局事件总线发送拖拽开始事件
      this.$bus.$emit('mindmap-drag-start', {
        mindmapId: mindmap.id,
        mindmapTitle: this.getMindmapTitle(mindmap)
      })
    },
    
    // 拖拽结束
    handleDragEnd(event) {
      this.dragActive = false
      this.dragMindmapId = null
      
      // 通知父组件拖拽结束
      this.$emit('drag-end')
      
      // 向全局事件总线发送拖拽结束事件
      this.$bus.$emit('mindmap-drag-end')
    },
    
    // 处理标签数据更新
    handleTagDataUpdated(data) {
      const { mindmapId } = data
      
      // 强制更新显示该思维导图的标签
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },
    
    // 强制刷新卡片
    forceRefreshCards() {
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },
    

    
    // 创建新思维导图
    createNewMindmap() {
      this.$emit('create-new-mindmap')
    },
    
    // 获取思维导图标题
    getMindmapTitle(mindmap) {
      // 确保标题字段存在且有值
      if (mindmap && mindmap.title) {
        const title = this.cleanTitle(String(mindmap.title))
        return title || '未命名思维导图'
      }
      
      // 备用字段
      if (mindmap && mindmap.name) {
        const name = this.cleanTitle(String(mindmap.name))
        return name || '未命名思维导图'
      }
      
      return '未命名思维导图'
    },
    
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
    
    // 获取思维导图标签
    getMindmapTags(mindmapId) {
      const tagIds = this.mindmapTagMapping[mindmapId] || []
      return tagIds.map(tagId => ({
        id: tagId,
        ...this.userTags[tagId]
      })).filter(tag => tag.name)
    },
    
    // 格式化日期
    formatDate(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) {
        return '刚刚'
      } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前'
      } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前'
      } else if (diff < 604800000) {
        return Math.floor(diff / 86400000) + '天前'
      } else {
        return date.toLocaleDateString()
      }
    },
    
    // 获取对比色
    getContrastColor(hexColor) {
      if (!hexColor) return '#333'
      
      // 移除 # 号
      const hex = hexColor.replace('#', '')
      
      // 计算亮度
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      
      return brightness > 128 ? '#333' : '#fff'
    },
    
    // 确认重命名
    confirmRename() {
      if (!this.newTitle.trim()) {
        this.$message.error('标题不能为空')
        return
      }
      
      if (this.renamingMindmap) {
        this.$emit('mindmap-rename', this.renamingMindmap.id, this.newTitle)
        this.renameDialogVisible = false
        this.newTitle = ''
      }
    },
    
    // 确认标签更新
    confirmTagUpdate() {
      if (this.managingMindmap) {
        this.$emit('mindmap-tag-update', this.managingMindmap.id, this.currentMindmapTags)
        this.tagDialogVisible = false
      }
    },
    
    // 切换思维导图标签
    toggleMindmapTag(tagId) {
      const index = this.currentMindmapTags.indexOf(tagId)
      if (index > -1) {
        this.currentMindmapTags.splice(index, 1)
      } else {
        this.currentMindmapTags.push(tagId)
      }
    }
  }
}
</script>

<style scoped>
.mindmapCards {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

/* 工具栏 */
.cards-toolbar {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-color-1);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.result-count {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.selected-info {
  font-size: 12px;
  color: var(--primary-color);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}



/* 卡片容器 */
.cards-container {
  flex: 1;
  overflow: hidden;
}

.cards-content {
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  align-content: start;
  background: var(--bg-color);
}


/* 思维导图卡片 */
.mindmap-card {
  background: #FFFFFF;
  border: 2px solid #E4E7ED;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: auto;
}

.mindmap-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
  border-color: #409EFF;
}

.mindmap-card.selected {
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.mindmap-card.drag-active {
  opacity: 0.6;
  border-style: dashed;
  border-color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
  transform: scale(0.95);
}

/* 卡片内容 */
.card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-title {
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #303133 !important;
  margin-bottom: 8px !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4 !important;
  z-index: 100 !important;
  position: relative !important;
  display: block !important;
  min-height: 22px !important;
  text-align: left !important;
  opacity: 1 !important;
  visibility: visible !important;
  background: transparent !important;
  width: 100% !important;
}

.card-tags {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.meta-item i {
  font-size: 12px;
}

/* 卡片操作 */
.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mindmap-card:hover .card-actions {
  opacity: 1;
}

.card-actions .el-button {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: var(--text-color-2);
}

.card-actions .el-button:hover {
  color: var(--primary-color);
  background: white;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--text-color-2);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 20px;
}

/* 标签管理对话框 */
.tag-management {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 12px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable-tag:hover {
  transform: scale(1.05);
}

/* 深色主题适配 */
.isDark .cards-toolbar {
  background: #1E1E1E;
  border-color: #4C4D4F;
}

.isDark .cards-content {
  background: #121212;
}

.isDark .mindmap-card {
  background: #1E1E1E !important; /* 使用 !important 确保深色背景生效 */
  border: 2px solid #3A3A3A !important;
  color: #E4E7ED !important;
}

.isDark .mindmap-card:hover {
  background: #2A2A2A !important;
  border-color: #4A9EFF !important;
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.2) !important;
}

.isDark .mindmap-card.selected {
  border-color: #4A9EFF !important;
  background: #252525 !important;
}

.isDark .card-title {
  color: #53a240 !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.isDark .result-count {
  color: #C0C4CC !important;
  font-weight: 500;
}

.isDark .selected-info {
  color: #A0CFFF !important;
}

.isDark .meta-item {
  color: #909399 !important;
}

/* 空状态的深色主题适配 */
.isDark .empty-state {
  color: #909399 !important;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .cards-content {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .cards-toolbar {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .toolbar-left,
  .toolbar-right {
    justify-content: space-between;
  }
  
  .cards-content {
    grid-template-columns: repeat(2, 1fr);
    padding: 16px;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .mindmap-card {
    border-radius: 8px;
  }
  
  .card-content {
    padding: 12px;
  }
  
  .card-title {
    font-size: 14px !important;
    opacity: 1 !important;
    visibility: visible !important;
  }
  
  .card-actions {
    position: static;
    opacity: 1;
    margin-top: 8px;
    text-align: center;
  }
}
</style>