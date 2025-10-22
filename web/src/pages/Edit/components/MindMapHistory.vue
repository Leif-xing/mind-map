<template>
  <!-- 思维导图历史对话框 -->
  <el-dialog
    title="思维导图"
    :visible.sync="visible"
    width="800px"
    :modal-append-to-body="false"
    :close-on-click-modal="false"
    :before-close="handleClose"
    :destroy-on-close="false"
    custom-class="draggable-dialog mind-map-history-dialog"
    :class="{ isDark: isDark }"
    ref="mindMapDialog"
  >
    <!-- 统一容器 -->
    <div class="mindmap-content-wrapper">
      <!-- 功能操作栏 -->
      <div class="mindmap-toolbar-container">
        <el-input
          v-model="searchQuery"
          placeholder="搜索思维导图..."
          size="small"
          clearable
          prefix-icon="el-icon-search"
          style="width: 240px;"
          @input="handleSearch"
        />
        
        <div class="mindmap-toolbar-buttons">
          <el-button
            size="small"
            type="primary"
            plain
            @click="refreshMindMaps"
            icon="el-icon-refresh"
          >
            刷新
          </el-button>
          
          <el-button
            size="small"
            type="danger"
            :disabled="selectedMindMaps.length === 0"
            @click="batchDelete"
            icon="el-icon-delete"
          >
            批量删除 ({{ selectedMindMaps.length }})
          </el-button>
          
          <el-button
            size="small"
            type="danger"
            plain
            @click="clearAll"
            icon="el-icon-delete-solid"
          >
            一键删除
          </el-button>
        </div>
      </div>
      
      <!-- 思维导图列表 -->
      <div class="mindmap-list-container">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner">
            <i class="el-icon-loading"></i>
            <span>正在加载思维导图...</span>
          </div>
        </div>
        
        <!-- 无数据状态 -->
        <div v-else-if="mindMaps.length === 0" class="no-mindmaps">
          暂无思维导图
        </div>
        
        <!-- 思维导图列表 -->
        <div 
          v-else
          v-for="mindMap in filteredMindMaps" 
          :key="mindMap.id" 
          class="mindmap-card"
          :class="{ 'selected': isSelected(mindMap.id) }"
          @dblclick.stop="loadMindMap(mindMap, $event)"
          @click.stop="handleCardClick(mindMap, $event)"
        >
          <div class="mindmap-card-content">
            <div class="mindmap-info">
              <div class="mindmap-title" :title="mindMap.title">{{ mindMap.title }}</div>
              <div class="mindmap-date">{{ formatDate(mindMap.updated_at) }}</div>
            </div>
            
            <div class="mindmap-bottom">
              <!-- 操作按钮 - 定位到右下角 -->
              <div class="mindmap-actions">
                <el-button size="mini" type="danger" @click.stop="deleteMindMap(mindMap)">删除</el-button>
              </div>
            </div>
            
            <!-- 隐藏的思维导图ID -->
            <div :id="'mindmap-id-' + mindMap.id" style="display: none;">{{ mindMap.id }}</div>
          </div>
        </div>
      </div>
    </div>
    <!-- 状态栏作为对话框footer，填满整个footer区域 -->
    <div slot="footer" class="mindmap-status-bar" style="margin: 0; padding: 0; width: 100%; height: 100%;">
      <span class="status-text">{{ statusMessage }}</span>
    </div>
  </el-dialog>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'MindMapHistory',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      mindMaps: [],
      loading: false,
      searchQuery: '',
      selectedMindMaps: [],
      currentUser: null,
      // 对话框拖拽相关
      dialogDragData: {
        isDragging: false,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0
      },
      // 状态栏消息
      statusMessage: ''
    }
  },
  computed: {
    ...mapState({
      supabaseEnabled: state => state.supabaseEnabled,
      isDark: state => state.localConfig.isDark
    }),
    
    filteredMindMaps() {
      if (!this.searchQuery.trim()) {
        return this.mindMaps
      }
      
      const keyword = this.searchQuery.toLowerCase()
      return this.mindMaps.filter(mindMap => {
        return mindMap.title.toLowerCase().includes(keyword)
      })
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.loadCurrentUser()
        this.loadMindMaps()
        this.selectedMindMaps = []
        this.updateStatusMessage()
        // 初始化拖拽功能
        this.initDialogDrag()
      }
    }
  },
  beforeDestroy() {
    // 清理拖拽事件监听
    this.cleanupDragEvents()
  },
  methods: {
    loadCurrentUser() {
      this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
      if (!this.currentUser) {
        this.$message.error('请先登录')
        this.$router.push('/login')
      }
    },
    
    async loadMindMaps() {
      if (!this.currentUser) {
        return
      }
      
      this.loading = true
      try {
        // 使用新的增量同步函数同步数据库与内容缓存
        await this.$store.dispatch('syncMindMapCacheIncrementally', this.currentUser.id);
        
        // 从数据库获取最新的元数据用于界面显示
        const mindMaps = await this.$store.dispatch('getUserMindMaps', this.currentUser.id);
        
        this.mindMaps = mindMaps
        // 同步到Vuex本地缓存
        this.$store.commit('setLocalMindMaps', mindMaps)
      } catch (error) {
        this.$message.error('加载思维导图失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },
    
    // 关闭对话框
    handleClose(done) {
      // 重置对话框位置和样式
      const dialogEl = document.querySelector('.mind-map-history-dialog')
      if (dialogEl) {
        // 恢复默认样式
        dialogEl.style.position = ''
        dialogEl.style.left = ''
        dialogEl.style.top = ''
        dialogEl.style.marginLeft = ''
        dialogEl.style.marginTop = ''
      }
      this.$emit('update:visible', false)
      if (done) {
        done()
      }
    },
    
    // 初始化对话框拖拽功能
    initDialogDrag() {
      this.$nextTick(() => {
        const dialogEl = document.querySelector('.mind-map-history-dialog')
        if (!dialogEl) return
        
        const headerEl = dialogEl.querySelector('.el-dialog__header')
        if (!headerEl) return
        
        // 设置拖拽样式
        headerEl.style.cursor = 'move'
        headerEl.style.userSelect = 'none'
        
        // 绑定拖拽事件
        headerEl.addEventListener('mousedown', this.startDrag)
      })
    },
    
    // 开始拖拽
    startDrag(e) {
      const dialogEl = document.querySelector('.mind-map-history-dialog')
      if (!dialogEl) return
      
      // 记录初始位置
      this.dialogDragData.isDragging = true
      this.dialogDragData.startX = e.clientX
      this.dialogDragData.startY = e.clientY
      
      // 获取当前对话框位置
      const rect = dialogEl.getBoundingClientRect()
      this.dialogDragData.initialLeft = rect.left
      this.dialogDragData.initialTop = rect.top
      
      // 绑定移动和结束事件
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.endDrag)
      
      // 添加拖拽样式
      dialogEl.classList.add('dragging')
      
      // 防止选中文本
      e.preventDefault()
    },
    
    // 拖拽中
    onDrag(e) {
      if (!this.dialogDragData.isDragging) return
      
      const dialogEl = document.querySelector('.mind-map-history-dialog')
      if (!dialogEl) return
      
      // 计算新位置
      const deltaX = e.clientX - this.dialogDragData.startX
      const deltaY = e.clientY - this.dialogDragData.startY
      
      const newLeft = this.dialogDragData.initialLeft + deltaX
      const newTop = this.dialogDragData.initialTop + deltaY
      
      // 获取窗口尺寸，确保对话框不会拖出视口
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const dialogRect = dialogEl.getBoundingClientRect()
      
      const maxLeft = windowWidth - dialogRect.width
      const maxTop = windowHeight - dialogRect.height
      
      const finalLeft = Math.max(0, Math.min(newLeft, maxLeft))
      const finalTop = Math.max(0, Math.min(newTop, maxTop))
      
      // 应用新位置
      dialogEl.style.position = 'fixed'
      dialogEl.style.left = finalLeft + 'px'
      dialogEl.style.top = finalTop + 'px'
      dialogEl.style.marginLeft = '0'
      dialogEl.style.marginTop = '0'
    },
    
    // 结束拖拽
    endDrag() {
      this.dialogDragData.isDragging = false
      
      // 移除拖拽样式
      const dialogEl = document.querySelector('.mind-map-history-dialog')
      if (dialogEl) {
        dialogEl.classList.remove('dragging')
        // 确保拖拽后的位置被正确应用
        dialogEl.style.marginLeft = '0'
        dialogEl.style.marginTop = '0'
      }
      
      // 移除事件监听
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.endDrag)
    },
    
    // 清理拖拽事件监听
    cleanupDragEvents() {
      // 移除可能残留的事件监听
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.endDrag)
      
      // 清理对话框头部的事件监听
      const headerEl = document.querySelector('.mind-map-history-dialog .el-dialog__header')
      if (headerEl) {
        headerEl.removeEventListener('mousedown', this.startDrag)
      }
    },
    
    // 处理卡片单击事件（切换选中状态）
    handleCardClick(mindMap, event) {
      // 检查当前是否已选中该思维导图
      const isSelectedBefore = this.isSelected(mindMap.id);
      this.toggleSelection(mindMap.id);
      
      // 更新状态栏信息
      if (isSelectedBefore) {
        this.statusMessage = `已取消选中 ${mindMap.title} 思维导图`;
      } else {
        this.statusMessage = `已选中 ${mindMap.title} 思维导图`;
      }
      
      // 阻止事件冒泡，防止触发对话框的其他行为
      if (event) {
        event.stopPropagation();
      }
      // 确保对话框保持在拖拽后的位置，而不是跳回居中
      this.$nextTick(() => {
        const dialogEl = document.querySelector('.mind-map-history-dialog');
        if (dialogEl && dialogEl.style.position === 'fixed') {
          // 如果是拖拽后的位置，保持fixed定位
          dialogEl.style.marginLeft = '0';
          dialogEl.style.marginTop = '0';
        }
      });
    },
    
    // 切换选中状态
    toggleSelection(mindMapId) {
      const index = this.selectedMindMaps.findIndex(item => item.id === mindMapId)
      if (index > -1) {
        this.selectedMindMaps.splice(index, 1)
      } else {
        const mindMap = this.mindMaps.find(item => item.id === mindMapId)
        if (mindMap) {
          this.selectedMindMaps.push(mindMap)
        }
      }
    },
    
    // 更新状态栏信息
    updateStatusMessage() {
      if (this.selectedMindMaps.length === 0) {
        this.statusMessage = '双击卡片切换所选思维导图'
      } else if (this.selectedMindMaps.length === 1) {
        this.statusMessage = `已选中 ${this.selectedMindMaps[0].title} 思维导图`
      } else {
        this.statusMessage = `已选中 ${this.selectedMindMaps.length} 个思维导图`
      }
    },
    
    // 检查是否被选中
    isSelected(mindMapId) {
      return this.selectedMindMaps.some(item => item.id === mindMapId)
    },
    
    // 处理搜索
    handleSearch() {
      // 搜索时清空选中状态
      this.selectedMindMaps = []
      // 更新状态栏，显示搜索结果数量
      const searchResultsCount = this.filteredMindMaps.length;
      this.statusMessage = `已找到 ${searchResultsCount} 个思维导图`;
    },
    
    // 刷新思维导图列表
    async refreshMindMaps() {
      await this.loadMindMaps()
      this.selectedMindMaps = []
      this.statusMessage = `刷新完成，共获取 ${this.mindMaps.length} 个思维导图`
      // 延时后恢复默认状态栏信息
      setTimeout(() => {
        this.updateStatusMessage()
      }, 2000)
    },
    
    async deleteMindMap(mindMap) {
      try {
        await this.$confirm(`确定要删除思维导图 "${mindMap.title}" 吗？`, '删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        this.statusMessage = `正在删除: ${mindMap.title}`
        
        await this.$store.dispatch('deleteMindMap', {
          mindMapId: mindMap.id,
          userId: this.currentUser.id
        })
        
        this.$message.success('思维导图删除成功')
        this.statusMessage = `已删除: ${mindMap.title}`
        
        // 清理被删除思维导图的本地缓存
        const deletedMindMapCacheKey = `mindmap_cache_${mindMap.id}`;
        localStorage.removeItem(deletedMindMapCacheKey);
        
        // 重新加载思维导图列表
        const updatedMindMaps = await this.$store.dispatch('getUserMindMaps', this.currentUser.id)
        this.mindMaps = updatedMindMaps
        // 同步到Vuex本地缓存
        this.$store.commit('setLocalMindMaps', updatedMindMaps)
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除思维导图失败: ' + error.message)
          this.statusMessage = `删除失败: ${mindMap.title} - ${error.message}`
        } else {
          this.statusMessage = `用户取消删除: ${mindMap.title}`
        }
      }
    },
    
    async batchDelete() {
      if (this.selectedMindMaps.length === 0) {
        this.$message.warning('请至少选择一个思维导图')
        return
      }
      
      try {
        await this.$confirm(`确定要删除选中的 ${this.selectedMindMaps.length} 个思维导图吗？`, '批量删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        this.statusMessage = `正在批量删除 ${this.selectedMindMaps.length} 个思维导图...`
        
        const deletePromises = this.selectedMindMaps.map(mindMap => 
          this.$store.dispatch('deleteMindMap', {
            mindMapId: mindMap.id,
            userId: this.currentUser.id
          })
        )
        
        await Promise.all(deletePromises)
        
        this.$message.success(`成功删除了 ${this.selectedMindMaps.length} 个思维导图`)
        this.statusMessage = `共删除 ${this.selectedMindMaps.length} 个思维导图`
        this.selectedMindMaps = []
        await this.loadMindMaps()
        // 延时后恢复默认状态栏信息
        setTimeout(() => {
          this.updateStatusMessage()
        }, 3000)
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('批量删除思维导图失败: ' + error.message)
          this.statusMessage = `批量删除失败: ${error.message}`
        } else {
          this.statusMessage = '用户取消批量删除操作'
        }
      }
    },
    
    async clearAll() {
      if (!(this.mindMaps && this.mindMaps.length > 0)) {
        this.$message.warning('没有可删除的思维导图')
        return
      }
      
      try {
        await this.$confirm('确定要清空所有思维导图吗？此操作不可恢复！', '清空确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        this.statusMessage = `正在清空所有思维导图...`
        
        const deletePromises = this.mindMaps.map(mindMap => 
          this.$store.dispatch('deleteMindMap', {
            mindMapId: mindMap.id,
            userId: this.currentUser.id
          })
        )
        
        await Promise.all(deletePromises)
        
        this.$message.success('所有思维导图已清空')
        this.statusMessage = '已清理全部思维导图'
        this.selectedMindMaps = []
        await this.loadMindMaps()
        // 延时后恢复默认状态栏信息
        setTimeout(() => {
          this.updateStatusMessage()
        }, 3000)
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('清空思维导图失败: ' + error.message)
          this.statusMessage = `清空失败: ${error.message}`
        } else {
          this.statusMessage = '用户取消清空操作'
        }
      }
    },
    
    async loadMindMap(mindMap, event) {
      // 阻止事件冒泡
      if (event) {
        event.stopPropagation();
      }
      
      this.$emit('load-mind-map', mindMap);
      // 关闭对话框
      this.handleClose();
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    }
  }
}
</script>

