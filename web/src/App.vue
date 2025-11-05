<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { userApi } from '@/api/supabase-api'

export default {
  name: 'App',
  async created() {
    await this.initializeAuth()
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
</style>
