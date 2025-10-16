<template>
  <el-dialog
    class="aiSelectionDialog"
    :title="isCurrentUserAdmin ? 'AI服务管理' : '选择AI服务'"
    :visible.sync="visible"
    width="600px"
    append-to-body
  >
    <div class="aiSelectionBox">
      <!-- 管理员视图：管理AI配置 -->
      <div v-if="isCurrentUserAdmin" class="adminView">
        <div class="adminControls">
          <el-button type="primary" @click="showAddConfigDialog">添加AI配置</el-button>
        </div>
        
        <el-table
          :data="availableConfigs"
          style="width: 100%; margin-top: 20px;"
          v-loading="loading"
        >
          <el-table-column prop="providerName" label="提供商" width="150"></el-table-column>
          <el-table-column prop="apiEndpoint" label="接口" width="200"></el-table-column>
          <el-table-column prop="modelName" label="模型" width="150"></el-table-column>
          <el-table-column label="状态" width="100">
            <template slot-scope="scope">
              <el-tag :type="scope.row.isActive ? 'success' : 'info'">
                {{ scope.row.isActive ? '激活' : '未激活' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template slot-scope="scope">
              <el-button
                size="mini"
                type="primary"
                @click="editConfig(scope.row)"
              >编辑</el-button>
              <el-button
                size="mini"
                @click="toggleConfigStatus(scope.row)"
              >
                {{ scope.row.isActive ? '停用' : '激活' }}
              </el-button>
              <el-button
                size="mini"
                type="danger"
                @click="deleteConfig(scope.row)"
              >删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 普通用户视图：选择AI配置（卡片网格方式） -->
      <div v-else class="userView">
        <p class="selectionTip">请<b>双击</b>选择要使用的AI模型：</p>
        <div class="modelGrid" v-if="!loading && availableConfigs.length > 0">
          <div 
            v-for="config in availableConfigs"
            :key="config.id"
            class="modelCard"
            :class="{ selected: selectedConfig === config.id }"
            @dblclick="selectModel(config)"
          >
            <div class="modelInfo">
              <h3 class="providerName">{{ config.provider_name || config.providerName }}</h3>
              <p class="modelName">模型: {{ config.model_name || config.modelName }}</p>
              <el-tag 
                :type="config.is_active || config.isActive ? 'success' : 'info'" 
                size="small"
                class="statusTag"
              >
                {{ (config.is_active || config.isActive) ? '可用' : '不可用' }}
              </el-tag>
            </div>
          </div>
        </div>
        <div v-else-if="!loading" class="noModels">
          <p>暂无可用的AI模型</p>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑配置对话框 -->
    <el-dialog
      :title="editingConfig ? '编辑AI配置' : '添加AI配置'"
      :visible.sync="showConfigDialog"
      width="550px"
      :append-to-body="true"
      v-if="isCurrentUserAdmin"
    >
      <el-form :model="configForm" :rules="configRules" ref="configForm" label-width="100px">
        <el-form-item label="供应商" prop="providerName">
          <el-input v-model="configForm.providerName" placeholder="请输入AI服务提供商名称，如：OpenAI、火山方舟等"></el-input>
        </el-form-item>
        <el-form-item label="API密钥" prop="apiKey">
          <el-input 
            v-model="configForm.apiKey" 
            type="password"
            show-password
            :placeholder="editingConfig ? '留空则不修改API密钥' : '请输入API密钥'"
          ></el-input>
        </el-form-item>
        <el-form-item label="模型名称" prop="modelName">
          <el-input v-model="configForm.modelName" placeholder="请输入模型名称，如：gpt-4, qwen-max等"></el-input>
        </el-form-item>
        <el-form-item label="API接口" prop="apiEndpoint">
          <el-input v-model="configForm.apiEndpoint" placeholder="请输入API接口地址"></el-input>
        </el-form-item>
        <el-form-item label="激活状态">
          <el-switch
            v-model="configForm.isActive"
            active-text="激活"
            inactive-text="未激活"
          ></el-switch>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </div>
    </el-dialog>
    
  </el-dialog>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import { aiConfigApi } from '@/api/supabase-api'

export default {
  name: 'AiSelectionDialog',
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      visible: false,
      availableConfigs: [],
      selectedConfig: '',
      loading: false,
      showConfigDialog: false,
      editingConfig: null,
      configForm: {
        providerName: '',
        apiEndpoint: '',
        modelName: '',
        apiKey: '',
        isActive: true
      },
      configRules: {
        providerName: [
          { required: true, message: '请输入供应商名称', trigger: 'blur' }
        ],
        apiEndpoint: [
          { required: true, message: '请输入API接口', trigger: 'blur' }
        ],
        modelName: [
          { required: true, message: '请输入模型名称', trigger: 'blur' }
        ]
        // apiKey验证将动态处理
      }
    }
  },
  computed: {
    ...mapState(['currentUser', 'aiSystem']),
    isCurrentUserAdmin() {
      return this.currentUser && this.currentUser.isAdmin;
    },
    selectedConfigValid() {
      const config = this.availableConfigs.find(c => c.id === this.selectedConfig);
      return config && (config.is_active || config.isActive);
    }
  },
  watch: {
    value(val) {
      this.visible = val
      if (val) {
        // 延迟加载配置，先显示对话框，再加载数据
        this.$nextTick(() => {
          this.loadAvailableConfigs();
        });
      }
    },
    visible(val) {
      this.$emit('input', val)
    }
  },
  methods: {
    ...mapActions(['fetchAvailableAiConfigs', 'selectAiConfig']),
    
    async loadAvailableConfigs() {
      // 防止重复加载
      if (this.loading) {
        return;
      }
      
      this.loading = true
      try {
        // 检查当前用户
        const currentUser = this.$store.state.currentUser;
        if (!currentUser) {
          this.$message.error('用户未登录');
          this.visible = false;
          return;
        }
        
        const userId = currentUser.id;
        if (!userId) {
          this.$message.error('用户ID无效');
          this.visible = false;
          return;
        }
        
        if (this.isCurrentUserAdmin) {
          // 管理员获取所有配置
          this.availableConfigs = await aiConfigApi.getAllAiProviderConfigs();
        } else {
          // 普通用户获取可用配置 - 先检查store中是否已有缓存数据
          const cachedConfigs = this.$store.getters.availableAiConfigs;
          if (cachedConfigs && cachedConfigs.length > 0) {
            // 如果有缓存数据，先使用缓存，然后在后台更新
            this.availableConfigs = cachedConfigs;
            
            // 在后台获取最新数据，更新UI
            setTimeout(async () => {
              try {
                const updatedConfigs = await this.fetchAvailableAiConfigs(userId);
                this.availableConfigs = updatedConfigs;
                
                // 设置默认选择
                const currentConfigId = this.aiSystem.currentProvider;
                if (currentConfigId && this.availableConfigs.some(c => c.id === currentConfigId)) {
                  this.selectedConfig = currentConfigId;
                } else if (this.availableConfigs.length > 0) {
                  this.selectedConfig = this.availableConfigs[0].id;
                }
              } catch (error) {
                // console.error('更新AI配置失败:', error);
              }
            }, 100); // 短暂延迟以避免阻塞UI
          } else {
            // 没有缓存数据，正常加载
            this.availableConfigs = await this.fetchAvailableAiConfigs(userId);
            
            // 设置默认选择
            const currentConfigId = this.aiSystem.currentProvider;
            if (currentConfigId && this.availableConfigs.some(c => c.id === currentConfigId)) {
              this.selectedConfig = currentConfigId;
            } else if (this.availableConfigs.length > 0) {
              this.selectedConfig = this.availableConfigs[0].id;
            }
          }
        }
      } catch (error) {
        // console.error('加载AI配置失败:', error);
        this.$message.error('加载AI配置失败: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    
    async handleConfirm() {
      if (!this.selectedConfig) {
        this.$message.warning('请选择一个AI配置');
        return;
      }
      
      if (!this.selectedConfigValid) {
        this.$message.warning('所选配置当前不可用');
        return;
      }
      
      try {
        await this.selectAiConfig({
          userId: this.currentUser.id,
          configId: this.selectedConfig
        });
        this.$message.success('AI配置选择成功！');
        this.visible = false;
      } catch (error) {
        this.$message.error('选择AI配置失败: ' + error.message);
      }
    },
    
    handleCancel() {
      this.visible = false;
    },
    
    onConfigChange(value) {
      // 配置改变时的处理
    },
    
    showAddConfigDialog() {
      this.editingConfig = null;
      this.configForm = {
        providerName: '',
        apiEndpoint: '',
        modelName: '',
        apiKey: '',
        isActive: true
      };
      this.showConfigDialog = true;
    },
    
    editConfig(config) {
      this.editingConfig = config;
      this.configForm = {
        providerName: config.provider_name || config.providerName,
        apiEndpoint: config.api_endpoint || config.apiEndpoint,
        modelName: config.model_name || config.modelName,
        apiKey: '', // 不显示原有密钥
        isActive: config.is_active !== undefined ? config.is_active : config.isActive
      };
      this.showConfigDialog = true;
    },
    
    async toggleConfigStatus(config) {
      try {
        const newStatus = !(config.is_active !== undefined ? config.is_active : config.isActive);
        
        // 使用API调用更新状态
        const configData = {
          ...config,
          isActive: newStatus,
          apiEndpoint: config.api_endpoint || config.apiEndpoint,
          providerName: config.provider_name || config.providerName,
          modelName: config.model_name || config.modelName,
          apiKey: '' // 不更新密钥
        };
        
        await aiConfigApi.updateAiProviderConfig(config.id, configData);
        
        // 更新本地列表
        const index = this.availableConfigs.findIndex(c => c.id === config.id);
        if (index !== -1) {
          if (config.is_active !== undefined) {
            this.availableConfigs[index].is_active = newStatus;
          } else {
            this.availableConfigs[index].isActive = newStatus;
          }
        }
        
        this.$message.success(`配置已${newStatus ? '激活' : '停用'}`);
      } catch (error) {
        this.$message.error('更新配置状态失败: ' + error.message);
      }
    },
    
    async deleteConfig(config) {
      this.$confirm(`确定要删除 "${config.provider_name || config.providerName}" 配置吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await aiConfigApi.deleteAiProviderConfig(config.id);
          
          // 从本地列表中移除
          this.availableConfigs = this.availableConfigs.filter(c => c.id !== config.id);
          
          this.$message.success('配置删除成功');
        } catch (error) {
          this.$message.error('删除配置失败: ' + error.message);
        }
      }).catch(() => {
        // 用户取消删除
      });
    },
    
    selectModel(config) {
      if (!(config.is_active || config.isActive)) {
        this.$message.warning('该模型当前不可用');
        return;
      }
      
      this.selectedConfig = config.id;
      this.handleConfirm(); // 自动确认选择
    },
    
    async saveConfig() {
      try {
        // 手动验证API密钥（仅在新增或编辑时提供了密钥的情况下）
        if (!this.editingConfig && !this.configForm.apiKey) {
          // 新增时必须提供API密钥
          this.$message.error('请输入API密钥');
          return;
        }
        
        const configData = {
          providerName: this.configForm.providerName,
          apiEndpoint: this.configForm.apiEndpoint,
          modelName: this.configForm.modelName,
          isActive: this.configForm.isActive
        };
        
        if (this.editingConfig) {
          // 更新现有配置
          if (this.configForm.apiKey) {
            // 如果提供了新密钥，则更新
            configData.apiKey = this.configForm.apiKey;
          }
          
          await aiConfigApi.updateAiProviderConfig(this.editingConfig.id, configData);
          this.$message.success('配置更新成功');
        } else {
          // 创建新配置
          configData.apiKey = this.configForm.apiKey;
          configData.createdBy = this.currentUser.id;
          
          await aiConfigApi.createAiProviderConfig(configData);
          this.$message.success('配置添加成功');
        }
        
        this.showConfigDialog = false;
        this.loadAvailableConfigs(); // 重新加载配置列表
      } catch (error) {
        if (error.message && error.message.includes('ValidationError')) {
          this.$message.error('请检查输入信息');
        } else {
          this.$message.error('保存配置失败: ' + error.message);
        }
      }
    }
  }
}
</script>

<style lang="less" scoped>
.aiSelectionDialog {
  /deep/ .el-dialog__body {
    padding: 20px;
  }

  .adminControls {
    margin-bottom: 20px;
  }

  .selectionTip {
    margin-bottom: 20px;
    font-size: 14px;
    color: #606266;
  }

  .configOption {
    width: 100%;
    margin-bottom: 10px;
  }

  .configInfo {
    .configName {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .configDetails {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #909399;

      .modelTag {
        background-color: #f4f4f5;
        padding: 2px 6px;
        border-radius: 3px;
      }

      .statusTag {
        padding: 2px 6px;
        border-radius: 3px;

        &.active {
          background-color: #f0f9ff;
          color: #409eff;
        }
      }
    }
  }
  
  .modelGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    width: 100%;
    box-sizing: border-box;
    
    @media (max-width: 992px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
  
  .modelCard {
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.3s;
    cursor: pointer;
    position: relative;
    background-color: #ffffff;
    box-sizing: border-box;
    min-width: 0; /* 确保flex/grid项目可以缩小 */
    
    &:hover {
      border-color: #409eff;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    }
    
    &.selected {
      border-color: #409eff;
      background-color: #f2f6fc;
    }

    .modelInfo {
      margin-bottom: 12px;
      
      .providerName {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: bold;
        color: #303133;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .modelName {
        margin: 0 0 4px 0;
        font-size: 14px;
        color: #606266;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .statusTag {
        margin-top: 4px;
      }
    }
  }
  
  // 深色主题适配
  body.isDark {
    .aiSelectionDialog {
      /deep/ .el-dialog__body {
        color: hsla(0, 0%, 100%, 0.9);
      }
      
      .selectionTip {
        color: hsla(0, 0%, 100%, 0.7);
        
        b {
          color: #e6a23c; /* 使用醒目的橙色显示"双击" */
        }
      }

      /deep/ .modelCard {
        border-color: hsla(0, 0%, 100%, 0.2) !important;
        background-color: rgba(255, 255, 255, 0.05) !important; /* 调整深色主题下的卡片背景，更加柔和 */
        
        &:hover {
          border-color: #409eff !important;
          background-color: rgba(64, 158, 255, 0.1) !important; /* 调整悬停背景 */
        }
        
        &.selected {
          border-color: #409eff !important;
          background-color: rgba(64, 158, 255, 0.15) !important;
        }
        
        .providerName {
          color: hsla(0, 0%, 100%, 0.9) !important;
        }
        
        .modelName {
          color: hsla(0, 0%, 100%, 0.7) !important;
        }
      }
    }
  }
  
  .noModels {
    text-align: center;
    padding: 40px 0;
    color: #909399;
  }
}

// 深色主题适配
body.isDark {
  .aiSelectionDialog {
    /deep/ .el-dialog__body {
      color: hsla(0, 0%, 100%, 0.9);
    }

    .selectionTip {
      color: hsla(0, 0%, 100%, 0.7);
      
      b {
        color: #e6a23c; /* 使用醒目的橙色显示"双击" */
      }
    }

    .configDetails {
      color: hsla(0, 0%, 100%, 0.5) !important;
    }
  }
}
</style>
</template>