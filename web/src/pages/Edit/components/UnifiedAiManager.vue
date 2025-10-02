<template>
  <div class="unifiedAiManager">
    <!-- AI配置弹窗 -->
    <UnifiedAiConfigDialog 
      v-model="configDialogVisible"
    ></UnifiedAiConfigDialog>
    
    <!-- AI创建弹窗 -->
    <UnifiedAiCreateDialog 
      v-model="createDialogVisible"
      :mindMap="mindMap"
      ref="aiCreateDialog"
    ></UnifiedAiCreateDialog>
    
    <!-- 生成中的停止按钮提示 -->
    <div v-if="isGenerating" class="generatingTip">
      <el-alert
        title="AI正在生成思维导图..."
        type="info"
        :closable="false"
        show-icon
      >
        <template slot="default">
          <span>请耐心等待生成完成</span>
          <el-button 
            type="text" 
            size="mini" 
            @click="stopGenerate"
            style="margin-left: 10px; color: #f56c6c;"
          >
            停止生成
          </el-button>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import UnifiedAiConfigDialog from './UnifiedAiConfigDialog.vue'
import UnifiedAiCreateDialog from './UnifiedAiCreateDialog.vue'

export default {
  name: 'UnifiedAiManager',
  components: {
    UnifiedAiConfigDialog,
    UnifiedAiCreateDialog
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
      createDialogVisible: false,
      isGenerating: false
    }
  },
  computed: {
    ...mapState(['aiSystem'])
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
      this.configDialogVisible = true
    },

    openCreate() {
      // 检查是否已配置
      const currentProvider = this.aiSystem.providers[this.aiSystem.currentProvider]
      if (!currentProvider || !currentProvider.config.key || !currentProvider.config.model) {
        this.$message.warning('请先配置AI接口')
        this.configDialogVisible = true
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