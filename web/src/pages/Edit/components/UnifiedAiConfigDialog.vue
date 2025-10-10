<template>
  <el-dialog
    class="unifiedAiConfigDialog"
    title="AI大模型配置"
    :visible.sync="visible"
    width="600px"
    append-to-body
    @close="handleClose"
  >
    <div class="aiConfigContent">
      <!-- 当前提供商配置 -->
      <div class="providerConfig">
        <el-form :model="config" :rules="rules" ref="configForm" label-width="100px">

          <!-- 供应商名称 -->
          <el-form-item label="供应商" prop="providerName">
            <el-input 
              v-model="config.providerName" 
              placeholder="请输入AI服务提供商名称，如：OpenAI、火山方舟等"
            ></el-input>
          </el-form-item>
          
          <!-- API密钥 -->
          <el-form-item label="API密钥" prop="key">
            <el-input 
              v-model="config.key" 
              show-password 
              placeholder="请输入API密钥"
            ></el-input>
          </el-form-item>

          <!-- 模型配置 -->
          <el-form-item label="模型名称" prop="model">
            <!-- 统一使用文本输入框 -->
            <el-input 
              v-model="config.model" 
              placeholder="请输入模型名称，如：gpt-4, qwen-max等"
            ></el-input>
          </el-form-item>

          <!-- API接口地址 (可编辑) -->
          <el-form-item label="API接口" prop="api">
            <el-input 
              v-model="config.api" 
              placeholder="请输入API接口地址"
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

    <!-- 添加模型对话框 -->
    <el-dialog
      title="添加模型"
      :visible.sync="addModelDialogVisible"
      width="400px"
      append-to-body
    >
      <el-form>
        <el-form-item label="模型名称">
          <el-input 
            v-model="newModelName" 
            placeholder="请输入模型名称，如: gpt-4-turbo"
            @keyup.enter.native="addModel"
          ></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="addModelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addModel">添加</el-button>
      </div>
    </el-dialog>

    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button @click="testConnection" :loading="testing">测试连接</el-button>
      <el-button type="primary" @click="saveConfig" :loading="saving">保存配置</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex'