<style lang="less" scoped>
// 思维导图对话框基础样式
.mindmap-content-wrapper {
  padding: 0;
  min-height: 400px;
  
  .mindmap-toolbar-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 8px 24px;
    border-bottom: none;
    
    .mindmap-toolbar-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: nowrap;
      margin-left: auto;
    }
  }
  
  .mindmap-list-container {
    max-height: 50vh !important;
    overflow-y: auto;
    padding: 0 24px;
    
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      
      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        color: #606266;
        
        i {
          font-size: 24px;
          animation: rotating 2s linear infinite;
        }
        
        span {
          font-size: 14px;
        }
      }
    }
    
    .no-mindmaps {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
      color: #909399;
      font-size: 14px;
    }
  }
}

// 状态栏样式
.mindmap-status-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border-top: 1px solid #ebeef5;
  min-height: 32px;
  margin: 0 !important;
  
  .status-text {
    font-size: 12px;
    color: #606266;
    line-height: 1.2;
  }
}

// 思维导图卡片样式 - 三列布局
.mindmap-card {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f5f5f5;
  width: calc(33.333% - 7px);
  display: inline-block;
  vertical-align: top;
  
  &:not(:nth-child(3n)) {
    margin-right: 10px;
  }
  
  &:hover {
    border-color: #409eff;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
    transform: translateY(-1px);
  }
  
  &.selected {
    border-color: #409eff;
    background-color: #ecf5ff;
    box-shadow: 0 2px 8px 0 rgba(64, 158, 255, 0.2);
  }
  
  .mindmap-card-content {
    padding: 12px;
    position: relative;
    
    .mindmap-info {
      margin-bottom: 8px;
      
      .mindmap-title {
        font-size: 13px;
        font-weight: 500;
        color: #303133;
        margin-bottom: 4px;
        line-height: 1.4;
        word-break: break-word;
        max-width: calc(100% - 60px);
      }
      
      .mindmap-date {
        font-size: 11px;
        color: #909399;
        line-height: 1.2;
      }
    }
    
    .mindmap-bottom {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      
      .mindmap-actions {
        display: flex;
        gap: 4px;
      }
    }
  }
}

