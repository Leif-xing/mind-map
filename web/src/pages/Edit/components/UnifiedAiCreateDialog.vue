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
          :rows="8"
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
      isLoopRendering: false,
      rootWaitCount: 0
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
      const result = config && config.model
      console.log('hasValidConfig 计算:', {
        currentProvider: this.currentProvider,
        config: config,
        model: config?.model,
        result: result
      })
      return result // 只需检查模型名称，API密钥由后端代理
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
      // 添加调试信息
      console.log('开始生成 - 当前AI系统状态:', this.aiSystem);
      console.log('当前提供商:', this.currentProvider);
      console.log('当前提供商名称:', this.currentProviderName);
      console.log('当前模型:', this.currentModel);
      console.log('hasValidConfig 计算结果:', this.hasValidConfig);
      
      if (!this.hasValidConfig) {
        // 检查用户角色，显示不同的提示
        const currentUser = this.$store.state.currentUser;
        if (currentUser && currentUser.isAdmin) {
          // 管理员提示配置
          this.$message.error('请先配置AI接口')
          return
        } else {
          // 普通用户提示选择AI模型
          this.$confirm('当前还没有选择AI大模型，请先选择AI大模型', '提示', {
            confirmButtonText: '去选择',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(() => {
            // 触发打开AI选择对话框
            this.$bus.$emit('open_ai_config')
          }).catch(() => {
            // 用户取消操作
          });
          return
        }
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
        // 检查用户是否有AI权限和有效的AI配置
        const currentUserId = this.$store.state.currentUser?.id
        if (!currentUserId) {
          throw new Error('用户未登录')
        }
        
        const currentConfig = await this.$store.dispatch('fetchUserCurrentAiConfig', currentUserId)
        if (!currentConfig) {
          throw new Error('未选择AI配置，请先选择AI服务')
        }
        
        // 清空当前思维导图 - 使用空的根节点结构而不是null
        this.mindMap.setData({
          data: {
            text: '生成中...',
            richText: false,
            expand: true,
            isActive: false
          },
          children: []
        })
        
        // 构建提示词
        const prompt = this.buildPrompt(currentTopic)
        
        // 显示开始生成的消息
        this.$message.info(`开始使用 ${this.currentProviderName} 生成思维导图...`)
        
        // 使用安全代理发起AI请求
        const aiPayload = {
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }
        
        console.log('发起安全AI请求...')
        
        // 调用后端代理进行AI请求
        const response = await this.$store.dispatch('callAiThroughProxy', {
          userId: currentUserId,
          aiPayload: aiPayload
        })
        
        // 成功获取AI响应后，开始渲染
        this.generatingContent = response.choices?.[0]?.message?.content || response.content || JSON.stringify(response)
        this.generating = false
        this.$bus.$emit('ai_generating_status', false)
        this.renderMindMap()
        this.$message.success(`${this.currentProviderName} 生成完成！`)
      } catch (error) {
        console.error('AI生成异常:', error)
        this.generating = false
        this.$bus.$emit('ai_generating_status', false)
        
        // 根据错误类型提供更具体的错误信息
        let errorMessage = 'AI生成失败'
        if (error.message) {
          if (error.message.includes('401')) {
            errorMessage += ': 认证失败，请检查AI配置或联系管理员'
          } else if (error.message.includes('未登录')) {
            errorMessage += ': 用户未登录，请重新登录'
          } else if (error.message.includes('未选择AI配置')) {
            errorMessage += ': 请先选择AI服务配置'
          } else if (error.message.includes('无AI使用权限')) {
            errorMessage += ': 当前用户无AI使用权限'
          } else {
            errorMessage += ': ' + error.message
          }
        } else {
          errorMessage += ': 未知错误'
        }
        
        this.$message.error(errorMessage)
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
      if (!this.generatingContent.trim() || this.isLoopRendering) {
        return
      }
      
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
        
        
        treeData = transformMarkdownTo(cleanContent)
        
        if (!treeData) {
          this.isLoopRendering = false
          this.$message.error('思维导图转换失败')
          return
        }
        
        if (typeof treeData !== 'object') {
          console.error('转换后的数据类型错误:', typeof treeData)
          this.isLoopRendering = false
          this.$message.error('思维导图转换失败：数据类型错误')
          return
        }
        
        // 验证数据结构
        if (!treeData || !treeData.data || !treeData.data.text) {
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
          if (!newTreeData || !newTreeData.data || !newTreeData.data.text) {
            setTimeout(() => {
              onRenderEnd()
            }, 500)
            return
          }
          
          this.addUid(newTreeData)
          
          // 如果和上次数据一样则不触发重新渲染
          const curTreeData = JSON.stringify(newTreeData)
          if (curTreeData === lastTreeData) {
            console.log('🔄 增量渲染 - 数据未变化，等待下次检查')
            console.log('🔄 增量渲染 - 当前生成状态:', this.generating)
            console.log('🔄 增量渲染 - 当前内容长度:', this.generatingContent.length)
            setTimeout(() => {
              onRenderEnd()
            }, 500)
            return
          }
          lastTreeData = curTreeData
          
          // 记录数据变化
          console.log('🔄 增量渲染 - 检测到数据变化')
          console.log('🔄 增量渲染 - 新数据子节点数量:', newTreeData?.children?.length || 0)
          console.log('🔄 增量渲染 - 更新思维导图数据')
          console.log('🔄 增量渲染 - 更新前画布节点数:', (this.mindMap.renderer && this.mindMap.renderer.nodeList) ? this.mindMap.renderer.nodeList.length : 'N/A')
          this.mindMap.updateData(newTreeData)
          console.log('🔄 增量渲染 - 更新后画布节点数:', (this.mindMap.renderer && this.mindMap.renderer.nodeList) ? this.mindMap.renderer.nodeList.length : 'N/A')
          
        } catch (error) {
          console.error('渲染过程出错:', error)
          this.generating = false
          this.isLoopRendering = false
        }
      }
      
      this.mindMap.on('node_tree_render_end', onRenderEnd)

      try {
        this.mindMap.setData(treeData)
        
        // 等待根节点创建完成后再居中
        const waitForRoot = () => {
          if (this.mindMap && this.mindMap.renderer && this.mindMap.renderer.root) {
            this.mindMap.renderer.setRootNodeCenter()
          } else {
            // 继续等待，最多等待10次
            if (this.rootWaitCount < 10) {
              this.rootWaitCount = (this.rootWaitCount || 0) + 1
              setTimeout(waitForRoot, 200)
            }
          }
        }
        setTimeout(waitForRoot, 100)
      } catch (error) {
        console.error('设置思维导图数据失败:', error)
        console.error('错误堆栈:', error.stack)
        this.isLoopRendering = false
        this.generating = false
        this.$message.error('思维导图渲染失败: ' + error.message)
      }
    },

    // AI创建专用：添加UID（不处理内容重复，因为AI创建的内容通常结构清晰）
    addUid(treeData) {
      if (!treeData) return
      
      const walk = (node, uid = '') => {
        if (!node || !node.data) {
          return
        }
        if (!node.data.uid) {
          node.data.uid = uid || 'create_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        }
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          node.children.forEach((child, index) => {
            if (child) {
              walk(child, node.data.uid + '_' + index)
            }
          })
        }
      }
      
      walk(treeData)
    },

    stopGenerate() {
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
      this.rootWaitCount = 0
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

// 深色主题适配
body.isDark {
  .unifiedAiCreateDialog {
    .currentConfig {
      background: #363b3f;
    }

    .topicInput {
      h4 {
        color: hsla(0, 0%, 100%, 0.9);
      }
      
      /deep/ .el-textarea__inner,
      /deep/ .el-input__inner {
        background-color: #363b3f;
        border-color: hsla(0, 0%, 100%, 0.1);
        color: hsla(0, 0%, 100%, 0.9);
      }
      
      /deep/ .el-textarea__inner {
        min-height: 200px; /* 专门针对textarea增加高度为原来的2倍以上，配合8行显示 */
      }
    }
  }
}
</style>