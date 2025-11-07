<template>
  <div>
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

    <!-- 保存确认对话框 -->
  <el-dialog
    title="温馨提示"
    :visible.sync="saveConfirmVisible"
    width="500px"
    :modal-append-to-body="false"
    :close-on-click-modal="false"
    :before-close="handleSaveConfirmClose"
    custom-class="draggable-save-confirm-dialog saveConfirmDialog"
    :class="{ isDark: isDark }"
  >
    <div class="confirm-content">
      <p class="confirm-text">
        检测到当前思维导图"<strong>{{ currentMindMapTitle }}</strong>"已发生变化，是否需要保存？
      </p>
    </div>
    
    <div slot="footer" class="dialog-footer">
      <el-button 
        size="small" 
        @click="handleCancelSwitch"
        icon="el-icon-close"
      >
        取消
      </el-button>
      <el-button 
        size="small" 
        type="warning" 
        @click="handleOverwriteSwitch"
        icon="el-icon-warning"
      >
        不保存
      </el-button>
      <el-button 
        size="small" 
        type="primary" 
        @click="handleSaveAndSwitch"
        icon="el-icon-check"
      >
        保存并切换
      </el-button>
    </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { setMindMapCache, getMindMapCache, removeMindMapCache } from '@/utils/mindmap-cache-manager'
import { getCurrentMindMapIdFromVueInstance } from '@/utils/vue-instance-helpers'

