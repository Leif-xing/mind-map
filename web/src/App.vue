<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { userApi } from '@/api/supabase-api'

export default {
  name: 'App',
  data() {
    return {
      isToolbarHidden: false // 用于跟踪工具栏是否被隐藏
    }
  },
  async created() {
    await this.initializeAuth()
    // 从localStorage中初始化工具栏状态
    this.initializeToolbarStatus()
    // 添加键盘事件监听器
    window.addEventListener('keydown', this.handleKeyDown)
  },
  beforeDestroy() {
    // 移除键盘事件监听器
    window.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    async initializeAuth() {
      try {
        if (this.$store.state.supabaseEnabled) {
          // 当启用 Supabase 时，验证本地存储的用户信息是否仍然有效
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
          
          if (currentUser) {
            try {

              // 验证用户是否仍然存在于 Supabase 数据库中
              
              if (currentUser.id) {
                // 验证用户是否仍然存在且有效
                // 如果有邮箱，优先使用邮箱验证；否则仅使用ID验证
                let userInfo;
                if (currentUser.email) {
                  userInfo = await userApi.validateUser(currentUser.id, currentUser.email)
                } else {
                  // 仅使用ID验证
                  userInfo = await userApi.validateUserById(currentUser.id)
                }
                
                // 检查用户权限是否仍然有效
                if (userInfo && userInfo.mindMapPermission === 1) {
                  // 更新本地存储以确保信息同步
                  localStorage.setItem('currentUser', JSON.stringify(userInfo))
                  // 将用户信息恢复到 Vuex store
                  this.$store.commit('setCurrentUser', userInfo)
                } else {
                  // 用户权限已被禁用或用户不存在
                  localStorage.removeItem('currentUser')
                }
              } else {
                // 缺少必要的用户ID，清除登录状态
                localStorage.removeItem('currentUser')
              }
            } catch (fetchError) {
              // 用户不存在或验证失败，清除登录状态
              localStorage.removeItem('currentUser')
            }
          } else {
            // 确保 Vuex store 中的 currentUser 也是 null
            this.$store.commit('setCurrentUser', null)
          }
        } else {
          // 使用本地存储时，验证用户是否仍然存在于本地用户列表中
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
          
          if (currentUser) {
            const userExists = this.$store.state.users.find(u => 
              u.id === currentUser.id && u.username === currentUser.username
            )
            
            if (!userExists) {
              // 用户不存在了，清除登录状态
              localStorage.removeItem('currentUser')
            } else if (userExists.mindMapPermission !== 1) {
              // 用户权限已被禁用
              localStorage.removeItem('currentUser')
            } else {
              // 将用户信息恢复到 Vuex store
              this.$store.commit('setCurrentUser', userExists)
            }
          }
        }
      } catch (error) {
        // console.error('初始化认证状态失败:', error)
        localStorage.removeItem('currentUser')
      }
    },
    
    // 初始化工具栏状态
    initializeToolbarStatus() {
      try {
        const toolbarStatus = localStorage.getItem('TOOLBAR_STATUS')
        if (toolbarStatus !== null) {
          const status = JSON.parse(toolbarStatus)
          
          // 兼容旧格式（boolean）和新格式（object）
          if (typeof status === 'boolean') {
            // 旧格式，转换为新格式
            this.isToolbarHidden = !status
            this.updateToolbarStatus(!status, !status)
          } else if (status && typeof status === 'object') {
            // 新格式  
            this.isToolbarHidden = !status.current_state
          } else {
            // 无效格式，使用默认值
            this.isToolbarHidden = false
            this.updateToolbarStatus(false, false)
          }
          
          // 根据存储的状态更新body类
          if (this.isToolbarHidden) {
            document.body.classList.add('toolbars-hidden')
          } else {
            document.body.classList.remove('toolbars-hidden')
          }
        } else {
          // 没有存储的状态，使用默认值
          this.isToolbarHidden = false
          this.updateToolbarStatus(true, true)
        }
      } catch (error) {
        // 如果解析失败，使用默认值
        this.isToolbarHidden = false
        this.updateToolbarStatus(true, true)
      }
    },
    
    // 处理键盘快捷键
    handleKeyDown(event) {
      // 检查是否按下 Alt+H 键
      if (event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault() // 阻止默认行为
        this.toggleToolbars() // 切换工具栏显示/隐藏
      }
    },
    
    // 切换工具栏显示/隐藏
    toggleToolbars() {
      // 获取当前状态
      const toolbarStatus = this.getToolbarStatus()
      
      // 根据 current_state 来决定切换方向
      const newState = !toolbarStatus.current_state
      
      this.isToolbarHidden = !newState
      
      // 更新 body 类，这样可以通过 CSS 来隐藏工具栏
      if (this.isToolbarHidden) {
        document.body.classList.add('toolbars-hidden')
      } else {
        document.body.classList.remove('toolbars-hidden')
      }
      
      // 更新工具栏状态（current_state和user_state都更新为新状态）
      this.updateToolbarStatus(newState, newState)
    },
    
    // 更新工具栏状态到localStorage
    updateToolbarStatus(currentState, userState) {
      const status = {
        current_state: currentState,
        user_state: userState
      }
      localStorage.setItem('TOOLBAR_STATUS', JSON.stringify(status))
    },
    
    // 获取工具栏状态
    getToolbarStatus() {
      try {
        const toolbarStatus = localStorage.getItem('TOOLBAR_STATUS')
        if (toolbarStatus !== null) {
          const status = JSON.parse(toolbarStatus)
          
          // 兼容旧格式
          if (typeof status === 'boolean') {
            return {
              current_state: !status,
              user_state: !status
            }
          } else if (status && typeof status === 'object') {
            return {
              current_state: status.current_state !== undefined ? status.current_state : true,
              user_state: status.user_state !== undefined ? status.user_state : true
            }
          }
        }
      } catch (error) {
        // 解析失败
      }
      
      // 默认状态
      return {
        current_state: true,
        user_state: true
      }
    }
  }
}
</script>

