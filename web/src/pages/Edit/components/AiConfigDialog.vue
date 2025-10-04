<template>
  <el-dialog
    class="aiConfigDialog"
    :title="$t('ai.AIConfiguration')"
    :visible.sync="aiConfigDialogVisible"
    width="550px"
    append-to-body
  >
    <div class="aiConfigBox">
      <el-form
        :model="ruleForm"
        :rules="rules"
        ref="ruleFormRef"
        label-width="100px"
      >
        <p class="title">{{ $t('ai.VolcanoArkLargeModelConfiguration') }}</p>
        <p class="desc">
          {{ $t('ai.configTip') }}<a href="https://mp.weixin.qq.com/s/JNb7PH4sCjWzIZ9G8wStGQ" target="_blank">{{ $t('ai.course') }}</a
          >。
        </p>
        <el-form-item label="API Key" prop="key">
          <el-input v-model="ruleForm.key"></el-input>
        </el-form-item>
        <el-form-item :label="$t('ai.inferenceAccessPoint')" prop="model">
          <el-input v-model="ruleForm.model"></el-input>
        </el-form-item>
        <!-- <el-form-item label="接口" prop="api">
          <el-input v-model="ruleForm.api"></el-input>
        </el-form-item>
        <el-form-item label="请求方式" prop="method">
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
        api: '',
        key: '',
        model: '',
        port: '',
        method: ''
      },
      rules: {
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
            message: this.$t('ai.modelValidateTip'),
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
      }
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
      this.aiConfigDialogVisible = val
    },
    aiConfigDialogVisible(val, oldVal) {
      if (!val && oldVal) {
        this.close()
      }
    }
  },
  created() {
    this.initFormData()
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
