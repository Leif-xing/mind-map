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
          :loading="generating"
        >
          {{ generating ? '生成中...' : '开始生成' }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Ai from '@/utils/ai'
import { transformMarkdownTo } from 'simple-mind-map/src/parse/markdownTo'

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
      
      // 先设置生成状态
      this.generating = true
      this.generatingContent = ''
      
      // 通知管理器更新生成状态
      this.$bus.$emit('ai_generating_status', true)
      
      // 保存主题到临时变量，因为关闭弹窗会清空topic
      const currentTopic = this.topic
      
      // 关闭弹窗（但不清空状态）
      this.visible = false
      
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
        const prompt = this.buildPrompt(currentTopic)
        
        // 显示开始生成的消息
        this.$message.info(`开始使用 ${this.currentProviderName} 生成思维导图...`)
        
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
            console.log('AI流式响应:', content)
            if (content) {
              const arr = content.split(/\n+/)
              this.generatingContent = arr.splice(0, arr.length - 1).join('\n')
            }
            this.renderMindMap()
          },
          // 完成回调
          (content) => {
            console.log('AI响应完成，最终内容:', content)
            this.generatingContent = content
            this.generating = false
            this.$bus.$emit('ai_generating_status', false)
            this.renderMindMap()
            this.$message.success(`${this.currentProviderName} 生成完成！`)
          },
          // 错误回调
          (error) => {
            console.error('AI生成失败:', error)
            this.generating = false
            this.$bus.$emit('ai_generating_status', false)
            this.$message.error(`AI生成失败: ${error.message || '未知错误'}`)
          }
        )
      } catch (error) {
        console.error('AI生成异常:', error)
        this.generating = false
        this.$bus.$emit('ai_generating_status', false)
        this.$message.error(`生成异常: ${error.message}`)
      }
    },

    buildPrompt(topic) {
      return `请根据"${topic}"这个主题，生成一个详细的思维导图结构。

要求：
1. 使用markdown格式输出
2. 用#表示主节点，##表示子节点，###表示更深层的节点
3. 每个标题独占一行
4. 不要包含其他解释文字，只输出纯markdown标题结构
5. 至少包含3-5个主要分支
6. 每个分支下至少有2-3个子节点

示例格式：
# 主题名称
## 第一个分支
### 子项目1
### 子项目2
## 第二个分支
### 子项目1
### 子项目2

请直接输出markdown格式的思维导图结构：`
    },

    renderMindMap() {
      if (!this.generatingContent.trim() || this.isLoopRendering) return
      
      console.log('========== 开始渲染思维导图 ==========')
      console.log('生成内容:', this.generatingContent)
      console.log('mindMap实例:', this.mindMap)
      console.log('mindMap可用性:', !!this.mindMap)
      
      this.isLoopRendering = true
      let treeData
      
      try {
        // 清理内容，移除可能的前缀文字
        let cleanContent = this.generatingContent.trim()
        
        // 如果内容不是以#开头，尝试找到第一个#
        if (!cleanContent.startsWith('#')) {
          const firstHashIndex = cleanContent.indexOf('\n#')
          if (firstHashIndex !== -1) {
            cleanContent = cleanContent.substring(firstHashIndex + 1)
          } else {
            // 如果没有找到#，添加一个默认的主标题
            cleanContent = `# ${cleanContent.split('\n')[0]}\n${cleanContent}`
          }
        }
        
        console.log('清理后的内容:', cleanContent)
        
        treeData = transformMarkdownTo(cleanContent)
        console.log('转换后的树数据:', treeData)
        console.log('数据类型:', typeof treeData)
        console.log('数据结构:', JSON.stringify(treeData, null, 2))
        
        if (!treeData) {
          console.error('转换结果为空')
          this.isLoopRendering = false
          this.$message.error('思维导图转换失败：转换结果为空')
          return
        }
        
        if (typeof treeData !== 'object') {
          console.error('转换后的数据类型错误:', typeof treeData)
          this.isLoopRendering = false
          this.$message.error('思维导图转换失败：数据类型错误')
          return
        }
        
        // 验证数据结构
        if (!treeData.data || !treeData.data.text) {
          console.error('数据结构不完整:', treeData)
          this.isLoopRendering = false
          this.$message.error('思维导图转换失败：数据结构不完整')
          return
        }
        
        // 添加唯一标识
        this.addUid(treeData)
        console.log('添加UID后的数据:', treeData)
        
      } catch (error) {
        console.error('数据转换失败:', error)
        console.error('错误堆栈:', error.stack)
        this.isLoopRendering = false
        this.$message.error('思维导图内容解析失败: ' + error.message)
        return
      }
      
      let lastTreeData = JSON.stringify(treeData)

      // 在当前渲染完成时再进行下一次渲染
      const onRenderEnd = () => {
        console.log('渲染结束回调触发')
        try {
          // 如果生成结束且数据渲染完毕，解绑事件
          if (!this.generating) {
            console.log('生成完成，解绑事件')
            this.mindMap.off('node_tree_render_end', onRenderEnd)
            this.isLoopRendering = false
            return
          }

          // 继续处理流式数据
          const newTreeData = transformMarkdownTo(this.generatingContent)
          if (!newTreeData) {
            console.warn('渲染中数据转换失败')
            return
          }
          
          this.addUid(newTreeData)
          
          // 如果和上次数据一样则不触发重新渲染
          const curTreeData = JSON.stringify(newTreeData)
          if (curTreeData === lastTreeData) {
            setTimeout(() => {
              onRenderEnd()
            }, 500)
            return
          }
          lastTreeData = curTreeData
          console.log('更新思维导图数据')
          this.mindMap.updateData(newTreeData)
          
        } catch (error) {
          console.error('渲染过程出错:', error)
          this.generating = false
          this.isLoopRendering = false
        }
      }
      
      this.mindMap.on('node_tree_render_end', onRenderEnd)

      try {
        console.log('调用 mindMap.setData...')
        this.mindMap.setData(treeData)
        console.log('mindMap.setData 调用成功')
        
        // 确保根节点居中
        setTimeout(() => {
          if (this.mindMap.renderer && this.mindMap.renderer.root) {
            console.log('设置根节点居中...')
            this.mindMap.renderer.setRootNodeCenter()
          } else {
            console.warn('renderer或root不可用')
          }
        }, 100)
      } catch (error) {
        console.error('设置思维导图数据失败:', error)
        console.error('错误堆栈:', error.stack)
        this.isLoopRendering = false
        this.generating = false
        this.$message.error('思维导图渲染失败: ' + error.message)
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
      this.$bus.$emit('ai_generating_status', false)
      this.$message.success('已停止AI生成')
    },

    handleClose() {
      // 如果正在生成，不要停止AI，只是关闭弹窗
      if (this.generating) {
        this.visible = false
        // 不清空topic和generatingContent，让AI继续生成
        return
      }
      
      // 如果没有在生成，正常关闭并清空状态
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
</style>