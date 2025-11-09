<template>
  <div
    class="container toolbarContainer"
    :class="{ isDark: isDark, activeSidebar: activeSidebar }"
  >
    <template v-if="show">
      <Toolbar v-if="!isZenMode"></Toolbar>
      <Edit></Edit>
      <!-- 思维导图历史对话框 -->
      <MindMapHistory 
        :visible.sync="showMindMapDialog"
        @load-mind-map="handleLoadMindMap"
      />
      
      <!-- 标签管理器 -->
      <MindMapTagManager ref="tagManager" />
    </template>
  </div>
</template>

<script>
import Toolbar from './components/Toolbar.vue'
import Edit from './components/Edit.vue'
import MindMapHistory from './components/MindMapHistory.vue'
import MindMapTagManager from './components/MindMapTagManager.vue'
import { mapState, mapMutations } from 'vuex'
import { getLocalConfig } from '@/api'

export default {
  components: {
    Toolbar,
    Edit,
    MindMapHistory,
    MindMapTagManager
  },
  data() {
    return {
      show: false,
      showMindMapDialog: false
    }
  },
  computed: {
    ...mapState({
      isZenMode: state => state.localConfig.isZenMode,
      isDark: state => state.localConfig.isDark,
      activeSidebar: state => state.activeSidebar
    })
  },
  created() {
    // 检查用户是否已登录，如果没有则重定向到登录页面
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    if (!currentUser) {
      this.$router.push('/login')
      return
    }
    
    // 检查用户导图权限
    if (!currentUser.isAdmin && currentUser.mindMapPermission !== 1) {
      this.$message.warning('您没有导图权限，请联系管理员开通')
      this.$router.push('/login')
      return
    }
    
    // 如果是管理员访问思维导图页面，可以保留，但也可以添加提示
    if (currentUser.isAdmin) {
      // 管理员正在使用思维导图功能
    }
    
    this.initLocalConfig()
    const loading = this.$loading({
      lock: true,
      text: this.$t('other.loading')
    })
    this.show = true
    loading.close()
    this.setBodyDark()
    
    // 检查并恢复刷新前的思维导图ID
    this.checkAndRestoreMindMapId()
    
    // 监听键盘事件来处理快捷键
    window.addEventListener('keydown', this.handleKeyDown)
    
    // 监听退出登录事件
    this.$bus.$on('logout', this.handleLogout)
    
    // 监听显示思维导图历史事件
    this.$bus.$on('show_mind_map_history', this.showMindMapHistory)
    
    // 监听显示标签管理器事件
    this.$bus.$on('showTagManager', this.showTagManager)
  },
  
  mounted() {
    // 添加路由监听来恢复工具栏状态
    this.setupRouteWatcher()
    
    // 组件挂载时检查是否需要恢复工具栏状态
    this.restoreToolbarState()
  },
  methods: {
    ...mapMutations(['setLocalConfig', 'setCurrentMindMapId']),

    // 初始化本地配置
    initLocalConfig() {
      let config = getLocalConfig()
      if (config) {
        this.setLocalConfig({
          ...this.$store.state.localConfig,
          ...config
        })
      }
    },

    // 检查并恢复刷新前的思维导图ID
    checkAndRestoreMindMapId() {
      const refreshId = localStorage.getItem('REFRESH_ID');
      if (refreshId) {
        this.setCurrentMindMapId(refreshId);
        // 清除已使用的REFRESH_ID
        localStorage.removeItem('REFRESH_ID');
      }
    },

    setBodyDark() {
      this.isDark
        ? document.body.classList.add('isDark')
        : document.body.classList.remove('isDark')
    },
    
    // 处理键盘快捷键
    handleKeyDown(event) {
      // 检查是否按下 Ctrl+G (或 Cmd+G on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault() // 阻止默认的Ctrl+G浏览器行为
        // 触发AI创建事件
        this.$bus.$emit('open_ai_create')
      }
      
      // 检查是否按下Ctrl+L (或Cmd+L on Mac) - 打开思维导图对话框
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault() // 阻止默认行为（如浏览器地址栏聚焦）
        this.showMindMapHistory() // 显示思维导图对话框
      }
      
      // 检查是否按下Alt+t - 打开标签管理器
      if (event.altKey && event.key === 't') {
        event.preventDefault() // 阻止默认行为
        this.showTagManager() // 显示标签管理器
      }
      
      // 检查是否按下Shift+Z - 触发左侧边栏展开
      if (event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault() // 阻止默认行为
        this.handleShiftZShortcut() // 处理Shift+Z快捷键
      }
    },
    
    // 显示思维导图历史
    async showMindMapHistory() {
      try {
        // 检查用户是否已登录
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        if (!currentUser) {
          this.$message.error('请先登录')
          this.$router.push('/login')
          return
        }
        
        // 显示对话框
        this.showMindMapDialog = true
      } catch (error) {
        this.$message.error('显示思维导图对话框失败: ' + error.message)
      }
    },
    
    // 显示标签管理器
    showTagManager() {
      // 获取标签管理器组件实例并显示
      const tagManagerRef = this.$refs.tagManager
      if (tagManagerRef && typeof tagManagerRef.show === 'function') {
        tagManagerRef.show()
      }
    },
    
    handleLoadMindMap(mindMap) {
      // 检查当前思维导图是否有未保存的更改
      this.$confirm('当前思维导图可能有未保存的更改，是否继续加载新思维导图？', '确认', {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 用户确认加载新思维导图
        this.$bus.$emit('loadMindMapData', mindMap)
      }).catch(() => {
        // 用户取消操作
        // 用户取消加载思维导图
      })
    },
    
    handleLogout() {
      // 清除用户登录信息
      localStorage.removeItem('currentUser')
      
      // 跳转到登录页面
      this.$router.push('/login')
      
      // 显示成功消息
      this.$message.success('已退出登录')
    },
    
    // 处理Shift+Z快捷键
    handleShiftZShortcut() {
      // 检查左侧边栏当前是否显示
      const isLeftSidebarVisible = this.activeSidebar !== ''
      const toolbarStatus = this.getToolbarStatus()
      
      if (isLeftSidebarVisible) {
        // 如果左侧边栏已经显示，关闭它并恢复到用户偏好的工具栏状态
        this.closeLeftSidebarAndRestoreToolbar()
      } else {
        
        // 如果工具栏当前显示，则隐藏工具栏（为左侧边栏让出空间）
        if (toolbarStatus.current_state) {
          this.hideToolbars()
        }
        
        // 展开左侧边栏
        this.openLeftSidebar()
      }
    },
    
    // 获取工具栏状态
    getToolbarStatus() {
      try {
        const toolbarStatus = localStorage.getItem('TOOLBAR_STATUS')
        
        if (toolbarStatus !== null) {
          const status = JSON.parse(toolbarStatus)
          
          // 兼容旧格式（boolean）和新格式（object）
          if (typeof status === 'boolean') {
            const result = {
              current_state: !status,
              user_state: !status
            }
            return result
          } else if (status && typeof status === 'object') {
            const result = {
              current_state: status.current_state !== undefined ? status.current_state : true,
              user_state: status.user_state !== undefined ? status.user_state : true
            }
            return result
          }
        }
      } catch (error) {
        console.error('❌ [Storage] 解析 TOOLBAR_STATUS 失败:', error)
      }
      
      // 默认状态（工具栏显示）
      const defaultStatus = {
        current_state: true, // true表示工具栏显示
        user_state: true
      }
      return defaultStatus
    },
    
    // 关闭左侧边栏并恢复工具栏状态
    closeLeftSidebarAndRestoreToolbar() {
      
      // 关闭左侧边栏
      this.$store.commit('setActiveSidebar', '')
      
      // 恢复工具栏状态到用户偏好
      this.restoreToolbarState()
    },
    
    // 隐藏工具栏（通过触发Alt+H功能）
    hideToolbars() {
      
      // 获取当前状态，只更新current_state，保持user_state不变
      const toolbarStatus = this.getToolbarStatus()
      this.updateToolbarStatus(false, toolbarStatus.user_state)

      // 更新UI显示
      document.body.classList.add('toolbars-hidden')
    },
    
    // 显示工具栏（通过触发Alt+H功能）
    showToolbars() {
      // 如果工具栏当前是隐藏状态，显示它
      const toolbarStatus = this.getToolbarStatus()
      if (!toolbarStatus.current_state) {
        // 只更新current_state，保持user_state不变
        this.updateToolbarStatus(true, toolbarStatus.user_state)
        
        // 更新UI显示
        document.body.classList.remove('toolbars-hidden')
      }
    },
    
    // 打开左侧边栏
    openLeftSidebar() {
      // 触发左侧边栏显示
      this.$bus.$emit('showLeftSidebar')
    },
    
    // 恢复工具栏状态
    restoreToolbarState() {
      // 检查当前工具栏状态是否与用户偏好一致
      const toolbarStatus = this.getToolbarStatus()
      
      // 如果当前状态与用户偏好状态不一致，则恢复到用户偏好状态
      if (toolbarStatus.current_state !== toolbarStatus.user_state) {
        
        // 直接更新current_state到user_state，不改变user_state
        this.updateToolbarStatus(toolbarStatus.user_state, toolbarStatus.user_state)
        
        // 同步更新UI
        if (toolbarStatus.user_state) {
          document.body.classList.remove('toolbars-hidden')
        } else {
          document.body.classList.add('toolbars-hidden')
        }
      } else {
      }
    },
    
    // 设置工具栏状态
    setToolbarState(isHidden) {
      const currentStatus = this.getToolbarStatus()
      
      // 更新工具栏状态，保持user_state不变
      this.updateToolbarStatus(isHidden, currentStatus.user_state)
      
      // 如果需要改变显示状态，触发Alt+H
      if (currentStatus.current_state !== isHidden) {
        const event = new KeyboardEvent('keydown', {
          key: 'h',
          altKey: true,
          bubbles: true
        })
        window.dispatchEvent(event)
      }
    },
    
    // 更新工具栏状态到localStorage
    updateToolbarStatus(currentState, userState) {
      const status = {
        current_state: currentState,
        user_state: userState
      }
      
      localStorage.setItem('TOOLBAR_STATUS', JSON.stringify(status))
    },
    
    // 设置路由监听器
    setupRouteWatcher() {
      // 监听路由变化，主要关注从思维导图管理页面返回编辑页面的情况
      this.$watch('$route', (newRoute, oldRoute) => {
        // 这里主要是为了兼容未来可能的路由变化
        // 当前架构下页面切换通过组件内部状态控制，不涉及路由变化
        // 但保留此逻辑以备后用
      })
      
      // 监听页面可见性变化
      this.setupVisibilityListener()
      
      // 监听从思维导图管理页面返回的事件
      this.$bus.$on('backFromMindmapManager', this.handleBackFromMindmapManager)
    },
    
    // 设置页面可见性监听器
    setupVisibilityListener() {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // 页面重新显示时检查是否需要恢复工具栏状态
          this.restoreToolbarState()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // 存储引用以便清理
      this._visibilityChangeHandler = handleVisibilityChange
    },
    
    // 处理从思维导图管理页面返回
    handleBackFromMindmapManager() {
      this.restoreToolbarState()
    }
  },
  
  beforeDestroy() {
    // 移除键盘事件监听
    window.removeEventListener('keydown', this.handleKeyDown)
    
    // 移除退出登录事件监听
    this.$bus.$off('logout', this.handleLogout)
    
    // 移除显示思维导图历史事件监听
    this.$bus.$off('show_mind_map_history', this.showMindMapHistory)
    
    // 移除显示标签管理器事件监听
    this.$bus.$off('showTagManager', this.showTagManager)
    
    // 移除页面可见性监听器
    if (this._visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this._visibilityChangeHandler)
    }
    
    // 移除从思维导图管理页面返回的事件监听
    this.$bus.$off('backFromMindmapManager', this.handleBackFromMindmapManager)
  }
}
</script>

