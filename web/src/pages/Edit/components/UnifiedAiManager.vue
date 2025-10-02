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
    ></UnifiedAiCreateDialog>
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
      createDialogVisible: false
    }
  },
  computed: {
    ...mapState(['aiSystem'])
  },
  mounted() {
    // 监听事件
    this.$bus.$on('open_ai_config', this.openConfig)
    this.$bus.$on('open_ai_create', this.openCreate)
  },
  beforeDestroy() {
    // 清理事件监听
    this.$bus.$off('open_ai_config', this.openConfig)
    this.$bus.$off('open_ai_create', this.openCreate)
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
    }
  }
}
</script>

<style lang="less" scoped>
.unifiedAiManager {
  // 容器样式
}
</style>