<template>
  <el-dialog
    ref="saveDialog"
    title="保存思维导图"
    :visible.sync="dialogVisible"
    width="400px"
    :modal="true"
    :modal-append-to-body="false"
    :append-to-body="true"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    v-draggable="draggableOptions"
    :class="{ 'dark-dialog': isDark }"
    custom-class="draggable-save-dialog"
    :z-index="9999"
    @open="handleDialogOpen"
    @opened="handleDialogOpened"
  >
    <el-form
      :model="saveForm"
      :rules="saveRules"
      ref="saveForm"
      label-width="80px"
    >
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="saveForm.title"
          placeholder="请输入思维导图标题"
          ref="titleInput"
          @keyup.enter.native="handleConfirm"
        ></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="saving">
        确定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
  import { mapState } from 'vuex'
  import draggableDirective from 'vue-draggable-directive'
  import { getData } from '@/api'

  export default {
    name: 'DraggableSaveDialog',
    directives: {
      draggable: draggableDirective
    },
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      defaultTitle: {
        type: String,
        default: ''
      }
    },
    data() {
      return {
        saveForm: {
          title: ''
        },
        saveRules: {
          title: [
            { required: true, message: '标题不能为空', trigger: 'blur' },
            {
              min: 1,
              max: 100,
              message: '标题长度在 1 到 100 个字符',
              trigger: 'blur'
            }
          ]
        },
        saving: false,
        draggableOptions: {
          handle: '.el-dialog__header',
          onDragStart: this.handleDragStart,
          onDragEnd: this.handleDragEnd
        }
      }
    },
    computed: {
      ...mapState(['localConfig']),

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
      }
    },
    watch: {
      visible(newVal) {
        if (newVal) {
          this.resetForm()
          this.saveForm.title = this.defaultTitle || ''
          this.$nextTick(() => {
            this.$refs.titleInput && this.$refs.titleInput.focus()
            // 选中全部文本
            this.$refs.titleInput && this.$refs.titleInput.select()
          })
        }
      }
    },
    methods: {
      handleDragStart() {
        document.body.style.userSelect = 'none'
      },

      handleDragEnd() {
        document.body.style.userSelect = 'auto'
      },

      handleDialogOpen() {
        document.body.style.overflow = 'hidden'
      },

      handleDialogOpened() {
        this.$nextTick(() => {
          const dialogEl = this.$refs.saveDialog.$el
          if (dialogEl) {
            dialogEl.style.pointerEvents = 'auto'
          }
        })
      },

      resetForm() {
        this.saveForm = {
          title: ''
        }
        this.saving = false
        if (this.$refs.saveForm) {
          this.$refs.saveForm.clearValidate()
        }
      },

      handleCancel() {
        this.dialogVisible = false
        this.$emit('cancel')
      },

      async handleConfirm() {
        if (this.saving) return

        const valid = await this.$refs.saveForm.validate().catch(() => false)
        if (!valid) return

        this.saving = true

        // 检查用户是否已登录
        const currentUser = JSON.parse(
          localStorage.getItem('currentUser') || 'null'
        )
        if (!currentUser) {
          this.$message.error('请先登录')
          this.$router.push('/login')
          this.saving = false
          return
        }

        // 获取当前思维导图数据
        let data = getData()
        const currentMindMapId = this.$store.state.currentMindMapId
        const saveTitle = this.saveForm.title

        // 立即关闭对话框
        this.dialogVisible = false
        this.saving = false

        // 显示保存中的提示
        this.$message.info('正在保存思维导图...')

        // 在后台异步执行保存操作
        this.performSaveInBackground({
          id: currentMindMapId,
          userId: currentUser.id,
          title: saveTitle,
          content: data
        })
      },

      async performSaveInBackground(saveData) {
        try {
          // 调用store中的保存方法
          const result = await this.$store.dispatch('saveMindMap', saveData)

          // 如果之前没有ID但保存后获得了ID，则更新当前ID
          if (result && result.id) {
            const updatedCurrentMindMapId = this.$store.state.currentMindMapId
            if (!updatedCurrentMindMapId) {
              this.$store.commit('setCurrentMindMapId', result.id)
            }
          }

          this.$message.success('思维导图保存成功')
          this.$emit('success', result)
        } catch (error) {
          console.error('保存思维导图失败:', error)
          this.$message.error('保存思维导图失败: ' + error.message)
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
  /deep/ .draggable-save-dialog {
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
    /deep/ .draggable-save-dialog {
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
</style>
