<template>
  <div class="login-container">
    <div class="login-form">
      <h2 class="title">用户登录</h2>
      <el-form :model="loginForm" :rules="rules" ref="loginForm" label-width="0">
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            prefix-icon="el-icon-user" 
            placeholder="用户名"
          ></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            prefix-icon="el-icon-lock" 
            type="password" 
            placeholder="密码"
            @keyup.enter.native="handleLogin"
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handleLogin" 
            :loading="loading" 
            style="width: 100%"
          >
            登录
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="text" 
            @click="goToRegister" 
            style="width: 100%"
          >
            还没有账号？立即注册
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      loading: false,
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ]
      }
    }
  },
  methods: {
    async handleLogin() {
      const valid = await this.$refs.loginForm.validate().catch(() => false)
      if (!valid) return

      try {
        this.loading = true
        
        // 调试信息
        console.log('Login - Supabase Enabled Status:', this.$store.state.supabaseEnabled);
        console.log('Login - Current Environment Variables:', {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          VUE_APP_SUPABASE_URL: process.env.VUE_APP_SUPABASE_URL,
          VUE_APP_SUPABASE_ENABLED: process.env.VUE_APP_SUPABASE_ENABLED
        });
        
        if (this.$store.state.supabaseEnabled) {
          // 使用Supabase进行登录
          const user = await this.$store.dispatch('loginUser', {
            username: this.loginForm.username,
            password: this.loginForm.password
          })
          
          // 存储用户信息到本地（确保字段名一致）
          const userForStorage = {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            mindMapPermission: user.mindMapPermission,
            createdAt: user.createdAt
          };
          
          localStorage.setItem('currentUser', JSON.stringify(userForStorage))
          
          // 如果用户有邮箱，创建或恢复 Supabase 认证会话
          if (user.email) {
            try {
              // 注意：在实际应用中，应该使用真正的 Supabase Auth
              // 这里只是模拟会话，实际部署时需要正确的认证流程
              console.log('用户登录成功，邮箱:', user.email)
            } catch (authError) {
              console.warn('创建认证会话失败，但本地登录成功:', authError)
            }
          }
          
          if (userForStorage.isAdmin) {
            // 管理员跳转到用户管理界面
            this.$router.push('/user-management')
          } else if (userForStorage.mindMapPermission === 1) {
            // 普通用户有导图权限，跳转到思维导图首页
            this.$router.push('/')
          } else {
            // 普通用户没有导图权限，显示提示信息
            this.$message.warning('您的导图权限尚未开通，请联系管理员设置权限')
            return
          }
          
          this.$message.success(`登录成功，欢迎 ${userForStorage.username}`)
        } else {
          // 使用本地存储进行登录（当前实现）
          const user = this.$store.state.users.find(u => 
            u.username === this.loginForm.username && 
            u.password === this.loginForm.password
          )
          
          if (user) {
            // 存储用户信息到本地
            localStorage.setItem('currentUser', JSON.stringify(user))
            
            if (user.isAdmin) {
              // 管理员跳转到用户管理界面
              this.$router.push('/user-management')
            } else if (user.mindMapPermission === 1) {
              // 普通用户有导图权限，跳转到思维导图首页
              this.$router.push('/')
            } else {
              // 普通用户没有导图权限，显示提示信息
              this.$message.warning('您的导图权限尚未开通，请联系管理员设置权限')
              // 可以选择留在登录页面或跳转到其他页面
              // 这里我们保持在当前页面，用户可以重新登录
              return
            }
            
            this.$message.success(`登录成功，欢迎 ${user.username}`)
          } else {
            this.$message.error('用户名或密码错误')
          }
        }
      } catch (error) {
        console.error('登录错误:', error)
        this.$message.error('登录失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },
    goToRegister() {
      this.$router.push('/register')
    }
  }
}
</script>

<style lang="less" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    top: -50%;
    left: -50%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
    animation: rotate 20s linear infinite;
  }
  
  .login-form {
    width: 400px;
    padding: 40px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
    position: relative;
    z-index: 1;
    
    .title {
      text-align: center;
      margin-bottom: 30px;
      color: #333;
      font-size: 24px;
      font-weight: 600;
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>