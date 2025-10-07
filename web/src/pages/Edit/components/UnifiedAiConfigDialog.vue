<template>
  <el-dialog
    class="unifiedAiConfigDialog"
    title="AI配置"
    :visible.sync="visible"
    width="600px"
    append-to-body
    @close="handleClose"
  >
    <div class="aiConfigContent">
      <!-- 提供商选择 -->
      <div class="providerSelection">
        <h3>选择AI提供商</h3>
        <el-radio-group v-model="currentProvider" @change="onProviderChange">
          <el-radio 
            v-for="(provider, key) in providers" 
            :key="key" 
            :label="key"
            class="providerRadio"
          >
            {{ provider.name }}
          </el-radio>
        </el-radio-group>
      </div>

      <!-- 当前提供商配置 -->
      <div class="providerConfig" v-if="selectedProvider">
        <h3>{{ selectedProvider.name }} 配置</h3>
        <el-form :model="config" :rules="rules" ref="configForm" label-width="100px">
          
          <!-- API密钥 -->
          <el-form-item label="API密钥" prop="key">
            <el-input 
              v-model="config.key" 
              show-password 
              placeholder="请输入API密钥"
            ></el-input>
          </el-form-item>

          <!-- 模型配置 -->
          <el-form-item label="模型" prop="model">
            <!-- 预设模型选择 -->
            <el-select 
              v-if="selectedProvider.type === 'select'" 
              v-model="config.model" 
              placeholder="选择模型"
              style="width: 100%"
            >
              <el-option
                v-for="model in selectedProvider.models"
                :key="model"
                :label="model"
                :value="model"
              ></el-option>
            </el-select>
            
            <!-- 自定义模型输入 -->
            <el-input 
              v-else 
              v-model="config.model" 
              placeholder="请输入模型ID (如: ep-xxxxx)"
            ></el-input>
          </el-form-item>

          <!-- 火山方舟特有的端口配置 -->
          <el-form-item 
            v-if="currentProvider === 'huoshan'" 
            label="本地端口" 
            prop="port"
          >
            <el-input-number 
              v-model="config.port" 
              :min="1000" 
              :max="65535"
              placeholder="本地代理端口"
            ></el-input-number>
          </el-form-item>

          <!-- API接口地址 (只读显示) -->
          <el-form-item label="API接口">
            <el-input 
              :value="selectedProvider.api" 
              readonly 
              disabled
            ></el-input>
          </el-form-item>
        </el-form>
      </div>

      <!-- 当前配置状态 -->
      <div class="configStatus" v-if="selectedProvider">
        <el-alert
          :title="getStatusTitle()"
          :type="getStatusType()"
          :description="getStatusDescription()"
          show-icon
          :closable="false"
        ></el-alert>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button @click="testConnection" :loading="testing">测试连接</el-button>
      <el-button type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

export default {
  name: 'UnifiedAiConfigDialog',
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      visible: false,
      currentProvider: 'huoshan',
      config: {
        key: '',
        model: '',
        port: 3456,
        method: 'POST'
      },
      testing: false,
      saving: false,
      rules: {
        key: [
          { required: true, message: '请输入API密钥', trigger: 'blur' }
        ],
        model: [
          { required: true, message: '请选择或输入模型', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapState(['aiSystem']),
    providers() {
      return this.aiSystem.providers
    },
    selectedProvider() {
      return this.providers[this.currentProvider]
    }
  },
  watch: {
    value(val) {
      this.visible = val
      if (val) {
        this.initConfig()
      }
    },
    visible(val) {
      this.$emit('input', val)
    }
  },
  methods: {
    ...mapMutations(['setLocalConfig']),
    
    initConfig() {
      // 初始化当前提供商和配置
      this.currentProvider = this.aiSystem.currentProvider
      this.config = { ...this.aiSystem.providers[this.currentProvider].config }
    },

    onProviderChange(provider) {
      // 切换提供商时加载对应配置
      this.config = { ...this.aiSystem.providers[provider].config }
    },

    async testConnection() {
      this.testing = true
      try {
        const provider = this.selectedProvider
        const testUrl = provider.api
        
        // 根据不同提供商进行测试
        const testPayload = {
          model: this.config.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
          stream: false
        }

        const headers = {
          'Authorization': `Bearer ${this.config.key}`,
          'Content-Type': 'application/json'
        }

        const response = await fetch(testUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(testPayload)
        })

        if (response.ok) {
          this.$message.success('连接测试成功！')
        } else {
          const errorText = await response.text()
          throw new Error(`连接失败: ${response.status} - ${errorText}`)
        }
      } catch (error) {
        console.error('连接测试失败:', error)
        this.$message.error(`连接测试失败: ${error.message}`)
      } finally {
        this.testing = false
      }
    },

    saveConfig() {
      this.$refs.configForm.validate((valid) => {
        if (valid) {
          this.saving = true
          
          // 保存配置
          const newAiSystem = {
            ...this.aiSystem,
            currentProvider: this.currentProvider,
            providers: {
              ...this.aiSystem.providers,
              [this.currentProvider]: {
                ...this.aiSystem.providers[this.currentProvider],
                config: { ...this.config }
              }
            }
          }

          this.setLocalConfig({ aiSystem: newAiSystem })
          
          this.$message.success('AI配置保存成功！')
          this.saving = false
          this.handleClose()
        } else {
          this.$message.error('请检查配置项')
        }
      })
    },

    handleClose() {
      this.visible = false
      this.initConfig() // 重置配置
    },

    getStatusTitle() {
      const hasConfig = this.config.key && this.config.model
      return hasConfig ? '配置已完成' : '配置未完成'
    },

    getStatusType() {
      const hasConfig = this.config.key && this.config.model
      return hasConfig ? 'success' : 'warning'
    },

    getStatusDescription() {
      if (!this.config.key) return '请配置API密钥'
      if (!this.config.model) return '请选择或输入模型'
      return `当前配置: ${this.selectedProvider.name} - ${this.config.model}`
    }
  }
}
</script>

<style lang="less" scoped>
.unifiedAiConfigDialog {
  /deep/ .el-dialog__body {
    padding: 20px;
  }

  .aiConfigContent {
    .providerSelection {
      margin-bottom: 30px;
      
      h3 {
        margin: 0 0 15px 0;
        color: #303133;
        font-size: 16px;
      }

      .providerRadio {
        display: block;
        margin-bottom: 10px;
        
        /deep/ .el-radio__label {
          font-size: 14px;
        }
      }
    }

    .providerConfig {
      margin-bottom: 20px;
      
      h3 {
        margin: 0 0 20px 0;
        color: #303133;
        font-size: 16px;
        border-bottom: 1px solid #ebeef5;
        padding-bottom: 10px;
      }
    }

    .configStatus {
      margin-top: 20px;
    }
  }

  .dialog-footer {
    .el-button {
      margin-left: 10px;
    }
  }
}

// 深色主题适配
body.isDark {
  .unifiedAiConfigDialog {
    /deep/ .el-dialog__body {
      color: hsla(0, 0%, 100%, 0.9);
    }

    .aiConfigContent {
      .providerSelection {
        h3 {
          color: hsla(0, 0%, 100%, 0.9);
        }

        .providerRadio {
          /deep/ .el-radio__label {
            color: hsla(0, 0%, 100%, 0.9);
          }
        }
      }

      .providerConfig {
        h3 {
          color: hsla(0, 0%, 100%, 0.9);
          border-bottom-color: hsla(0, 0%, 100%, 0.1);
        }
      }
    }
  }
}
</style>