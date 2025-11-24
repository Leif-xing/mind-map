<template>
  <el-dialog
    class="aiModelSelectionDialog"
    title="选择AI模型"
    :visible.sync="visible"
    width="800px"
    append-to-body
  >
    <div class="modelSelectionContent">
      <div v-if="loading" class="loading">
        <el-skeleton :rows="4" animated />
      </div>
      <div v-else-if="models.length === 0" class="noModels">
        <p>暂无可用的AI模型</p>
      </div>
      <div v-else class="modelGrid">
        <div
          v-for="model in models"
          :key="model.id"
          class="modelCard"
          @dblclick="selectModel(model)"
        >
          <div class="modelInfo">
            <h3 class="providerName">
              {{ model.providerName || model.provider_name }}
            </h3>
            <p class="modelName">
              模型: {{ model.modelName || model.model_name }}
            </p>
            <p class="apiEndpoint" v-if="showApiEndpoint">
              接口: {{ model.apiEndpoint || model.api_endpoint }}
            </p>
            <el-tag
              :type="model.isActive ? 'success' : 'info'"
              size="small"
              class="statusTag"
            >
              {{ model.isActive ? '可用' : '不可用' }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script>
  import { mapActions } from 'vuex'
  import { aiConfigApi } from '@/api/supabase-api'

  export default {
    name: 'AiModelSelectionDialog',
    props: {
      value: {
        type: Boolean,
        default: false
      },
      showApiEndpoint: {
        type: Boolean,
        default: false // 默认不显示API接口，出于安全考虑
      }
    },
    data() {
      return {
        visible: false,
        loading: false,
        models: []
      }
    },
    watch: {
      value(val) {
        this.visible = val
        if (val) {
          this.loadAvailableModels()
        }
      },
      visible(val) {
        this.$emit('input', val)
      }
    },
    methods: {
      ...mapActions(['selectAiConfig']),

      async loadAvailableModels() {
        this.loading = true
        try {
          const userId = this.$store.state.currentUser?.id
          if (!userId) {
            this.$message.error('用户未登录')
            return
          }

          // 获取用户可用的AI配置
          this.models = await aiConfigApi.getUserAvailableAiConfigs(userId)
        } catch (error) {
          console.error('Failed to load AI models:', error)
          this.$message.error('加载AI模型失败: ' + error.message)
          this.models = []
        } finally {
          this.loading = false
        }
      },

      async selectModel(model) {
        try {
          const userId = this.$store.state.currentUser?.id
          if (!userId) {
            this.$message.error('用户未登录')
            return
          }

          if (!model.isActive) {
            this.$message.warning('该模型当前不可用')
            return
          }

          // 选择AI配置
          await this.selectAiConfig({
            userId: userId,
            configId: model.id
          })

          this.$message.success(
            `已选择模型: ${model.providerName || model.provider_name} - ${model.modelName || model.model_name}`
          )
          this.visible = false
          this.$emit('model-selected', model)
        } catch (error) {
          console.error('选择模型失败:', error)
          this.$message.error('选择模型失败: ' + error.message)
        }
      },

      handleCancel() {
        this.visible = false
      }
    }
  }
</script>

<style lang="less" scoped>
  .aiModelSelectionDialog {
    /deep/ .el-dialog__body {
      padding: 20px;
    }

    .modelSelectionContent {
      min-height: 300px;

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
      }

      .noModels {
        text-align: center;
        padding: 40px 0;
        color: #909399;
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

          .apiEndpoint {
            margin: 0 0 8px 0;
            font-size: 12px;
            color: #909399;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .statusTag {
            margin-top: 4px;
          }
        }
      }
    }
  }

  // 深色主题适配
  body.isDark {
    .aiModelSelectionDialog {
      /deep/ .el-dialog__body {
        color: hsla(0, 0%, 100%, 0.9);
      }

      /deep/ .modelCard {
        border-color: hsla(0, 0%, 100%, 0.2) !important;
        background-color: rgba(
          255,
          255,
          255,
          0.05
        ) !important; /* 调整深色主题下的卡片背景，更加柔和 */

        &:hover {
          border-color: #409eff !important;
          background-color: rgba(
            64,
            158,
            255,
            0.1
          ) !important; /* 调整悬停背景 */
        }

        &.selected {
          background-color: rgba(64, 158, 255, 0.15) !important;
        }

        .providerName {
          color: hsla(0, 0%, 100%, 0.9) !important;
        }

        .modelName {
          color: hsla(0, 0%, 100%, 0.7) !important;
        }

        .apiEndpoint {
          color: hsla(0, 0%, 100%, 0.5) !important;
        }
      }
    }
  }
</style>