<style lang="less">
.container {
}

body {
  &.isDark {
    /* el-button */
    .el-button {
      background-color: #363b3f;
      color: hsla(0, 0%, 100%, 0.9);
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    /* el-input */
    .el-input__inner {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
      color: hsla(0, 0%, 100%, 0.9);
    }

    .el-input.is-disabled .el-input__inner {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
      color: hsla(0, 0%, 100%, 0.3);
    }

    .el-input-group__append,
    .el-input-group__prepend {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    .el-input-group__append button.el-button {
      color: hsla(0, 0%, 100%, 0.9);
    }

    /* el-select */
    .el-select-dropdown {
      background-color: #36393d;
      border-color: hsla(0, 0%, 100%, 0.1);

      .el-select-dropdown__item {
        color: hsla(0, 0%, 100%, 0.6);
      }

      .el-select-dropdown__item.selected {
        color: #409eff;
      }

      .el-select-dropdown__item.hover,
      .el-select-dropdown__item:hover {
        background-color: hsla(0, 0%, 100%, 0.05);
      }
    }

    .el-select .el-input.is-disabled .el-input__inner:hover {
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    /* el-popper*/
    .el-popper {
      background-color: #36393d;
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    .el-popper[x-placement^='bottom'] .popper__arrow {
      background-color: #36393d;
    }

    .el-popper[x-placement^='bottom'] .popper__arrow::after {
      border-bottom-color: #36393d;
    }

    .el-popper[x-placement^='top'] .popper__arrow {
      background-color: #36393d;
    }

    .el-popper[x-placement^='top'] .popper__arrow::after {
      border-top-color: #36393d;
    }

    /* el-tabs */
    .el-tabs__item {
      color: hsla(0, 0%, 100%, 0.6);

      &:hover,
      &.is-active {
        color: #409eff;
      }
    }

    .el-tabs__nav-wrap::after {
      background-color: hsla(0, 0%, 100%, 0.6);
    }

    /* el-slider */
    .el-slider__runway {
      background-color: hsla(0, 0%, 100%, 0.6);
    }

    /* el-radio-group */
    .el-radio-group {
      .el-radio-button__inner {
        background-color: #36393d;
        color: hsla(0, 0%, 100%, 0.6);
      }

      .el-radio-button__orig-radio:checked + .el-radio-button__inner {
        color: #fff;
        background-color: #409eff;
      }
    }

    /* el-dialog */
    .el-dialog {
      background-color: #262a2e;

      .el-dialog__header {
        border-bottom: 1px solid hsla(0, 0%, 100%, 0.1);
      }

      .el-dialog__title {
        color: hsla(0, 0%, 100%, 0.9);
      }

      .el-dialog__body {
        background-color: #262a2e;
      }

      .el-dialog__footer {
        border-top: 1px solid hsla(0, 0%, 100%, 0.1);
      }
    }

    /* el-upload */
    .el-upload__tip {
      color: #999;
    }

    /* 富文本编辑器 */
    .toastui-editor-main-container {
      background-color: #fff;
    }
  }
}
</style>
