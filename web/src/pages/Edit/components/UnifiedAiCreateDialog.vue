<template>
  <div>
    <!-- AI创建弹窗 -->
    <el-dialog
      class="unifiedAiCreateDialog"
      title="AI创建思维导图"
      :visible.sync="visible"
      width="500px"
      append-to-body
      @close="handleClose"
    >
      <!-- 当前配置显示 -->
      <div class="currentConfig">
        <el-tag type="info" size="small">
          当前使用: {{ currentProviderName }} - {{ currentModel }}
        </el-tag>
        <el-button 
          type="text" 
          size="mini" 
          @click="openConfig"
          style="margin-left: 10px;"
        >
          修改配置
        </el-button>
      </div>

      <!-- 主题输入 -->
      <div class="topicInput">
        <h4>请输入思维导图主题：</h4>
        <el-input
          type="textarea"
          v-model="topic"
          :rows="4"
          placeholder="例如：人工智能的发展历程、项目管理流程、学习计划等..."
          maxlength="500"
          show-word-limit
        ></el-input>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          @click="startGenerate"
          :disabled="!topic.trim() || !hasValidConfig"
        >
          开始生成
        </el-button>
      </div>
    </el-dialog>

    <!-- 生成中遮罩 -->
    <div class="aiGeneratingMask" v-if="generating">
      <div class="generatingContent">
        <div class="header">
          <div class="title">
            <span class="icon iconfont iconAIshengcheng"></span>
            <span class="text">{{ currentProviderName }} 正在生成思维导图...</span>
          </div>
          <el-button 
            type="text" 
            @click="stopGenerate"
            style="color: #f56c6c;"
          >
            停止生成
          </el-button>
        </div>
        <div class="content">
          {{ generatingContent }}
        </div>
        <div class="footer">
          <div class="progress-info">
            <span>主题: {{ topic }}</span>
            <span>模型: {{ currentModel }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Ai from '@/utils/ai'
import { transformMarkdownTo } from 'simple-mind-map/src/utils'

export default {
  name: 'UnifiedAiCreateDialog',
  props: {
    value: {
      type: Boolean,
      default: false
    },
    mindMap: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      visible: false,
      topic: '',
      generating: false,
      generatingContent: '',
      aiInstance: null,
      isLoopRendering: false
    }
  },
  computed: {
    ...mapState(['aiSystem']),
    
    currentProvider() {
      return this.aiSystem.providers[this.aiSystem.currentProvider]
    },
    
    currentProviderName() {
      return this.currentProvider?.name || '未配置'
    },
    
    currentModel() {
      return this.currentProvider?.config?.model || '未选择'
    },
    
    hasValidConfig() {
      const config = this.currentProvider?.config
      return config && config.key && config.model
    }
  },
  watch: {
    value(val) {
      this.visible = val
    },
    visible(val) {
      this.$emit('input', val)
    }
  },
  methods: {
    openConfig() {
      this.$bus.$emit('open_ai_config')
    },

    async startGenerate() {
      if (!this.hasValidConfig) {
        this.$message.error('请先配置AI接口')
        return
      }

      console.log('开始AI生成，主题:', this.topic)
      
      this.visible = false
      this.generating = true
      this.generatingContent = ''
      
      try {
        // 初始化AI实例
        this.aiInstance = new Ai({
          port: this.currentProvider.config.port || 3456
        })
        
        // 根据当前提供商初始化
        const providerType = this.aiSystem.currentProvider
        this.aiInstance.init(providerType, this.currentProvider.config)
        
        // 清空当前思维导图
        this.mindMap.setData(null)
        
        // 构建提示词
        const prompt = this.buildPrompt(this.topic)
        
        // 发起AI请求
        await this.aiInstance.request(
          {
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          // 流式响应回调
          (content) => {
            if (content) {
              const arr = content.split(/\n+/)
              this.generatingContent = arr.splice(0, arr.length - 1).join('\n')
            }
            this.renderMindMap()
          },
          // 完成回调
          (content) => {
            this.generatingContent = content
            this.generating = false
            this.renderMindMap()
            this.$message.success('AI生成完成！')
          },
          // 错误回调
          (error) => {
            console.error('AI生成失败:', error)
            this.generating = false
            this.$message.error(`AI生成失败: ${error.message || '未知错误'}`)
          }
        )
      } catch (error) {
        console.error('AI生成异常:', error)
        this.generating = false
        this.$message.error(`生成异常: ${error.message}`)
      }
    },

    buildPrompt(topic) {
      return `请根据"${topic}"这个主题，生成一个详细的思维导图结构。

要求：
1. 使用markdown格式输出
2. 用#表示主节点，##表示子节点，###表示更深层的节点
3. 内容要丰富且逻辑清晰
4. 至少包含3-5个主要分支
5. 每个分支下至少有2-3个子节点

请直接输出markdown格式的思维导图结构，不要包含其他说明文字。`
    },

    renderMindMap() {
      if (!this.generatingContent.trim() || this.isLoopRendering) return
      
      this.isLoopRendering = true
      
      try {
        const treeData = transformMarkdownTo(this.generatingContent)
        
        if (!treeData || typeof treeData !== 'object') {
          console.warn('转换后的数据无效:', treeData)
          this.isLoopRendering = false
          return
        }
        
        // 添加唯一标识
        this.addUid(treeData)
        
        // 渲染思维导图
        this.mindMap.setData(treeData)
        
        // 设置根节点居中
        setTimeout(() => {
          if (this.mindMap.renderer && this.mindMap.renderer.root) {
            this.mindMap.renderer.setRootNodeCenter()
          }
        }, 100)
        
      } catch (error) {
        console.error('思维导图渲染失败:', error)
      } finally {
        this.isLoopRendering = false
      }
    },

    addUid(treeData) {
      if (!treeData) return
      
      const walk = (node, uid = '') => {
        if (!node.data) node.data = {}
        if (!node.data.uid) {
          node.data.uid = uid || Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        }
        if (node.children && node.children.length > 0) {
          node.children.forEach((child, index) => {
            walk(child, node.data.uid + '_' + index)
          })
        }
      }
      
      walk(treeData)
    },

    stopGenerate() {
      if (this.aiInstance) {
        this.aiInstance.stop()
      }
      this.generating = false
      this.$message.success('已停止生成')
    },

    handleClose() {
      this.visible = false
      this.topic = ''
      this.generatingContent = ''
    }
  }
}
</script>

<style lang="less" scoped>
.unifiedAiCreateDialog {
  .currentConfig {
    margin-bottom: 20px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .topicInput {
    h4 {
      margin: 0 0 15px 0;
      color: #303133;
      font-size: 14px;
      font-weight: normal;
    }
  }
}

.aiGeneratingMask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;

  .generatingContent {
    width: 80%;
    max-width: 700px;
    max-height: 80%;
    background: white;
    border-radius: 8px;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .header {
      padding: 20px 20px 15px;
      border-bottom: 1px solid #ebeef5;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title {
        display: flex;
        align-items: center;
        
        .icon {
          font-size: 20px;
          color: #409eff;
          margin-right: 8px;
        }
        
        .text {
          font-size: 16px;
          font-weight: bold;
          color: #303133;
        }
      }
    }

    .content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      line-height: 1.6;
      color: #606266;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: Monaco, Consolas, 'Courier New', monospace;
      font-size: 13px;
    }

    .footer {
      padding: 15px 20px;
      border-top: 1px solid #ebeef5;
      background: #fafafa;

      .progress-info {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #909399;
        
        span {
          &:first-child {
            max-width: 60%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }
  }
}
</style>