export default {
  name: 'MindMapHistory',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    mindMap: {
      type: Object,
      default: null
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
      statusMessage: '',
      // mindMap实例
      localMindMap: null,
      
      // 保存提示对话框相关
      saveConfirmVisible: false,
      targetMindMapForSwitch: null,  // 目标切换的思维导图
      currentMindMapTitle: ''       // 当前思维导图标题
    }
  },
  computed: {
    ...mapState({
      supabaseEnabled: state => state.supabaseEnabled,
      isDark: state => state.localConfig.isDark
    }),
    
    // 使用本地mindMap（优先）或传入的mindMap
    currentMindMap() {
      return this.localMindMap || this.mindMap;
    },
    
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
  
  created() {
    // 监听思维导图初始化事件
    this.$bus.$on('mind_map_inited', this.handleMindMapInited);
  },
  beforeDestroy() {
    // 清理拖拽事件监听
    this.cleanupDragEvents()
    // 清理保存确认对话框拖拽事件
    this.cleanupSaveConfirmDragEvents()
    // 取消订阅事件
    this.$bus.$off('mind_map_inited', this.handleMindMapInited);
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
        // 策略1：先尝试从Vuex缓存快速显示
        const cachedMindMaps = this.$store.state.localMindMaps
        if (cachedMindMaps && cachedMindMaps.length > 0) {
          this.mindMaps = cachedMindMaps
          this.loading = false // 立即显示缓存数据
          
          // 后台异步同步最新数据
          this.syncDataInBackground()
          return
        }
        
        // 策略2：如果没有缓存，直接获取元数据（更快）
        const mindMaps = await this.$store.dispatch('getUserMindMaps', this.currentUser.id)
        this.mindMaps = mindMaps
        this.$store.commit('setLocalMindMaps', mindMaps)
        this.loading = false
        
        // 后台异步同步内容缓存
        this.syncContentCacheInBackground()
        
      } catch (error) {
        this.$message.error('加载思维导图失败: ' + error.message)
        this.loading = false
      }
    },
    
    // 后台同步数据（不阻塞UI）
    async syncDataInBackground() {
      try {
        // 静默同步，不显示加载状态
        await this.$store.dispatch('syncMindMapCacheIncrementally', this.currentUser.id)
        const latestMindMaps = await this.$store.dispatch('getUserMindMaps', this.currentUser.id)
        
        // 检查是否有更新
        const currentIds = this.mindMaps.map(m => m.id).sort()
        const latestIds = latestMindMaps.map(m => m.id).sort()
        
        if (JSON.stringify(currentIds) !== JSON.stringify(latestIds)) {
          // 有新的变化，更新UI
          this.mindMaps = latestMindMaps
          this.$store.commit('setLocalMindMaps', latestMindMaps)
          
          // 可选：显示轻量级提示
          this.$message({
            message: '已更新思维导图列表',
            type: 'info',
            duration: 1500,
            showClose: false
          })
        }
      } catch (error) {
        // 后台同步失败不影响用户体验
        console.warn('后台同步失败:', error)
      }
    },
    
    // 后台同步内容缓存（不阻塞UI）
    async syncContentCacheInBackground() {
      try {
        // 静默同步内容缓存
        await this.$store.dispatch('syncMindMapCacheIncrementally', this.currentUser.id)
      } catch (error) {
        console.warn('后台内容缓存同步失败:', error)
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
    
    // 刷新思维导图列表（优化版：立即响应，后台同步）
    async refreshMindMaps() {
      // 清空选中状态
      this.selectedMindMaps = []
      
      // 先尝试快速刷新（直接获取元数据）
      this.loading = true
      try {
        const mindMaps = await this.$store.dispatch('getUserMindMaps', this.currentUser.id)
        this.mindMaps = mindMaps
        this.$store.commit('setLocalMindMaps', mindMaps)
        this.loading = false
        
        this.statusMessage = `刷新完成，共获取 ${this.mindMaps.length} 个思维导图`
        
        // 后台异步同步内容缓存（不阻塞UI）
        this.syncContentCacheInBackground()
        
      } catch (error) {
        this.loading = false
        this.$message.error('刷新失败: ' + error.message)
        this.statusMessage = '刷新失败'
      }
      
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
        removeMindMapCache(mindMap.id);
        
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
      
      // 首先检查当前思维导图是否需要保存
      try {
        const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
        
        if (!this.currentMindMap) {
          throw new Error('思维导图实例未找到，无法进行切换操作');
        }
        
        const currentData = this.currentMindMap.getData(true);
        
        const needsSave = await this.$store.dispatch('needsSave', {
          currentMindMap: {
            id: currentMindMapId,
            data: currentData
          }
        });
        
        if (needsSave) {
          // 需要保存，显示保存确认对话框
          this.showSaveConfirmDialogForSwitch(mindMap);
        } else {
          // 不需要保存，直接开始切换
          await this.startActualSwitching(mindMap);
        }
      } catch (error) {
        console.error('❌ MindMapHistory - 检查思维导图是否需要保存时出错:', error);
        // 出错时按需要保存处理
        this.showSaveConfirmDialogForSwitch(mindMap);
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    },
    
    // 处理思维导图初始化事件
    handleMindMapInited(mindMap) {
      this.localMindMap = mindMap;
    },

    // 显示保存确认对话框（用于切换）
    showSaveConfirmDialogForSwitch(targetMindMap) {
      // 保存目标思维导图信息
      this.targetMindMapForSwitch = targetMindMap;
      
      // 获取当前思维导图的标题
      this.getCurrentMindMapTitle();
      
      // 显示确认对话框
      this.saveConfirmVisible = true;
      
      // 延迟初始化拖拽功能，确保DOM完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          this.initDragForDialog('.draggable-save-confirm-dialog', '温馨提示');
        }, 100);
      });
    },

    // 获取当前思维导图标题
    getCurrentMindMapTitle() {
      try {
        if (this.currentMindMap && this.currentMindMap.renderer && this.currentMindMap.renderer.root) {
          const rootData = this.currentMindMap.renderer.root.getData();
          if (rootData && rootData.text) {
            // 移除HTML标签，获取纯文本
            this.currentMindMapTitle = rootData.text.replace(/<[^>]*>/g, '').trim();
          } else {
            this.currentMindMapTitle = '未命名思维导图';
          }
        } else {
          this.currentMindMapTitle = '未命名思维导图';
        }
      } catch (error) {
        console.error('❌ MindMapHistory - 获取当前标题失败:', error);
        this.currentMindMapTitle = '未命名思维导图';
      }
    },

    // 开始实际的切换过程
    async startActualSwitching(targetMindMap) {
      
      try {
        // 从统一缓存获取目标思维导图数据
        const cachedData = getMindMapCache(targetMindMap.id);
        
        if (!cachedData) {
          throw new Error(`未找到思维导图缓存数据 (ID: ${targetMindMap.id})`);
        }
        // 根据数据结构选择合适的方法设置思维导图数据
        if (cachedData.root && cachedData.root.data) {
          // 如果数据包含完整的思维导图结构（根节点、布局、主题等），使用 setFullData
          this.currentMindMap.setFullData(cachedData);
        } else {
          // 否则直接设置根节点数据
          this.currentMindMap.setData(cachedData);
        }
        
        // 更新当前思维导图ID
        this.$store.commit('setCurrentMindMapId', targetMindMap.id);
        
        // 等待根节点创建完成后再居中
        setTimeout(() => {
          if (this.currentMindMap && this.currentMindMap.renderer && this.currentMindMap.renderer.root) {
            this.currentMindMap.renderer.setRootNodeCenter();
          }
        }, 100);
        
        this.$message.success(`已切换到思维导图: ${targetMindMap.title}`);
        
        // 关闭历史对话框
        this.handleClose();
        
      } catch (error) {
        console.error('❌ MindMapHistory - 切换思维导图失败:', error);
        this.$message.error('切换思维导图失败: ' + error.message);
      }
    },

    // 处理保存并切换
    async handleSaveAndSwitch() {
      // 1. 关闭确认对话框
      this.saveConfirmVisible = false;
      
      // 2. 在开始任何操作前，先复制当前思维导图的数据和ID
      const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
      const currentUser = this.$store.state.currentUser;
      const originalData = JSON.parse(JSON.stringify(this.currentMindMap.getData(true))); // 深拷贝原始数据
      const originalTitle = this.currentMindMapTitle;
      const targetMindMap = this.targetMindMapForSwitch;
      
      // 3. 开始切换（与保存同时进行）
      const switchingPromise = this.startActualSwitching(targetMindMap);
      
      // 4. 在后台异步保存原始数据（与切换同时进行）
      if (currentUser && originalData) {
        // 显示保存状态
        
        this.saveMindMapData(originalData, originalTitle, currentMindMapId, currentUser.id)
          .then(result => {
            // 使用通知提示保存成功
            this.$notify({
              title: '保存成功',
              message: '原思维导图已保存!',
              type: 'success',
              duration: 3000
            });
          })
          .catch(error => {
            // 使用通知提示保存失败
            this.$notify({
              title: '保存失败',
              message: '原思维导图保存失败: ' + error.message,
              type: 'error',
              duration: 5000
            });
          });
      }
      
      // 等待切换完成
      await switchingPromise;
    },

    // 处理不保存直接切换
    async handleOverwriteSwitch() {
      // 1. 关闭确认对话框
      this.saveConfirmVisible = false;
      
      // 2. 直接开始切换
      const targetMindMap = this.targetMindMapForSwitch;
      await this.startActualSwitching(targetMindMap);
    },

    // 处理取消切换
    handleCancelSwitch() {
      // 关闭确认对话框
      this.saveConfirmVisible = false;
      this.targetMindMapForSwitch = null;
      this.$message.info('已取消切换思维导图');
    },

    // 处理保存确认对话框关闭
    handleSaveConfirmClose() {
      // 用户直接关闭对话框，相当于取消操作
      this.saveConfirmVisible = false;
      this.targetMindMapForSwitch = null;
      this.$message.info('已取消切换思维导图');
    },

    // 保存思维导图数据的辅助方法
    async saveMindMapData(content, title, mindMapId, userId) {
      try {
        let result;
        if (mindMapId) {
          // 更新现有思维导图
          result = await this.$store.dispatch('saveMindMap', {
            id: mindMapId,
            userId: userId,
            title: title,
            content: content,
            isUpdate: true
          });
        } else {
          // 创建新思维导图
          result = await this.$store.dispatch('saveMindMap', {
            userId: userId,
            title: title,
            content: content,
            isUpdate: false
          });
        }
        return result;
      } catch (error) {
        throw error;
      }
    },

    // 为指定对话框初始化拖拽功能
    initDragForDialog(dialogClass, dialogTitle) {
      // 尝试多种选择器方式
      let dialogHeaderEl = document.querySelector(`${dialogClass} .el-dialog__header`);
      let dragDom = document.querySelector(`${dialogClass} .el-dialog`);
      
      // 如果通过custom-class找不到，尝试通过class找
      if (!dialogHeaderEl || !dragDom) {
        const allDialogs = document.querySelectorAll('.el-dialog');
        for (let dialog of allDialogs) {
          const title = dialog.querySelector('.el-dialog__title');
          if (title && title.textContent.includes(dialogTitle)) {
            dragDom = dialog;
            dialogHeaderEl = dialog.querySelector('.el-dialog__header');
            break;
          }
        }
      }

      if (!dialogHeaderEl || !dragDom) {
        return;
      }
      
      // 设置标题栏样式
      dialogHeaderEl.style.cursor = 'move';
      dialogHeaderEl.style.userSelect = 'none';

      let startX = 0;
      let startY = 0;
      let lastX = 0;
      let lastY = 0;

      const mousedownHandler = (e) => {
        // 只有点击标题栏才触发拖拽
        if (e.target !== dialogHeaderEl && !dialogHeaderEl.contains(e.target)) {
          return;
        }

        startX = e.clientX;
        startY = e.clientY;

        // 获取当前transform值
        const style = window.getComputedStyle(dragDom);
        const transform = style.transform;
        if (transform && transform !== 'none') {
          const matrix = new DOMMatrix(transform);
          lastX = matrix.m41;
          lastY = matrix.m42;
        } else {
          lastX = 0;
          lastY = 0;
        }

        const mousemoveHandler = (e) => {
          const offsetX = e.clientX - startX;
          const offsetY = e.clientY - startY;
          dragDom.style.transform = `translate(${lastX + offsetX}px, ${lastY + offsetY}px)`;
          dragDom.style.willChange = 'transform'; // 优化性能
        };

        const mouseupHandler = () => {
          dragDom.style.willChange = 'auto';
          document.removeEventListener('mousemove', mousemoveHandler);
          document.removeEventListener('mouseup', mouseupHandler);
        };

        document.addEventListener('mousemove', mousemoveHandler);
        document.addEventListener('mouseup', mouseupHandler);

        e.preventDefault();
      };

      dialogHeaderEl.addEventListener('mousedown', mousedownHandler);

      // 保存拖拽处理器以便清理
      if (dialogTitle.includes('温馨提示')) {
        this.saveConfirmDragHandler = {
          element: dialogHeaderEl,
          mousedownHandler: mousedownHandler
        };
      }
    },

    // 清理保存确认对话框拖拽事件
    cleanupSaveConfirmDragEvents() {
      if (this.saveConfirmDragHandler) {
        this.saveConfirmDragHandler.element.removeEventListener('mousedown', this.saveConfirmDragHandler.mousedownHandler);
        this.saveConfirmDragHandler = null;
      }
    },

    // 验证和清理思维导图数据
    validateAndCleanMindMapData(data) {
      
      if (!data || typeof data !== 'object') {
        return { root: { data: { text: '空思维导图' }, children: [] } };
      }

      // 递归清理节点数据
      const cleanNode = (node) => {
        if (!node || typeof node !== 'object') {
          return { data: { text: '空节点' }, children: [] };
        }

        // 确保节点数据结构完整，深度清理所有字符串属性
        const cleanedData = {};
        if (node.data) {
          for (const key in node.data) {
            const value = node.data[key];
            if (typeof value === 'string' || value === null || value === undefined) {
              cleanedData[key] = this.ensureValidText(value);
            } else if (Array.isArray(value)) {
              // 清理数组中的字符串元素
              cleanedData[key] = value.map(item => 
                typeof item === 'string' || item === null || item === undefined 
                  ? this.ensureValidText(item) 
                  : item
              ).filter(item => item !== null && item !== undefined);
            } else {
              cleanedData[key] = value;
            }
          }
        }
        
        const cleanedNode = {
          data: {
            text: '未命名节点', // 默认值
            ...cleanedData,
            text: this.ensureValidText(cleanedData.text) // 确保text最后设置
          },
          children: []
        };

        // 递归清理子节点
        if (node.children && Array.isArray(node.children)) {
          cleanedNode.children = node.children
            .filter(child => child != null) // 过滤掉null/undefined
            .map(child => cleanNode(child));
        }

        return cleanedNode;
      };

      // 正确处理数据结构
      let result;
      if (data.root) {
        // 如果有root属性，直接处理整个数据结构
        result = {
          root: cleanNode(data.root)
        };
      } else {
        // 如果没有root属性，将数据作为root节点处理
        result = {
          root: cleanNode(data)
        };
      }
      
      return result;
    },

    // 确保文本内容有效
    ensureValidText(text) {
      if (text === null || text === undefined) {
        return '未命名节点';
      }
      if (typeof text !== 'string') {
        return String(text);
      }
      if (text.trim() === '') {
        return '空节点';
      }
      return text;
    },

    // 计算节点数量（用于日志）
    countNodes(data) {
      if (!data || !data.root) return 0;
      
      const countInNode = (node) => {
        let count = 1; // 当前节点
        if (node.children && Array.isArray(node.children)) {
          count += node.children.reduce((sum, child) => sum + countInNode(child), 0);
        }
        return count;
      };
      
      return countInNode(data.root);
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
          color: #77eb3d !important;
          text-shadow: none !important;
          -webkit-text-fill-color: initial !important;
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

// 保存确认对话框样式
.saveConfirmDialog {
  margin-top: 115px;
  
  .confirm-content {
    padding: 10px 0;
    
    .confirm-text {
      margin: 0 0 15px 0;
      font-size: 15px;
      color: #606266;
      line-height: 1.5;
      text-align: center;
    }
  }
  
  .dialog-footer {
    text-align: right;
    padding: 15px 20px 0 20px;
    border-top: none;
    
    .el-button {
      margin-left: 12px;
      
      i {
        margin-right: 5px;
      }
    }
  }
}

// 深色主题下的保存确认对话框
.toolbarContainer.isDark .saveConfirmDialog {
  .el-dialog {
    background-color: #2b2f33 !important;
    border: 1px solid #404040 !important;
  }
  
  .el-dialog__header {
    background-color: #2b2f33 !important;
    border-bottom: 1px solid #404040 !important;
  }
  
  .el-dialog__title {
    color: hsla(0, 0%, 100%, 0.9) !important;
  }
  
  .el-dialog__headerbtn .el-dialog__close {
    color: hsla(0, 0%, 100%, 0.6) !important;
  }
  
  .confirm-content {
    .confirm-text {
      color: hsla(0, 0%, 100%, 0.8) !important;
    }
  }
  
  .dialog-footer {
    border-top: none !important;
  }
}
</style>