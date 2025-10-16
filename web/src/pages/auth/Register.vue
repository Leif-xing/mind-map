<template>
  <div class="register-container">
    <div class="register-form">
      <h2 class="title">用户注册</h2>
      <el-form :model="registerForm" :rules="rules" ref="registerForm" label-width="0">
        <el-form-item prop="username">
          <el-input 
            v-model="registerForm.username" 
            prefix-icon="el-icon-user" 
            placeholder="用户名（只能包含英文字母或数字）"
          ></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="registerForm.password" 
            prefix-icon="el-icon-lock" 
            type="password" 
            placeholder="密码"
          ></el-input>
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input 
            v-model="registerForm.confirmPassword" 
            prefix-icon="el-icon-lock" 
            type="password" 
            placeholder="确认密码"
            @keyup.enter.native="handleRegister"
          ></el-input>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            @click="handleRegister" 
            :loading="loading" 
            style="width: 100%"
          >
            注册
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button 
            type="text" 
            @click="goToLogin" 
            style="width: 100%"
          >
            已有账号？立即登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Register',
  data() {
    // 自定义验证规则：用户名只能包含英文字母或数字
    const validateUsername = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请输入用户名'))
      } else if (!/^[A-Za-z0-9]+$/.test(value)) {
        callback(new Error('用户名只能包含英文字母或数字'))
      } else {
        callback()
      }
    }

    // 自定义验证规则：确认密码
    const validateConfirmPassword = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请再次输入密码'))
      } else if (value !== this.registerForm.password) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }

    return {
      registerForm: {
        username: '',
        password: '',
        confirmPassword: ''
      },
      loading: false,
      rules: {
        username: [
          { validator: validateUsername, trigger: 'blur' },
          { min: 3, max: 20, message: '用户名长度在3到20个字符之间', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ],
        confirmPassword: [
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      }
    }
  },
  methods: {
    async handleRegister() {
      const valid = await this.$refs.registerForm.validate().catch(() => false)
      if (!valid) return

      try {
        this.loading = true
        
        // 调试信息
        console.log('Supabase Enabled Status:', this.$store.state.supabaseEnabled);
        console.log('Current Environment Variables:', {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          VUE_APP_SUPABASE_URL: process.env.VUE_APP_SUPABASE_URL,
          VUE_APP_SUPABASE_ENABLED: process.env.VUE_APP_SUPABASE_ENABLED
        });
        
        if (this.$store.state.supabaseEnabled) {
          // 使用Supabase进行注册
          const user = await this.$store.dispatch('registerUser', {
            username: this.registerForm.username,
            password: this.registerForm.password
          })
          
          this.$message.info('注册成功，请等待管理员设置权限后使用思维导图功能')
          
          // 跳转到登录页面
          this.$router.push('/login')
        } else {
          // 使用本地存储进行注册（当前实现）
          // 检查用户名是否已存在
          const existingUser = this.$store.state.users.find(u => 
            u.username === this.registerForm.username
          )
          
          if (existingUser) {
            this.$message.error('用户名已存在')
            return
          }
          
          // 创建新用户（普通用户）
          const newUser = {
            username: this.registerForm.username,
            password: this.registerForm.password,
            isAdmin: false, // 注册的用户默认不是管理员
            mindMapPermission: 0, // 导图权限，默认为0（不可用），需管理员设置
            createdAt: new Date().toISOString()
          }
          
          // 将新用户添加到store中的用户数组
          this.$store.commit('addUser', newUser)
          
          // 注册成功后自动登录（存储当前用户信息）
          localStorage.setItem('currentUser', JSON.stringify(newUser))
          
          this.$message.info('注册成功，请等待管理员设置权限后使用思维导图功能')
          
          // 跳转到登录页面
          this.$router.push('/login')
        }
      } catch (error) {
        // console.error('注册错误:', error)
        this.$message.error('注册失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },
    goToLogin() {
      this.$router.push('/login')
    }
  }
}
</script>

<style lang="less" scoped>
.register-container {
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
  
  .register-form {
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