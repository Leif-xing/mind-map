<template>
  <div class="unifiedAiManager">
    <!-- AI配置弹窗（仅管理员） -->
    <UnifiedAiConfigDialog 
      v-model="configDialogVisible"
    ></UnifiedAiConfigDialog>
    
    <!-- AI模型选择弹窗（普通用户） -->
    <AiSelectionDialog
      v-model="selectionDialogVisible"
    ></AiSelectionDialog>
    
    <!-- AI创建弹窗 -->
    <UnifiedAiCreateDialog 
      v-model="createDialogVisible"
      :mindMap="mindMap"
      ref="aiCreateDialog"
    ></UnifiedAiCreateDialog>
    
    <!-- 生成中的停止按钮 - 已禁用 -->
    <!--
    <div v-if="isGenerating" class="generatingTip">
      <el-button 
        type="danger" 
        size="small" 
        @click="stopGenerate"
        icon="el-icon-close"
      >
        停止生成
      </el-button>
    </div>
    -->
  </div>
</template>

<script>
import { mapState } from 'vuex'
import UnifiedAiConfigDialog from './UnifiedAiConfigDialog.vue'
import UnifiedAiCreateDialog from './UnifiedAiCreateDialog.vue'
import AiSelectionDialog from './AiSelectionDialog.vue'

export default {
  name: 'UnifiedAiManager',
  components: {
    UnifiedAiConfigDialog,
    UnifiedAiCreateDialog,
    AiSelectionDialog
  },
  props: {
    mindMap: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      configDialogVisible: false,
      selectionDialogVisible: false,
      createDialogVisible: false,
      isGenerating: false
    }
  },
  computed: {
    ...mapState(['aiSystem', 'currentUser']),
    
    isCurrentUserAdmin() {
      return this.currentUser && this.currentUser.isAdmin;
    }
  },
  mounted() {
    // 监听事件
    this.$bus.$on('open_ai_config', this.openConfig)
    this.$bus.$on('open_ai_create', this.openCreate)
    this.$bus.$on('ai_generating_status', this.onGeneratingStatus)
  },
  beforeDestroy() {
    // 清理事件监听
    this.$bus.$off('open_ai_config', this.openConfig)
    this.$bus.$off('open_ai_create', this.openCreate)
    this.$bus.$off('ai_generating_status', this.onGeneratingStatus)
  },
  methods: {
    openConfig() {
      // 检查用户是否已登录
      if (!this.currentUser) {
        this.$message.error('请先登录');
        // 可以跳转到登录页面，或者不执行任何操作
        return;
      }
      
      if (this.isCurrentUserAdmin) {
        // 管理员打开配置对话框
        this.configDialogVisible = true
      } else {
        // 普通用户打开选择对话框
        this.selectionDialogVisible = true
      }
    },

    openCreate() {
      // 添加调试信息
      // console.log('openCreate - 当前AI系统状态:', this.aiSystem); // 隐私保护：不输出AI系统状态
      // console.log('openCreate - 当前提供商ID:', this.aiSystem.currentProvider); // 隐私保护：不输出提供商ID
      // console.log('openCreate - 当前提供商详细信息:', this.aiSystem.providers[this.aiSystem.currentProvider]); // 隐私保护：不输出提供商详细信息
      
      // 检查是否已配置
      const currentProvider = this.aiSystem.providers[this.aiSystem.currentProvider]
      if (!currentProvider || !currentProvider.config.model) {
        // 检查用户角色，显示不同的提示
        if (this.isCurrentUserAdmin) {
          // 管理员提示配置
          this.$message.warning('请先配置AI接口')
          this.configDialogVisible = true
        } else {
          // 普通用户提示选择AI模型
          this.$confirm('当前还没有选择AI大模型，请先选择AI大模型', '提示', {
            confirmButtonText: '去选择',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            // 打开AI模型选择对话框
            this.selectionDialogVisible = true
          }).catch(() => {
            // 用户取消操作
          });
        }
        return
      }
      
      this.createDialogVisible = true
    },

    onGeneratingStatus(status) {
      this.isGenerating = status
    },

    stopGenerate() {
      if (this.$refs.aiCreateDialog) {
        this.$refs.aiCreateDialog.stopGenerate()
      }
      this.isGenerating = false
    }
  }
}
</script>

<style lang="less" scoped>
.unifiedAiManager {
  .generatingTip {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000;
    max-width: 400px;
    
    /deep/ .el-alert {
      padding: 12px 16px;
      
      .el-alert__content {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
    }
  }
}
</style>