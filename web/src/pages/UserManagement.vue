<template>
  <div class="user-management-container">
    <div class="header">
      <h1>用户管理</h1>
      <div class="header-actions">
        <el-select 
          v-model="supabaseEnabled" 
          @change="toggleSupabaseMode" 
          size="small"
          style="width: 150px; margin-right: 15px;"
        >
          <el-option label="本地模式" :value="false"></el-option>
          <el-option label="Supabase模式" :value="true"></el-option>
        </el-select>
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
        <el-table-column prop="displayId" label="ID" width="80"></el-table-column>
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

    </el-dialog>
    
    <!-- 可拖拽的修改密码对话框 -->
    <draggable-password-dialog
      :visible.sync="showChangePasswordDialog"
      :user-id="passwordForm.userId"
      @cancel="handlePasswordDialogCancel"
      @success="handlePasswordDialogSuccess"
    ></draggable-password-dialog>
  </div>
</template>

<script>
import { userApi } from '@/api/supabase-api'
import supabase from '@/utils/supabase'
import DraggablePasswordDialog from '@/components/DraggablePasswordDialog.vue'

export default {
  name: 'UserManagement',
  components: {
    DraggablePasswordDialog
  },
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
      supabaseEnabled: true, // 默认设置为Supabase模式
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
    // 从store获取Supabase启用状态，默认设置为true
    this.supabaseEnabled = this.$store.state.supabaseEnabled !== false;
    this.loadUsers();
    console.log('UserManagement - Supabase Enabled:', this.supabaseEnabled);
  },
  methods: {
    async loadUsers() {
      if (this.$store.state.supabaseEnabled) {
        // 使用Supabase获取所有用户
        try {
          // 从Supabase获取所有用户
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) {
            // console.error('获取用户列表失败:', error)
            this.$message.error('获取用户列表失败: ' + error.message)
            // 回退到本地存储
            this.users = [...this.$store.state.users].sort((a, b) => b.id - a.id)
          } else {
            // 转换字段名以匹配前端期望的格式，并添加显示ID
            this.users = users.map((user, index) => ({
              displayId: index + 1, // 显示ID为递增序号
              id: user.id,
              username: user.username,
              email: user.email,
              isAdmin: user.is_admin,
              mindMapPermission: user.mind_map_permission,
              createdAt: user.created_at
            })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          }
        } catch (error) {
          // console.error('获取用户列表异常:', error)
          this.$message.error('获取用户列表异常: ' + error.message)
          // 回退到本地存储
          this.users = [...this.$store.state.users].sort((a, b) => b.id - a.id)
        }
      } else {
        // 从store获取用户列表（本地存储）
        this.users = [...this.$store.state.users].sort((a, b) => b.id - a.id)
      }
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
    
    async toggleMindMapPermission(user) {
      console.log('Toggle Mind Map Permission:', { user, currentPermission: user.mindMapPermission });
      
      if (this.$store.state.supabaseEnabled) {
        // 使用Supabase API更新用户权限
        try {
          // 计算新的权限值
          const newPermission = user.mindMapPermission === 1 ? 0 : 1;
          console.log('Updating user permission:', { userId: user.id, oldPermission: user.mindMapPermission, newPermission });
          
          const updatedUser = await userApi.updateMindMapPermission(user.id, newPermission)
          console.log('Updated user result:', updatedUser);
          this.$message.success(`用户 ${user.username} 导图权限已更新`)
          this.loadUsers() // 重新加载用户列表
        } catch (error) {
          // console.error('更新用户权限失败:', error)
          this.$message.error('更新用户权限失败: ' + error.message)
        }
      } else {
        // 使用本地存储更新用户权限
        const newPermission = user.mindMapPermission === 1 ? 0 : 1;
        console.log('Updating local user permission:', { userId: user.id, oldPermission: user.mindMapPermission, newPermission });
        
        this.$store.commit('updateUserMindMapPermission', {
          userId: user.id,
          mindMapPermission: newPermission
        })
        
        const permissionText = newPermission === 1 ? '设置' : '取消';
        this.$message.success(`用户 ${user.username} 导图权限已${permissionText}`);
        this.loadUsers() // 重新加载用户列表
      }
    },
    async deleteUser(user) {
      if (this.$store.state.supabaseEnabled) {
        // 使用Supabase删除用户
        this.$confirm(`确定要删除用户 "${user.username}" 吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          if (user.isAdmin) {
            // 检查管理员数量
            try {
              const { count, error: countError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('is_admin', true)

              if (countError) {
                this.$message.error('检查管理员数量失败: ' + countError.message)
                return
              }

              if (count <= 1) {
                this.$message.error('不能删除最后一个管理员账号')
                return
              }
            } catch (error) {
              // console.error('检查管理员数量异常:', error)
              this.$message.error('检查管理员数量异常: ' + error.message)
              return
            }
          }

          try {
            const { error } = await supabase
              .from('users')
              .delete()
              .eq('id', user.id)

            if (error) {
              this.$message.error('删除用户失败: ' + error.message)
            } else {
              this.$message.success('用户删除成功')
              this.loadUsers() // 重新加载用户列表
            }
          } catch (error) {
            // console.error('删除用户异常:', error)
            this.$message.error('删除用户异常: ' + error.message)
          }
        }).catch(() => {
          // 取消删除
        })
      } else {
        // 使用本地存储删除用户（当前实现）
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
      }
    },
    
    showChangePasswordDialogForUser(user) {
      this.passwordForm.userId = user.id;
      this.showChangePasswordDialog = true;
    },
    
    handlePasswordDialogCancel() {
      this.showChangePasswordDialog = false;
      this.passwordForm.userId = null;
    },
    
    handlePasswordDialogSuccess() {
      this.showChangePasswordDialog = false;
      this.passwordForm.userId = null;
      this.loadUsers(); // 重新加载用户列表
    },
    goToMindMap() {
      this.$router.push('/')
    },
    logout() {
      localStorage.removeItem('currentUser')
      // 不应该在退出时关闭Supabase，保持全局设置
      // this.$store.dispatch('toggleSupabase', false) // 退出时不应关闭Supabase
      this.$router.push('/login')
      this.$message.success('已退出登录')
    },
    
    toggleSupabaseMode(enabled) {
      this.$store.dispatch('toggleSupabase', enabled)
      if (enabled) {
        this.$message.info('已切换到Supabase模式')
      } else {
        this.$message.info('已切换到本地模式')
      }
      this.loadUsers() // 重新加载用户列表以反映当前模式
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
      align-items: center;
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

// 下拉框样式优化
:deep(.el-select) {
  .el-input__inner {
    border-radius: 4px;
    border-color: #dcdfe6;
    
    &:focus {
      border-color: #409eff;
    }
  }
  
  .el-select-dropdown__item {
    &.selected {
      color: #409eff;
      font-weight: 700;
    }
  }
}
</style>