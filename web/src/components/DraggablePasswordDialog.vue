<template>
  <el-dialog
    ref="passwordDialog"
    title="修改密码"
    :visible.sync="dialogVisible"
    width="400px"
    :modal="true"
    :modal-append-to-body="false"
    :append-to-body="true"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    v-draggable="draggableOptions"
    :class="{ 'dark-dialog': isDark }"
    custom-class="draggable-password-dialog"
    :z-index="9999"
    @open="handleDialogOpen"
    @opened="handleDialogOpened"
  >
    <el-form :model="passwordForm" :rules="passwordRules" ref="passwordForm" label-width="100px">
      <el-form-item label="当前密码" prop="currentPassword">
        <el-input 
          v-model="passwordForm.currentPassword" 
          type="password" 
          placeholder="请输入当前密码"
          show-password
        ></el-input>
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input 
          v-model="passwordForm.newPassword" 
          type="password" 
          placeholder="请输入新密码"
          show-password
        ></el-input>
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirmNewPassword">
        <el-input 
          v-model="passwordForm.confirmNewPassword" 
          type="password" 
          placeholder="请再次输入新密码"
          show-password
        ></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState } from 'vuex'
import draggableDirective from 'vue-draggable-directive'

export default {
  name: 'DraggablePasswordDialog',
  directives: {
    draggable: draggableDirective
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    userId: {
      type: [String, Number],
      default: null
    }
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
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
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
      },
      draggableOptions: {
        handle: '.el-dialog__header', // 只能通过标题栏拖拽
        onDragStart: this.handleDragStart,
        onDragEnd: this.handleDragEnd
      }
    }
  },
  computed: {
    ...mapState(['localConfig', 'supabaseEnabled']),
    
    isDark() {
      return this.localConfig.isDark
    },
    
    dialogVisible: {
      get() {
        return this.visible
      },
      set(value) {
        this.$emit('update:visible', value)
      }
    },
    
    currentUser() {
      return this.$store.state.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null')
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.resetForm()
      }
    }
  },
  methods: {
    handleDragStart() {
      // 拖拽开始时的处理
      document.body.style.userSelect = 'none'
    },
    
    handleDragEnd() {
      // 拖拽结束时的处理
      document.body.style.userSelect = 'auto'
    },
    
    handleDialogOpen() {
      // 对话框打开时的处理
      document.body.style.overflow = 'hidden'
    },
    
    handleDialogOpened() {
      // 对话框打开完成后的处理
      // 确保对话框能够接收事件
      this.$nextTick(() => {
        const dialogEl = this.$refs.passwordDialog.$el
        if (dialogEl) {
          dialogEl.style.pointerEvents = 'auto'
        }
      })
    },
    
    resetForm() {
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }
      if (this.$refs.passwordForm) {
        this.$refs.passwordForm.clearValidate()
      }
    },
    
    handleCancel() {
      this.dialogVisible = false
      this.$emit('cancel')
    },
    
    async handleConfirm() {
      const valid = await this.$refs.passwordForm.validate().catch(() => false)
      if (!valid) return

      try {
        if (!this.userId) {
          // 修改当前用户密码
          if (this.currentUser.password !== this.passwordForm.currentPassword) {
            this.$message.error('当前密码错误')
            return
          }
          
          // 更新当前用户密码
          const updatedUser = { ...this.currentUser, password: this.passwordForm.newPassword }
          localStorage.setItem('currentUser', JSON.stringify(updatedUser))
          
          // 更新store中的用户信息
          this.$store.commit('updateUserPassword', {
            userId: this.currentUser.id,
            newPassword: this.passwordForm.newPassword
          })
        } else {
          // 管理员为其他用户修改密码
          if (this.currentUser && this.currentUser.isAdmin) {
            this.$store.commit('updateUserPassword', {
              userId: this.userId,
              newPassword: this.passwordForm.newPassword
            })
          } else {
            this.$message.error('无权限修改其他用户密码')
            return
          }
        }
        
        this.$message.success('密码修改成功')
        this.dialogVisible = false
        this.$emit('success')
      } catch (error) {
        console.error('修改密码错误:', error)
        this.$message.error('密码修改失败')
      }
    }
  }
}
</script>

<style lang="less" scoped>
/* 深色主题样式 */
.dark-dialog {
  /deep/ .el-dialog {
    background-color: #2d2d2d;
    border: 1px solid #555;
    z-index: 9999 !important;
    
    .el-dialog__header {
      background-color: #1f1f1f;
      border-bottom: 1px solid #555;
      cursor: move;
      z-index: 9999 !important;
      
      .el-dialog__title {
        color: #fff;
      }
      
      .el-dialog__headerbtn {
        .el-dialog__close {
          color: #ccc;
          
          &:hover {
            color: #fff;
          }
        }
      }
    }
    
    .el-dialog__body {
      background-color: #2d2d2d;
      z-index: 9999 !important;
      
      .el-form-item__label {
        color: #ccc;
      }
      
      .el-input__inner {
        background-color: #1f1f1f;
        border-color: #555;
        color: #fff;
        
        &:focus {
          border-color: #409eff;
        }
        
        &::placeholder {
          color: #888;
        }
      }
    }
    
    .el-dialog__footer {
      background-color: #2d2d2d;
      border-top: 1px solid #555;
    }
  }
}

/* 拖拽对话框样式 */
/deep/ .draggable-password-dialog {
  z-index: 9999 !important;
  
  .el-dialog {
    z-index: 9999 !important;
  }
  
  .el-dialog__wrapper {
    z-index: 9999 !important;
  }
  
  .el-dialog__header {
    cursor: move;
    user-select: none;
    
    &:hover {
      background-color: #f5f7fa;
    }
  }
}

/* 深色模式下的拖拽样式 */
.dark-dialog {
  /deep/ .draggable-password-dialog {
    z-index: 9999 !important;
    
    .el-dialog {
      z-index: 9999 !important;
    }
    
    .el-dialog__wrapper {
      z-index: 9999 !important;
    }
    
    .el-dialog__header {
      &:hover {
        background-color: #1a1a1a;
      }
    }
  }
}

/* 全局遮罩层样式修复 */
/deep/ .v-modal {
  z-index: 9998 !important;
}
</style>