<template>
  <div class="user-management-container">
    <div class="header">
      <h1>用户管理</h1>
      <div class="header-actions">
        <el-button type="success" @click="goToMindMap">跳转到思维导图</el-button>
        <el-button type="primary" @click="showChangePasswordDialog = true">修改密码</el-button>
        <el-button type="info" @click="logout">退出登录</el-button>
      </div>
    </div>
    
    <div class="content">
      <el-table 
        :data="users" 
        style="width: 100%" 
      >
        <el-table-column prop="id" label="ID" width="80"></el-table-column>
        <el-table-column prop="username" label="用户名"></el-table-column>
        <el-table-column prop="isAdmin" label="管理员" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.isAdmin ? 'success' : 'info'">
              {{ scope.row.isAdmin ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mindMapPermission" label="导图权限" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.mindMapPermission === 1 ? 'success' : 'warning'">
              {{ scope.row.mindMapPermission === 1 ? '可用' : '不可用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="180"></el-table-column>
        <el-table-column label="操作" width="380">
          <template slot-scope="scope">
            <el-button 
              size="mini" 
              type="warning"
              @click="showChangePasswordDialogForUser(scope.row)"
            >
              修改密码
            </el-button>
            <el-button 
              v-if="!scope.row.isAdmin" 
              size="mini" 
              :type="scope.row.isAdmin ? 'info' : 'primary'" 
              @click="toggleAdminStatus(scope.row)"
            >
              {{ scope.row.isAdmin ? '取消管理员' : '设为管理员' }}
            </el-button>
            <el-button 
              size="mini" 
              :type="scope.row.mindMapPermission === 1 ? 'info' : 'success'" 
              @click="toggleMindMapPermission(scope.row)"
            >
              {{ scope.row.mindMapPermission === 1 ? '取消导图权限' : '设置导图权限' }}
            </el-button>
            <el-button 
              size="mini" 
              type="danger" 
              @click="deleteUser(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 修改密码对话框 -->
    <el-dialog
      title="修改密码"
      :visible.sync="showChangePasswordDialog"
      width="400px"
    >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordForm" label-width="100px">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input 
            v-model="passwordForm.currentPassword" 
            type="password" 
            placeholder="请输入当前密码"
          ></el-input>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            v-model="passwordForm.newPassword" 
            type="password" 
            placeholder="请输入新密码"
          ></el-input>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmNewPassword">
          <el-input 
            v-model="passwordForm.confirmNewPassword" 
            type="password" 
            placeholder="请确认新密码"
          ></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="showChangePasswordDialog = false">取消</el-button>
        <el-button type="primary" @click="changePassword">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'UserManagement',
  data() {
    // 验证确认密码
    const validateConfirmPassword = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请再次输入新密码'))
      } else if (value !== this.passwordForm.newPassword) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }

    return {
      users: [],
      showChangePasswordDialog: false,
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
        userId: null // 用于标识是为哪个用户修改密码
      },
      passwordRules: {
        currentPassword: [
          { required: true, message: '请输入当前密码', trigger: 'blur' }
        ],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ],
        confirmNewPassword: [
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      }
    }
  },
  created() {
    this.loadUsers()
  },
  methods: {
    loadUsers() {
      // 从store获取用户列表
      this.users = [...this.$store.state.users].sort((a, b) => b.id - a.id)
    },
    toggleAdminStatus(user) {
      // 切换用户管理员状态
      this.$store.commit('updateUserAdminStatus', {
        userId: user.id,
        isAdmin: !user.isAdmin
      })
      
      this.$message.success(`用户 ${user.username} 管理员权限已${user.isAdmin ? '取消' : '设置'}`)
      this.loadUsers() // 重新加载用户列表
    },
    
    toggleMindMapPermission(user) {
      // 切换用户导图权限
      this.$store.commit('updateUserMindMapPermission', {
        userId: user.id,
        mindMapPermission: user.mindMapPermission === 1 ? 0 : 1
      })
      
      const permissionText = user.mindMapPermission === 1 ? '取消' : '设置';
      this.$message.success(`用户 ${user.username} 导图权限已${permissionText}`);
      this.loadUsers() // 重新加载用户列表
    },
    deleteUser(user) {
      this.$confirm(`确定要删除用户 "${user.username}" 吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        if (user.isAdmin) {
          const adminCount = this.users.filter(u => u.isAdmin).length
          if (adminCount <= 1) {
            this.$message.error('不能删除最后一个管理员账号')
            return
          }
        }
        
        this.$store.commit('deleteUser', user.id)
        this.$message.success('用户删除成功')
        this.loadUsers() // 重新加载用户列表
      }).catch(() => {
        // 取消删除
      })
    },
    toggleMindMapPermission(user) {
      // 切换用户导图权限
      this.$store.commit('updateUserMindMapPermission', {
        userId: user.id,
        mindMapPermission: user.mindMapPermission === 1 ? 0 : 1
      })
      
      const permissionText = user.mindMapPermission === 1 ? '取消' : '设置';
      this.$message.success(`用户 ${user.username} 导图权限已${permissionText}`);
      this.loadUsers() // 重新加载用户列表
    },
    
    showChangePasswordDialogForUser(user) {
      this.passwordForm.userId = user.id;
      this.showChangePasswordDialog = true;
      // 重置表单
      this.passwordForm.currentPassword = '';
      this.passwordForm.newPassword = '';
      this.passwordForm.confirmNewPassword = '';
    },
    async changePassword() {
      const valid = await this.$refs.passwordForm.validate().catch(() => false)
      if (!valid) return

      try {
        // 验证当前用户的密码
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        
        if (!this.passwordForm.userId) {
          // 修改当前用户密码
          if (currentUser.password !== this.passwordForm.currentPassword) {
            this.$message.error('当前密码错误')
            return
          }
          
          // 更新当前用户密码
          const updatedUser = { ...currentUser, password: this.passwordForm.newPassword }
          localStorage.setItem('currentUser', JSON.stringify(updatedUser))
          
          // 更新store中的用户信息
          this.$store.commit('updateUserPassword', {
            userId: currentUser.id,
            newPassword: this.passwordForm.newPassword
          })
        } else {
          // 管理员为其他用户修改密码
          if (currentUser && currentUser.isAdmin) {
            // 管理员无需输入当前密码，直接修改其他用户的密码
            this.$store.commit('updateUserPassword', {
              userId: this.passwordForm.userId,
              newPassword: this.passwordForm.newPassword
            })
          } else {
            this.$message.error('无权限修改其他用户密码')
            return
          }
        }
        
        this.$message.success('密码修改成功')
        this.showChangePasswordDialog = false
      } catch (error) {
        console.error('修改密码错误:', error)
        this.$message.error('密码修改失败')
      }
    },
    goToMindMap() {
      this.$router.push('/')
    },
    logout() {
      localStorage.removeItem('currentUser')
      this.$router.push('/login')
      this.$message.success('已退出登录')
    }
  },

}
</script>

<style lang="less" scoped>
.user-management-container {
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #c3cfe2 100%);
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 20px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    
    h1 {
      margin: 0;
      color: #2c3e50;
      font-size: 24px;
      font-weight: 600;
    }
    
    .header-actions {
      display: flex;
      gap: 10px;
    }
  }
  
  .content {
    background: white;
    padding: 25px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    
    :deep(.el-table) {
      .el-table__header {
        th {
          background-color: #f5f7fa;
          color: #606266;
          border-color: #ebeef5;
        }
      }
      
      .el-table__body {
        tr {
          background-color: #ffffff;
          color: #606266;
          
          &:hover {
            background-color: #f5f7fa;
          }
        }
        
        td {
          border-color: #ebeef5;
          color: #606266;
        }
      }
    }
  }
}
</style>