<style lang="less">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
}

// 全局主题变量 - 增强对比度版本
:root {
  /* 亮色主题变量 */
  --bg-color: #ffffff;
  --bg-color-1: #f8f9fa;
  --bg-color-2: #e9ecef;
  --bg-color-3: #dee2e6;
  --text-color: #212529;
  --text-color-2: #495057;
  --text-color-3: #6c757d;
  --border-color: #dee2e6;
  --primary-color: #409EFF;
  --primary-color-light: #5C9EFF;
  --primary-color-dark: #347EFF;
}

.isDark {
  /* 暗色主题变量 - 增强对比度 */
  --bg-color: #121212;
  --bg-color-1: #1e1e1e;
  --bg-color-2: #2a2a2a;
  --bg-color-3: #363636;
  --text-color: #e0e0e0;      /* 提高主要文字对比度 */
  --text-color-2: #b0b0b0;    /* 提高次要文字对比度 */
  --text-color-3: #888888;    /* 提高中等强调文字对比度 */
  --border-color: #404040;    /* 更清晰的边框 */
  --primary-color: #4A9EFF;   /* 调整主色调以增强对比 */
  --primary-color-light: #5AAEFF;
  --primary-color-dark: #3A7EFF;
}

/* 通用暗色模式增强 */
.isDark body,
.isDark html {
  background-color: var(--bg-color);
  color: var(--text-color);
}

/* 暗色模式下特定元素增强 */
.isDark .el-input__inner,
.isDark .el-textarea__inner {
  background-color: var(--bg-color-1);
  border-color: var(--border-color);
  color: var(--text-color);
}

.isDark .el-card {
  background-color: var(--bg-color-1);
  border-color: var(--border-color);
}

.isDark .el-button {
  color: var(--text-color);
}

.isDark .el-button--primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.isDark .el-dialog {
  background-color: var(--bg-color-1);
  border: 1px solid var(--border-color);
}

.isDark .el-dropdown-menu {
  background-color: var(--bg-color-1);
  border: 1px solid var(--border-color);
}

.isDark .el-dropdown-menu__item {
  color: var(--text-color);
}

.isDark .el-dropdown-menu__item:hover {
  background-color: var(--bg-color-2);
  color: var(--primary-color);
}

.customScrollbar {
  &::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 7px;
    background-color: rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  &::-webkit-scrollbar-track {
    box-shadow: none;
    background: transparent;
    display: none;
  }
}

.el-dialog{
  border-radius: 10px;
}

/* 自定义 el-tag--info 样式 */
.el-tag.el-tag--info {
    background-color: #404040 !important;  /* 深灰色背景 */
    border-color: #e9e9eb !important;      /* 边框颜色 */
    color: #62ed61 !important;             /* 绿色文字 */
}

/* 如果需要暗色主题变体 */
.el-tag--dark.el-tag--info {
    background-color: #404040 !important;
    border-color: #e9e9eb !important;
    color: #62ed61 !important;
}

/* 如果需要朴素样式变体 */
.el-tag--plain.el-tag--info {
    background-color: #404040 !important;
    border-color: #62ed61 !important;
    color: #62ed61 !important;
}

/* 工具栏隐藏样式 - 通过 Alt+H 快捷键控制（只隐藏上方工具栏） */
body.toolbars-hidden {
  /* 隐藏上方工具栏 */
  .toolbarContainer .toolbar {
    display: none !important;
  }
}
</style>
