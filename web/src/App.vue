<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import supabase from '@/utils/supabase'
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
              console.log('验证用户信息 ID:', currentUser.id, '邮箱:', currentUser.email)
              
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
                  console.log('用户会话验证成功:', userInfo.username || userInfo.id)
                } else {
                  // 用户权限已被禁用或用户不存在
                  localStorage.removeItem('currentUser')
                  console.log('用户权限已被禁用或用户不存在，已清除登录状态')
                }
              } else {
                // 缺少必要的用户ID，清除登录状态
                localStorage.removeItem('currentUser')
                console.log('用户信息不完整（缺少ID），已清除登录状态')
              }
            } catch (fetchError) {
              // 用户不存在或验证失败，清除登录状态
              console.log('用户验证失败，可能已被删除或权限变更，已清除登录状态')
              localStorage.removeItem('currentUser')
            }
          } else {
            console.log('未找到本地用户信息')
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
              console.log('本地用户已被删除，已清除登录状态')
            } else if (userExists.mindMapPermission !== 1) {
              // 用户权限已被禁用
              localStorage.removeItem('currentUser')
              console.log('本地用户权限已被禁用，已清除登录状态')
            } else {
              console.log('本地用户会话验证成功:', currentUser.username)
            }
          }
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error)
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