// 动画
@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 滚动条样式
.mindmap-list-container {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #c1c1c1;
    border-radius: 3px;
    
    &:hover {
      background-color: #a8a8a8;
    }
  }
}
</style>

// 非scoped样式用于深色主题
<style lang="less">
// 移除对话框body的默认padding
.mind-map-history-dialog .el-dialog__body {
  padding: 0 !important;
}

// 深色主题样式 - 需要更高的优先级
.toolbarContainer.isDark .mind-map-history-dialog {
  .el-dialog {
    background-color: #262a2e !important;
    
    .el-dialog__header {
      border-bottom: 1px solid hsla(0, 0%, 100%, 0.1) !important;
    }
    
    .el-dialog__title {
      color: hsla(0, 0%, 100%, 0.9) !important;
    }
    
    .el-dialog__body {
      background-color: #262a2e !important;
    }
    
    .el-dialog__footer {
      border-top: 1px solid hsla(0, 0%, 100%, 0.1) !important;
    }
  }
  
  .mindmap-content-wrapper {
    .mindmap-toolbar-container {
      border-bottom: none !important;
    }
    
    .mindmap-list-container {
      .loading-container .loading-spinner {
        color: hsla(0, 0%, 100%, 0.6) !important;
      }
      
      .no-mindmaps {
        color: hsla(0, 0%, 100%, 0.4) !important;
      }
      
      // 深色主题滚动条
      scrollbar-color: hsla(0, 0%, 100%, 0.3) transparent;
      
      &::-webkit-scrollbar-thumb {
        background-color: hsla(0, 0%, 100%, 0.3) !important;
        
        &:hover {
          background-color: hsla(0, 0%, 100%, 0.5) !important;
        }
      }
    }
  }
  
  .mindmap-status-bar {
    background-color: #363b3f !important;
    border-top-color: hsla(0, 0%, 100%, 0.1) !important;
    
    .status-text {
      color: hsla(0, 0%, 100%, 0.6) !important;
    }
  }
  
  .mindmap-card {
    background-color: #363b3f !important;
    border-color: hsla(0, 0%, 100%, 0.1) !important;
    
    &:hover {
      border-color: #409eff !important;
      background-color: #363b3f !important;
    }
    
    &.selected {
      background-color: rgba(64, 158, 255, 0.15) !important;
      border-color: #409eff !important;
    }
    
    .mindmap-card-content {
      .mindmap-info {
        .mindmap-title {
          color: hsla(0, 0%, 100%, 0.9) !important;
        }
        
        .mindmap-date {
          color: hsla(0, 0%, 100%, 0.4) !important;
        }
      }
    }
  }
}

// 拖拽时的样式
.mind-map-history-dialog.dragging {
  .el-dialog__header {
    cursor: move !important;
  }
}
</style>