<template>
  <el-dialog
    class="aiConfigDialog"
    :title="$t('ai.AIConfiguration')"
    :visible.sync="aiConfigDialogVisible"
    width="550px"
    append-to-body
    custom-class="draggable-ai-config-dialog"
  >
    <div class="aiConfigBox">
      <el-form
        :model="ruleForm"
        :rules="rules"
        ref="ruleFormRef"
        label-width="100px"
      >
        <p class="title">{{ $t('ai.AIProviderConfiguration') }}</p>
        <p class="desc">
          {{ $t('ai.configTip') }}<a href="https://mp.weixin.qq.com/s/JNb7PH4sCjWzIZ9G8wStGQ" target="_blank">{{ $t('ai.course') }}</a
          >。
        </p>
        <el-form-item label="供应商" prop="providerName">
          <el-input v-model="ruleForm.providerName" placeholder="请输入AI服务提供商名称，如：OpenAI、火山方舟等"></el-input>
        </el-form-item>
        <el-form-item label="API Key" prop="key">
          <el-input v-model="ruleForm.key" show-password></el-input>
        </el-form-item>
        <el-form-item label="模型名称" prop="model">
          <el-input v-model="ruleForm.model" placeholder="请输入模型名称，如：gpt-4, qwen-max等"></el-input>
        </el-form-item>
        <el-form-item label="API接口" prop="api">
          <el-input v-model="ruleForm.api" placeholder="请输入API接口地址"></el-input>
        </el-form-item>
        <!-- <el-form-item label="请求方式" prop="method">
          <el-select v-model="ruleForm.method" placeholder="请选择">
            <el-option key="POST" label="POST" value="POST"></el-option>
            <el-option key="GET" label="GET" value="GET"></el-option>
          </el-select>
        </el-form-item> -->
        <!-- <p class="title">{{ $t('ai.mindMappingClientConfiguration') }}</p>
        <el-form-item :label="$t('ai.port')" prop="port">
          <el-input v-model="ruleForm.port"></el-input>
        </el-form-item> -->
      </el-form>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button @click="cancel">{{ $t('ai.cancel') }}</el-button>
      <el-button type="primary" @click="confirm">{{
        $t('ai.confirm')
      }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

export default {
  model: {
    prop: 'visible',
    event: 'change'
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      aiConfigDialogVisible: false,
      ruleForm: {
        providerName: '',
        api: '',
        key: '',
        model: '',
        port: '',
        method: ''
      },
      rules: {
        providerName: [
          {
            required: true,
            message: '请输入供应商名称',
            trigger: 'blur'
          }
        ],
        api: [
          {
            required: true,
            message: this.$t('ai.apiValidateTip'),
            trigger: 'blur'
          }
        ],
        key: [
          {
            required: true,
            message: this.$t('ai.keyValidateTip'),
            trigger: 'blur'
          }
        ],
        model: [
          {
            required: true,
            message: '请输入模型名称',
            trigger: 'blur'
          }
        ],
        port: [
          {
            required: true,
            message: this.$t('ai.portValidateTip'),
            trigger: 'blur'
          }
        ],
        method: [
          {
            required: true,
            message: this.$t('ai.methodValidateTip'),
            trigger: 'blur'
          }
        ]
      },
      // 对话框拖拽相关
      dialogDragData: null
    }
  },
  computed: {
    ...mapState(['aiSystem']),
    // 兼容旧aiConfig：从统一aiSystem映射出当前提供商配置
    aiConfig() {
      const sys = this.aiSystem || {}
      const providers = sys.providers || {}
      const curKey = sys.currentProvider || 'huoshan'
      const provider = providers[curKey] || {}
      const cfg = (provider && provider.config) || {}
      return {
        providerName: provider.name || '', // 映射供应商名称
        api: provider.api || cfg.api || '',
        key: cfg.key || '',
        model: cfg.model || '',
        port: cfg.port || '',
        method: cfg.method || ''
      }
    }
  },
  watch: {
    visible(val) {
      // console.log('👁️ visible prop 变化:', val)
      this.aiConfigDialogVisible = val
      if (val) {
        // 延迟更长时间确保DOM完全渲染
        setTimeout(() => {
          // console.log('🔄 通过 visible prop 触发拖拽初始化')
          this.initDragFunctionality()
        }, 300)
      } else {
        this.cleanupDragEvents()
      }
    },
    aiConfigDialogVisible(val, oldVal) {
      // console.log('👁️ aiConfigDialogVisible 变化:', val)
      if (!val && oldVal) {
        this.close()
      }
      if (val) {
        // 延迟更长时间确保DOM完全渲染
        setTimeout(() => {
          // console.log('🔄 通过 aiConfigDialogVisible 触发拖拽初始化')
          this.initDragFunctionality()
        }, 300)
      } else {
        this.cleanupDragEvents()
      }
    }
  },
  created() {
    this.initFormData()
  },
  mounted() {
    // console.log('🔧 AiConfigDialog 组件已挂载')
  },
  beforeDestroy() {
    this.cleanupDragEvents()
  },
  methods: {
    ...mapMutations(['setLocalConfig']),

    close() {
      this.$emit('change', false)
    },

    initFormData() {
      const src = this.aiConfig || {}
      Object.keys(this.ruleForm).forEach(key => {
        if (src[key] !== undefined && src[key] !== null) {
          this.ruleForm[key] = src[key]
        }
      })
    },

    cancel() {
      this.close()
      this.initFormData()
    },

    confirm() {
      this.$refs.ruleFormRef.validate(valid => {
        if (valid) {
          this.close()
          // 将当前表单写入统一AI系统配置
          const sys = this.aiSystem || {}
          const providers = sys.providers || {}
          const curKey = sys.currentProvider || 'huoshan'
          const provider = providers[curKey] || {}
          const newAiSystem = {
            ...sys,
            providers: {
              ...providers,
              [curKey]: {
                ...provider,
                name: this.ruleForm.providerName || provider.name || this.ruleForm.providerName, // 更新供应商名称
                api: this.ruleForm.api || provider.api || '',
                config: {
                  ...(provider.config || {}),
                  key: this.ruleForm.key,
                  model: this.ruleForm.model,
                  port: this.ruleForm.port || (provider.config && provider.config.port) || '',
                  method: this.ruleForm.method || (provider.config && provider.config.method) || 'POST'
                }
              }
            }
          }
          this.setLocalConfig({ aiSystem: newAiSystem })
          this.$message.success(this.$t('ai.configSaveSuccessTip'))
        }
      })
    },

    // 初始化拖拽功能（参考思维导图对话框实现）
    initDragFunctionality() {
      // console.log('=== 开始初始化AI配置对话框拖拽功能 ===')
      
      // 记录当前页面所有对话框
      const allDialogs = document.querySelectorAll('.el-dialog')
      // console.log('页面总对话框数量:', allDialogs.length)
      
      allDialogs.forEach((dialog, index) => {
        // console.log(`对话框${index}:`, {
        //   className: dialog.className,
        //   display: window.getComputedStyle(dialog).display,
        //   visible: dialog.style.display !== 'none'
        // })
        const title = dialog.querySelector('.el-dialog__title')
        if (title) {
          console.log(`  标题: "${title.textContent}"`)
        }
      })
      
      // 尝试多种选择器
      let dialogEl = document.querySelector('.draggable-ai-config-dialog')
      // console.log('通过custom-class选择器找到:', !!dialogEl)
      
      // 如果custom-class找不到，尝试原始class
      if (!dialogEl) {
        dialogEl = document.querySelector('.aiConfigDialog')
        // console.log('通过原始class选择器找到:', !!dialogEl)
      }
      
      // 如果还是找不到，通过标题查找
      if (!dialogEl) {
        // console.log('尝试通过标题查找...')
        for (let dialog of allDialogs) {
          const title = dialog.querySelector('.el-dialog__title')
          if (title) {
            const titleText = title.textContent
            console.log(`检查标题: "${titleText}"`)
            if (titleText.includes('AI配置') || titleText.includes('AIConfiguration') || titleText.includes('AI Configuration')) {
              dialogEl = dialog
              // console.log('通过标题匹配找到对话框!')
              break
            }
          }
        }
      }
      
      if (!dialogEl) {
        // console.log('❌ AI配置对话框未找到，所有选择器都失败')
        return
      }
      
      // console.log('✅ 找到AI配置对话框:', dialogEl.className)
      
      const headerEl = dialogEl.querySelector('.el-dialog__header')
      if (!headerEl) {
        // console.log('❌ AI配置对话框头部未找到')
        return
      }
      
      // console.log('✅ 找到AI配置对话框头部')
      // console.log('✅ AI配置对话框拖拽初始化成功!')
      
      // 设置拖拽样式
      headerEl.style.cursor = 'move'
      headerEl.style.userSelect = 'none'
      // console.log('✅ 已设置拖拽样式')
      
      // 绑定拖拽事件
      headerEl.addEventListener('mousedown', this.startDrag)
      // console.log('✅ 已绑定拖拽事件')
      
      this.dragHandler = {
        element: headerEl,
        mousedownHandler: this.startDrag
      }
    },

    // 开始拖拽
    startDrag(e) {
      // console.log('🚀 开始拖拽AI配置对话框')
      
      // 尝试多种方式找到对话框
      let dialogEl = document.querySelector('.draggable-ai-config-dialog')
      if (!dialogEl) {
        dialogEl = document.querySelector('.aiConfigDialog')
      }
      if (!dialogEl) {
        // 通过事件目标向上查找
        let target = e.target
        while (target && !target.classList.contains('el-dialog')) {
          target = target.parentElement
        }
        dialogEl = target
      }
      
      if (!dialogEl) {
        // console.log('❌ 拖拽时找不到对话框元素')
        return
      }
      
      // console.log('✅ 拖拽时找到对话框:', dialogEl.className)
      
      // 记录初始位置
      this.dialogDragData = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        initialLeft: dialogEl.getBoundingClientRect().left,
        initialTop: dialogEl.getBoundingClientRect().top
      }
      
      // console.log('📍 初始位置:', {
      //   startX: this.dialogDragData.startX,
      //   startY: this.dialogDragData.startY,
      //   initialLeft: this.dialogDragData.initialLeft,
      //   initialTop: this.dialogDragData.initialTop
      // })
      
      // 绑定移动和结束事件
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.endDrag)
      // console.log('✅ 已绑定mousemove和mouseup事件')
      
      // 添加拖拽样式
      dialogEl.classList.add('dragging')
      // console.log('✅ 已添加dragging样式类')
      
      // 防止选中文本
      e.preventDefault()
    },
    
    // 拖拽中
    onDrag(e) {
      if (!this.dialogDragData || !this.dialogDragData.isDragging) return
      
      // 尝试多种方式找到对话框
      let dialogEl = document.querySelector('.draggable-ai-config-dialog')
      if (!dialogEl) {
        dialogEl = document.querySelector('.aiConfigDialog')
      }
      if (!dialogEl) return
      
      // console.log('🖱️ 拖拽中:', { x: e.clientX, y: e.clientY })
      
      // 计算新位置
      const deltaX = e.clientX - this.dialogDragData.startX
      const deltaY = e.clientY - this.dialogDragData.startY
      
      const newLeft = this.dialogDragData.initialLeft + deltaX
      const newTop = this.dialogDragData.initialTop + deltaY
      
      // 获取窗口尺寸，确保对话框不会拖出视口
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const dialogRect = dialogEl.getBoundingClientRect()
      
      const maxLeft = windowWidth - dialogRect.width
      const maxTop = windowHeight - dialogRect.height
      
      const finalLeft = Math.max(0, Math.min(newLeft, maxLeft))
      const finalTop = Math.max(0, Math.min(newTop, maxTop))
      
      // 应用新位置
      dialogEl.style.position = 'fixed'
      dialogEl.style.left = finalLeft + 'px'
      dialogEl.style.top = finalTop + 'px'
      dialogEl.style.marginLeft = '0'
      dialogEl.style.marginTop = '0'
    },
    
    // 结束拖拽
    endDrag() {
      if (this.dialogDragData) {
        this.dialogDragData.isDragging = false
      }
      
      // 移除拖拽样式
      const dialogEl = document.querySelector('.draggable-ai-config-dialog')
      if (dialogEl) {
        dialogEl.classList.remove('dragging')
      }
      
      // 移除事件监听
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.endDrag)
    },

    // 清理拖拽事件
    cleanupDragEvents() {
      // 移除可能残留的事件监听
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.endDrag)
      
      if (this.dragHandler) {
        this.dragHandler.element.removeEventListener('mousedown', this.dragHandler.mousedownHandler)
        this.dragHandler = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
.aiConfigDialog {
  /deep/ .el-dialog__body {
    padding: 12px 20px;
  }

  .aiConfigBox {
    a {
      color: #409eff;
    }

    .title {
      margin-bottom: 12px;
      font-weight: bold;
    }

    .desc {
      margin-bottom: 12px;
      padding-left: 12px;
      border-left: 5px solid #ccc;
    }
  }
}
</style>