import { aiConfigApi } from '@/api/supabase-api'

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
      existingConfigId: null, // 用于标识是否为编辑现有配置
      config: {
        providerName: '',
        key: '',
        model: '',
        api: '',
        method: 'POST'
      },
      testing: false,
      saving: false,
      addModelDialogVisible: false, // 已移除添加模型功能
      newModelName: '', // 已移除添加模型功能
      rules: {
        providerName: [
          { required: true, message: '请输入供应商名称', trigger: 'blur' }
        ],
        key: [
          { required: true, message: '请输入API密钥', trigger: 'blur' }
        ],
        model: [
          { required: true, message: '请输入模型名称', trigger: 'blur' }
        ],
        api: [
          { required: true, message: '请输入API接口', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapState(['aiSystem']),
    // 为了向后兼容，提供当前提供商配置
    selectedProvider() {
      const currentProviderKey = this.aiSystem.currentProvider
      return this.aiSystem.providers[currentProviderKey] || {}
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
    ...mapActions(['selectAiConfig']),
    
    async initConfig() {
      // 首先尝试从数据库获取配置列表
      try {
        const currentUser = this.$store.state.currentUser;
        console.log('initConfig - 当前用户信息:', currentUser);
        
        if (currentUser && currentUser.isAdmin) {
          const configs = await aiConfigApi.getAllAiProviderConfigs();
          if (configs && configs.length > 0) {
            // 如果数据库中有配置，使用第一个配置进行初始化
            const latestConfig = configs[0]; // 使用最新的配置
            this.existingConfigId = latestConfig.id;
            this.config = {
              providerName: latestConfig.providerName || '',
              key: '', // 不从数据库加载密钥，出于安全考虑
              model: latestConfig.modelName || '',
              api: latestConfig.apiEndpoint || '',
              method: 'POST'
            };
            return;
          }
        }
      } catch (error) {
        console.error('获取数据库配置失败:', error);
      }
      
      // 如果没有从数据库获取到配置，使用本地配置
      const currentProviderKey = this.aiSystem.currentProvider
      const currentProvider = this.aiSystem.providers[currentProviderKey] || {}
      const config = currentProvider.config || {}
      
      this.config = {
        providerName: currentProvider.name || '',
        key: config.key || '',
        model: config.model || '',
        api: currentProvider.api || config.api || '',
        method: config.method || 'POST'
      }
    },

    async testConnection() {
      this.testing = true
      try {
        // 使用配置中的API接口进行测试
        const testUrl = this.config.api
        
        // 进行测试
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



    async saveConfig() {
      this.$refs.configForm.validate(async (valid) => {
        if (valid) {
          this.saving = true
          try {
            // 获取当前用户信息并进行调试
            const currentUser = this.$store.state.currentUser;
            console.log('SaveConfig - 当前用户信息:', currentUser);
            
            if (!currentUser) {
              this.$message.error('请先登录');
              return;
            }
            
            // 检查用户是否为管理员
            if (!currentUser.isAdmin) {
              this.$message.error('只有管理员可以配置AI服务');
              return;
            }
            
            const userId = currentUser.id;
            if (!userId) {
              this.$message.error('用户ID缺失');
              return;
            }
            
            // 准备配置数据
            const configData = {
              providerName: this.config.providerName,
              apiEndpoint: this.config.api,
              modelName: this.config.model,
              apiKey: this.config.key,
              isActive: true,
              createdBy: userId
            };
            
            // 保存到数据库
            let result;
            if (this.existingConfigId) {
              // 如果是编辑现有配置
              result = await aiConfigApi.updateAiProviderConfig(this.existingConfigId, configData);
            } else {
              // 如果是新增配置
              result = await aiConfigApi.createAiProviderConfig(configData);
            }
            
            this.$message.success('AI配置保存成功！');
            
            // 对于新保存的配置，更新本地AI系统以包含此配置
            const configId = result.id;
            const newAiSystem = {
              ...this.aiSystem,
              providers: {
                ...this.aiSystem.providers,
                [configId]: {
                  name: this.config.providerName,
                  api: this.config.api,
                  type: 'custom',
                  config: { 
                    model: this.config.model, // 注意：不存储密钥到本地
                    method: this.config.method
                  }
                }
              }
            };

            this.setLocalConfig({ aiSystem: newAiSystem });
            
            // 尝试选择该配置作为当前配置（仅对管理员）
            if (currentUser.isAdmin) {
              try {
                await this.selectAiConfig({
                  userId: userId,
                  configId: configId
                });
                this.$message.success('已设置为当前AI配置！');
              } catch (selectError) {
                console.error('设置当前AI配置失败:', selectError);
              }
            }
            
            this.saving = false;
            this.handleClose();
          } catch (error) {
            console.error('保存AI配置失败:', error);
            this.$message.error('保存AI配置失败: ' + error.message);
            this.saving = false;
          }
        } else {
          this.$message.error('请检查配置项');
        }
      });
    },

    handleClose() {
      this.visible = false
      this.initConfig() // 重置配置
    },

    getStatusTitle() {
      const hasConfig = this.config.key && this.config.model && this.config.api
      return hasConfig ? '配置已完成' : '配置未完成'
    },

    getStatusType() {
      const hasConfig = this.config.key && this.config.model && this.config.api
      return hasConfig ? 'success' : 'warning'
    },

    getStatusDescription() {
      if (!this.config.providerName) return '请配置供应商名称'
      if (!this.config.key) return '请配置API密钥'
      if (!this.config.model) return '请配置模型名称'
      if (!this.config.api) return '请配置API接口'
      return `当前配置: ${this.config.providerName} - ${this.config.model}`
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