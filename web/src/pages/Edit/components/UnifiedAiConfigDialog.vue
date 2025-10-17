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
        // 对话框显示时初始化拖拽功能
        this.$nextTick(() => {
          this.initDrag();
        });
      } else {
        // 对话框关闭时清理拖拽事件
        this.cleanupDrag();
      }
    },
    visible(val) {
      this.$emit('input', val)
      if (val) {
        // 对话框显示时初始化拖拽功能
        this.$nextTick(() => {
          this.initDrag();
        });
      } else {
        // 对话框关闭时清理拖拽事件
        this.cleanupDrag();
      }
    }
  },
  mounted() {
    // 组件挂载时不立即初始化拖拽，等对话框显示时再初始化
  },
  
  methods: {
    ...mapMutations(['setLocalConfig']),
    ...mapActions(['selectAiConfig']),
    
    initConfig() {
      // 从当前的AI系统配置加载内容
      const currentProviderKey = this.aiSystem.currentProvider
      const currentProvider = this.aiSystem.providers[currentProviderKey] || {}
      const config = currentProvider.config || {}
      
      // 保留当前配置信息，但不设置existingConfigId以确保新增模式
      this.config = {
        providerName: currentProvider.name || this.config?.providerName || '',
        key: this.config?.key || '', // 保留用户输入的密钥
        model: config.model || this.config?.model || '', // 优先使用当前配置的模型
        api: currentProvider.api || config.api || this.config?.api || '', // 优先使用当前配置的API
        method: config.method || this.config?.method || 'POST'
      }
      
      this.existingConfigId = null; // 确保为新增模式
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
        // console.error('连接测试失败:', error)
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
            // console.log('SaveConfig - 当前用户信息:', currentUser); // 隐私保护：不输出用户信息
            
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
                // console.error('设置当前AI配置失败:', selectError);
              }
            }
            
            // 保存成功后，清空密钥字段，保留其他字段内容以供安全和便利性
            this.config.key = '';
            
            this.saving = false;
            this.handleClose();
          } catch (error) {
            // console.error('保存AI配置失败:', error);
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
      // 不再重置配置，保留输入内容供下次使用
    },
    
    // 初始化拖拽功能
    initDrag() {
      // 获取对话框头部和对话框元素
      this.$nextTick(() => {
        if (this.visible) {
          const dialogHeaderEl = document.querySelector('.unifiedAiConfigDialog .el-dialog__header');
          const dragDom = document.querySelector('.unifiedAiConfigDialog .el-dialog');
          
          if (!dialogHeaderEl || !dragDom) {
            // 如果元素还未渲染，稍后重试
            setTimeout(() => {
              this.initDrag();
            }, 100);
            return;
          }
          
          dialogHeaderEl.style.cursor = 'move';
          
          let startX = 0;
          let startY = 0;
          let lastX = 0;
          let lastY = 0;
          let isDragging = false;
          
          const handleMousedown = (e) => {
            // 只有点击标题栏才触发拖拽
            if (e.target !== dialogHeaderEl && !dialogHeaderEl.contains(e.target)) {
              return;
            }
            
            // 计算鼠标按下时的偏移量
            startX = e.clientX;
            startY = e.clientY;
            isDragging = true;
            
            // 获取当前dialog的位置
            const style = window.getComputedStyle(dragDom);
            // 解析transform属性获取当前位置
            const transform = style.transform || style.webkitTransform || style.mozTransform;
            if (transform && transform !== 'none') {
              const matrix = new DOMMatrixReadOnly(transform);
              lastX = matrix.m41 || 0;
              lastY = matrix.m42 || 0;
            } else {
              lastX = 0;
              lastY = 0;
            }
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseup);
          };
          
          const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const currentX = e.clientX;
            const currentY = e.clientY;
            
            const offsetX = currentX - startX;
            const offsetY = currentY - startY;
            
            dragDom.style.transform = `translate(${lastX + offsetX}px, ${lastY + offsetY}px)`;
            dragDom.style.willChange = 'transform'; // 优化性能
          };
          
          const handleMouseup = () => {
            isDragging = false;
            dragDom.style.willChange = 'auto';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseup);
          };
          
          // 添加事件监听器
          dialogHeaderEl.addEventListener('mousedown', handleMousedown);
          
          // 保存引用，以便后续清理
          this.dragHandler = {
            element: dialogHeaderEl,
            mousedownHandler: handleMousedown
          };
        }
      });
    },
    
    // 清理拖拽事件
    cleanupDrag() {
      if (this.dragHandler) {
        this.dragHandler.element.removeEventListener('mousedown', this.dragHandler.mousedownHandler);
        this.dragHandler = null;
      }
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
  },
  beforeDestroy() {
    // 组件销毁时清理拖拽事件
    this.cleanupDrag();
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