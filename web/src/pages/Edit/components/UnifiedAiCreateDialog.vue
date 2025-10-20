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
      custom-class="draggable-unified-ai-create-dialog"
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
    
    <!-- 加载动画遮罩层 -->
    <div v-show="aiLoading" class="ai-loading-overlay">
      <div class="ai-loading-content">
        <div class="loading-icon"></div>
        <div class="ai-timer">
          <span class="timer-text">{{ formatTime(aiElapsedTime) }}</span>
        </div>
      </div>
      <el-button 
        type="warning" 
        class="btn"
        @click="stopGenerate"
      >
        停止生成
      </el-button>
    </div>

    <!-- 保存确认对话框 -->
    <el-dialog
      class="saveConfirmDialog"
      title="温馨提示"
      :visible.sync="saveConfirmVisible"
      width="400px"
      append-to-body
      :before-close="handleSaveConfirmClose"
      custom-class="draggable-save-confirm-dialog"
    >
      <div class="confirm-content">
        <p class="confirm-text">是否保存当前思维导图后再生成？</p>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="handleCancel" type="info">
          <i class="el-icon-refresh-left"></i>
          取消
        </el-button>
        <el-button @click="handleSaveAndApply" type="primary">
          <i class="el-icon-document"></i>
          保存
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
      rootWaitCount: 0,
      aiLoading: false,
      aiStartTime: null,          // AI生成开始时间
      aiElapsedTime: 0,           // AI生成已用时间（秒）
      aiTimerInterval: null,      // AI生成计时器ID
      
      // 保存提示对话框相关
      saveConfirmVisible: false,
      generatedMindMapData: null, // 临时存储生成的思维导图数据
      currentMindMapTitle: ''     // 当前思维导图标题
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
      // console.log('hasValidConfig 计算:', { // 仅调试时使用
      //   currentProvider: this.currentProvider,
      //   config: config,
      //   model: config?.model,
      //   result: result
      // })
      return result // 只需检查模型名称，API密钥由后端代理
    }
  },
  watch: {
    value(val) {
      this.visible = val
    },
    visible(val) {
      this.$emit('input', val)
      if (val) {
        // 延迟更长时间确保DOM完全渲染
        setTimeout(() => {
          this.initDragFunctionality()
        }, 200)
      } else {
        this.cleanupDragEvents()
      }
    }
  },
  methods: {
    openConfig() {
      this.$bus.$emit('open_ai_config')
    },
    
    // 格式化时间（秒转为mm:ss格式）
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    async startGenerate() {
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

      // 首先检查当前思维导图是否需要保存
      try {
        // console.log('开始检查思维导图是否需要保存...') // 调试日志，可移除
        const currentMindMapId = this.$store.state.currentMindMapId
        const currentData = this.mindMap.getData(true)
        // console.log('当前思维导图ID:', currentMindMapId) // 调试日志，可移除
        // console.log('当前思维导图数据:', currentData) // 调试日志，可移除
        
        const needsSave = await this.$store.dispatch('needsSave', {
          currentMindMap: {
            id: currentMindMapId,
            data: currentData
          }
        })
        
        // console.log('是否需要保存:', needsSave) // 调试日志，可移除
        
        if (needsSave) {
          // 需要保存，显示保存确认对话框
          // console.log('思维导图有变化，显示保存确认对话框') // 调试日志，可移除
          this.showSaveConfirmDialog()
        } else {
          // 不需要保存，直接开始AI生成
          // console.log('思维导图无变化，直接开始AI生成') // 调试日志，可移除
          await this.startActualGeneration()
        }
      } catch (error) {
        console.error('检查思维导图是否需要保存时出错:', error)
        // 出错时按需要保存处理
        this.showSaveConfirmDialog()
      }
    },
    
    // 开始实际的AI生成过程
    async startActualGeneration() {
      // 先设置生成状态
      this.generating = true
      this.generatingContent = ''
      this.aiLoading = true  // 开始加载动画
      
      // 启动计时器
      this.startTimer()
      
      // 在AI创建时，完全隐藏思维导图内容
      // 设置为null使画布上不显示任何节点
      this.mindMap.setData(null);
      
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
        
        // 在AI创建时，完全隐藏思维导图内容
        // 通过设置null值使画布上不显示任何节点
        this.mindMap.setData(null);
        // console.log('AI创建开始，隐藏思维导图内容');
        
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
        
        // console.log('发起安全AI请求...'); // 仅调试时使用
        
        // 调用后端代理进行AI请求
        const response = await this.$store.dispatch('callAiThroughProxy', {
          userId: currentUserId,
          aiPayload: aiPayload
        })
        
        // 成功获取AI响应后，开始渲染
        this.generatingContent = response.choices?.[0]?.message?.content || response.content || JSON.stringify(response)
        this.generating = false
        this.aiLoading = false  // 结束加载动画
        this.$bus.$emit('ai_generating_status', false)
        
        // 生成完成后直接渲染
        this.renderMindMap()
        this.$message.success(`${this.currentProviderName} 生成完成！`)
      } catch (error) {
        // console.error('AI生成异常:', error)
        this.generating = false
        this.aiLoading = false  // 结束加载动画
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
      return `以"${topic}"为主题创建思维导图，严格按照以下要求：1、输出标准markdown格式，用#做为标题分级符号，不混用其他格式2、标题内容简洁精炼，不超过25个字3、思维导图结构清晰，层次分明，避免层级跳跃4、只返回内容即可`
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
          // console.error('转换后的数据类型错误:', typeof treeData)
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
        // console.log('添加UID后的数据:', treeData); // 隐私保护：不输出用户数据
        
      } catch (error) {
        // console.error('数据转换失败:', error)
        console.error('错误堆栈:', error.stack)
        this.isLoopRendering = false
        this.$message.error('思维导图内容解析失败: ' + error.message)
        return
      }
      
      let lastTreeData = JSON.stringify(treeData)

      // 在当前渲染完成时再进行下一次渲染
      const onRenderEnd = () => {
        // console.log('渲染结束回调触发'); // 仅调试时使用
        try {
          // 如果生成结束且数据渲染完毕，解绑事件并重置ID
          if (!this.generating) {
            // console.log('🎯 UnifiedAiCreateDialog - 检测到AI生成结束，重置ID为null，当前ID:', this.$store.state.currentMindMapId);
            // console.log('生成完成，解绑事件'); // 仅调试时使用
            this.mindMap.off('node_tree_render_end', onRenderEnd)
            // AI生成新的思维导图内容后，重置ID，使其成为新的思维导图
            // console.log('🔄 UnifiedAiCreateDialog - onRenderEnd中重置ID为null');
            this.$store.commit('setCurrentMindMapId', null)
            // console.log('🔄 UnifiedAiCreateDialog - ID已重置，当前ID:', this.$store.state.currentMindMapId);
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
            // console.log('🔄 增量渲染 - 数据未变化，等待下次检查'); // 仅调试时使用
            // console.log('🔄 增量渲染 - 当前生成状态:', this.generating); // 仅调试时使用
            // console.log('🔄 增量渲染 - 当前内容长度:', this.generatingContent.length); // 隐私保护：不输出内容长度
            setTimeout(() => {
              onRenderEnd()
            }, 500)
            return
          }
          lastTreeData = curTreeData
          
          // 记录数据变化
          // console.log('🔄 增量渲染 - 检测到数据变化'); // 仅调试时使用
          // console.log('🔄 增量渲染 - 新数据子节点数量:', newTreeData?.children?.length || 0); // 仅调试时使用
          // console.log('🔄 增量渲染 - 更新思维导图数据'); // 仅调试时使用
          // console.log('🔄 增量渲染 - 更新前画布节点数:', (this.mindMap.renderer && this.mindMap.renderer.nodeList) ? this.mindMap.renderer.nodeList.length : 'N/A'); // 仅调试时使用
          this.mindMap.updateData(newTreeData)
          // console.log('🔄 增量渲染 - 更新后画布节点数:', (this.mindMap.renderer && this.mindMap.renderer.nodeList) ? this.mindMap.renderer.nodeList.length : 'N/A'); // 仅调试时使用
          
        } catch (error) {
          // console.error('渲染过程出错:', error)
          // console.log('🎯 UnifiedAiCreateDialog - 渲染过程出错，重置ID为null，当前ID:', this.$store.state.currentMindMapId);
          this.generating = false
          this.isLoopRendering = false
          // AI生成过程中出错，也需要重置ID，因为原内容已被AI生成过程覆盖
          // console.log('🔄 UnifiedAiCreateDialog - 渲染过程出错重置ID为null');
          this.$store.commit('setCurrentMindMapId', null)
          // console.log('🔄 UnifiedAiCreateDialog - 渲染错误情况下ID已重置，当前ID:', this.$store.state.currentMindMapId);
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
        // console.error('设置思维导图数据失败:', error)
        // console.error('错误堆栈:', error.stack)
        // console.log('🎯 UnifiedAiCreateDialog - 设置思维导图数据失败，重置ID为null，当前ID:', this.$store.state.currentMindMapId);
        this.isLoopRendering = false
        this.generating = false
        // AI生成过程中出错，也需要重置ID，因为原内容已被AI生成过程覆盖
        // console.log('🔄 UnifiedAiCreateDialog - 设置数据失败重置ID为null');
        this.$store.commit('setCurrentMindMapId', null)
        // console.log('🔄 UnifiedAiCreateDialog - 数据设置失败情况下ID已重置，当前ID:', this.$store.state.currentMindMapId);
        this.$message.error('思维导图渲染失败: ' + error.message)
      }
      
      // 确保在渲染流程结束时添加一个额外的保障，在渲染完成后重置ID
      setTimeout(() => {
        if (!this.generating && !this.isGenerating) {
          // console.log('🔄 UnifiedAiCreateDialog - renderMindMap完成后额外保障重置ID为null');
          this.$store.commit('setCurrentMindMapId', null);
        }
      }, 100);
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
      this.aiLoading = false  // 销毁加载动画
      this.stopTimer()  // 停止计时器
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
      
      // 如果没有在生成，正常关闭但保留用户输入的主题
      this.visible = false
      this.generatingContent = ''
      this.rootWaitCount = 0
    },
    
    // 启动AI生成计时器
    startTimer() {
      // 清除之前的定时器
      if (this.aiTimerInterval) {
        clearInterval(this.aiTimerInterval);
      }
      
      this.aiStartTime = new Date();
      this.aiElapsedTime = 0;
      
      this.aiTimerInterval = setInterval(() => {
        if (this.aiLoading) { // 只有在加载动画显示时才计时
          const now = new Date();
          this.aiElapsedTime = Math.floor((now - this.aiStartTime) / 1000);
        } else {
          // 如果加载动画已隐藏，停止计时器
          this.stopTimer();
        }
      }, 1000);
    },
    
    // 停止AI生成计时器
    stopTimer() {
      if (this.aiTimerInterval) {
        clearInterval(this.aiTimerInterval);
        this.aiTimerInterval = null;
      }
    },

    // 显示保存确认对话框
    showSaveConfirmDialog() {
      // console.log('🎯 UnifiedAiCreateDialog - 显示保存确认对话框');
      
      // 获取当前思维导图的标题（从根节点获取）
      this.getCurrentMindMapTitle();
      
      // 显示确认对话框
      this.saveConfirmVisible = true;
      
      // 延迟初始化拖拽功能，确保DOM完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          this.initDragForDialog('.draggable-save-confirm-dialog', '温馨提示');
        }, 100);
      });
    },

    // 生成思维导图数据
    generateMindMapData() {
      if (!this.generatingContent.trim()) {
        // console.error('❌ UnifiedAiCreateDialog - 没有生成内容');
        return;
      }
      
      try {
        // 清理内容，移除可能的前缀文字
        let cleanContent = this.generatingContent.trim();
        
        // 如果内容不是以#开头，尝试找到第一个#
        if (!cleanContent.startsWith('#')) {
          const firstHashIndex = cleanContent.indexOf('\n#');
          if (firstHashIndex !== -1) {
            cleanContent = cleanContent.substring(firstHashIndex + 1);
          } else {
            // 如果没有找到#，添加一个默认的主标题
            cleanContent = `# ${cleanContent.split('\n')[0]}\n${cleanContent}`;
          }
        }
        
        const treeData = transformMarkdownTo(cleanContent);
        
        if (!treeData || !treeData.data || !treeData.data.text) {
          throw new Error('思维导图转换失败：数据结构不完整');
        }
        
        // 添加唯一标识
        this.addUid(treeData);
        
        // 存储生成的数据
        this.generatedMindMapData = treeData;
        // console.log('✅ UnifiedAiCreateDialog - 思维导图数据生成完成');
        
      } catch (error) {
        // console.error('❌ UnifiedAiCreateDialog - 思维导图数据生成失败:', error);
        this.$message.error('思维导图内容解析失败: ' + error.message);
        this.generatedMindMapData = null;
      }
    },

    // 获取当前思维导图标题
    getCurrentMindMapTitle() {
      try {
        if (this.mindMap && this.mindMap.renderer && this.mindMap.renderer.root) {
          const rootData = this.mindMap.renderer.root.getData();
          if (rootData && rootData.text) {
            // 移除HTML标签，获取纯文本
            this.currentMindMapTitle = rootData.text.replace(/<[^>]*>/g, '').trim();
          } else {
            this.currentMindMapTitle = '未命名思维导图';
          }
        } else {
          this.currentMindMapTitle = '未命名思维导图';
        }
        // console.log('📝 UnifiedAiCreateDialog - 当前思维导图标题:', this.currentMindMapTitle);
      } catch (error) {
        // console.error('❌ UnifiedAiCreateDialog - 获取当前标题失败:', error);
        this.currentMindMapTitle = '未命名思维导图';
      }
    },

    // 处理保存并应用
    async handleSaveAndApply() {
      // console.log('💾 UnifiedAiCreateDialog - 准备开始生成并异步保存当前思维导图');
      
      // 1. 关闭确认对话框
      this.saveConfirmVisible = false;
      
      // 2. 在开始任何操作前，先复制当前思维导图的数据和ID
      const currentMindMapId = this.$store.state.currentMindMapId;
      const currentUser = this.$store.state.currentUser;
      const originalData = JSON.parse(JSON.stringify(this.mindMap.getData(true))); // 深拷贝原始数据
      const originalTitle = this.currentMindMapTitle;
      
      // console.log('🔄 UnifiedAiCreateDialog - handleSaveAndApply: 准备数据 - ID:', currentMindMapId, '用户:', currentUser?.id, '数据存在:', !!originalData);
      
      // 3. 开始AI生成（与保存同时进行）
      // console.log('🔄 UnifiedAiCreateDialog - handleSaveAndApply: 开始AI生成');
      const generationPromise = this.startActualGeneration();
      
      // 4. 在后台异步保存原始数据（与AI生成同时进行）
      // console.log('🔄 UnifiedAiCreateDialog - handleSaveAndApply: 准备异步保存 - 用户:', !!currentUser, '数据:', !!originalData);
      if (currentUser && originalData) {
        // 显示保存状态
        // console.log('🔄 UnifiedAiCreateDialog - handleSaveAndApply: 开始异步保存');
        this.mindMapLoading = true;
        // this.statusMessage = '正在保存当前思维导图...';
        
        this.saveMindMapData(originalData, originalTitle, currentMindMapId, currentUser.id)
          .then(result => {
            // console.log('🔄 UnifiedAiCreateDialog - 异步保存成功完成，结果:', result);
            if (result && result.id && !currentMindMapId) {
              // 如果是新创建的思维导图，临时记录ID（但不更新当前ID，因为后续会重置为null）
              // console.log('🔄 UnifiedAiCreateDialog - 异步保存创建新思维导图，ID:', result.id);
            }
            // 使用通知和状态栏双重提示，确保用户能看到保存成功信息
            this.$notify({
              title: '保存成功',
              message: '当前思维导图已保存 (ID: ' + result.id + ')',
              type: 'success',
              duration: 5000
            });
            this.statusMessage = '✓ 当前思维导图已保存 (ID: ' + result.id + ')';
            setTimeout(() => {
              if (this.statusMessage.includes('✓ 当前思维导图已保存')) {
                this.statusMessage = '';
              }
            }, 5000);
          })
          .catch(error => {
            // console.log('🔄 UnifiedAiCreateDialog - 异步保存失败:', error);
            // console.error('❌ UnifiedAiCreateDialog - 异步保存当前思维导图失败:', error);
            // 使用通知和状态栏双重提示，确保用户能看到保存失败信息
            this.$notify({
              title: '保存失败',
              message: '当前思维导图保存失败: ' + error.message,
              type: 'error',
              duration: 5000
            });
            this.statusMessage = '✗ 当前思维导图保存失败: ' + error.message;
            setTimeout(() => {
              if (this.statusMessage.includes('✗ 当前思维导图保存失败')) {
                this.statusMessage = '';
              }
            }, 5000);
          })
          .finally(() => {
            // 无论成功或失败，都清除状态
            // console.log('🔄 UnifiedAiCreateDialog - 异步保存完成，清除状态');
            this.mindMapLoading = false;
            // if (this.statusMessage === '正在保存当前思维导图...') {
            //   this.statusMessage = '';
            // }
          });
      } else {
        // console.log('🔄 UnifiedAiCreateDialog - handleSaveAndApply: 跳过异步保存 - 用户或数据缺失');
      }
      
      // 等待AI生成完成
      await generationPromise;
      
      // 5. 确保在AI生成完成后重置ID为null
      // 使用setTimeout以确保在所有异步操作完成后执行
      setTimeout(() => {
        if (!this.generating && !this.isGenerating) {
          // console.log('🔄 UnifiedAiCreateDialog - handleSaveAndApply完成后强制重置ID为null');
          this.$store.commit('setCurrentMindMapId', null);
          // console.log('🔄 UnifiedAiCreateDialog - handleSaveAndApply完成后强制重置ID');
        }
      }, 500);
    },

    // 处理覆盖
    async handleOverwrite() {
      // console.log('🔄 UnifiedAiCreateDialog - 直接开始生成（不保存当前内容）');
      
      // 1. 关闭确认对话框
      this.saveConfirmVisible = false;
      
      // 2. 直接开始AI生成
      await this.startActualGeneration();
      
      // 3. 确保在AI生成完成后重置ID为null
      // 使用setTimeout以确保在所有异步操作完成后执行
      setTimeout(() => {
        if (!this.generating && !this.isGenerating) {
          // console.log('🔄 UnifiedAiCreateDialog - handleOverwrite完成后强制重置ID为null');
          this.$store.commit('setCurrentMindMapId', null);
          // console.log('🔄 UnifiedAiCreateDialog - handleOverwrite完成后强制重置ID');
        }
      }, 500);
    },

    // 处理取消
    handleCancel() {
      // 关闭确认对话框
      this.saveConfirmVisible = false;
      this.$message.info('已取消AI生成');
    },

    // 保存当前思维导图
    async saveCurrentMindMap() {
      const currentMindMapId = this.$store.state.currentMindMapId;
      const currentUser = this.$store.state.currentUser;
      
      // console.log('💾 UnifiedAiCreateDialog - 开始保存当前思维导图，当前ID:', currentMindMapId, '当前用户:', currentUser?.id);
      
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      // 获取当前思维导图数据
      const currentData = this.mindMap.getData(true);
      // console.log('💾 UnifiedAiCreateDialog - 保存时获取的数据 - 根节点文本:', currentData?.root?.data?.text || '无根节点');
      // console.log('💾 UnifiedAiCreateDialog - 保存时获取的数据 - 子节点数量:', currentData?.root?.children?.length || 0);
      // console.log('💾 UnifiedAiCreateDialog - 保存时获取的数据 - 时间戳:', new Date().toISOString());
      // 输出完整的思维导图内容以确认保存的是最新内容
      // console.log('💾 UnifiedAiCreateDialog - 保存时获取的完整思维导图数据:', JSON.stringify(currentData, null, 2));
      
      if (currentMindMapId) {
        // 有ID，更新现有思维导图
        // console.log('📝 UnifiedAiCreateDialog - 更新现有思维导图, ID:', currentMindMapId);
        
        await this.$store.dispatch('saveMindMap', {
          id: currentMindMapId,
          userId: currentUser.id,
          title: this.currentMindMapTitle,
          content: currentData,
          isUpdate: true
        });
        // console.log('📝 UnifiedAiCreateDialog - 更新思维导图完成, ID:', currentMindMapId);
        
        // 保存成功后，立即更新本地缓存
        try {
          const cacheKey = `mindmap_cache_${currentMindMapId}`;
          localStorage.setItem(cacheKey, JSON.stringify(currentData));
        } catch (error) {
          // console.error('保存思维导图缓存失败:', error);
        }
        
      } else {
        // 无ID，创建新思维导图
        // console.log('📝 UnifiedAiCreateDialog - 创建新思维导图');
        
        const result = await this.$store.dispatch('saveMindMap', {
          userId: currentUser.id,
          title: this.currentMindMapTitle,
          content: currentData,
          isUpdate: false
        });
        
        // 更新当前思维导图ID
        if (result && result.id) {
          // console.log('🔄 UnifiedAiCreateDialog - 为新思维导图设置ID:', result.id);
          this.$store.commit('setCurrentMindMapId', result.id);
          // 对于新创建的思维导图，也更新本地缓存
          try {
            const cacheKey = `mindmap_cache_${result.id}`;
            localStorage.setItem(cacheKey, JSON.stringify(currentData));
          } catch (error) {
            // console.error('保存新思维导图缓存失败:', error);
          }
        }
      }
      // console.log('💾 UnifiedAiCreateDialog - 保存当前思维导图完成');
    },

    // 异步保存当前思维导图
    async saveCurrentMindMapAsync() {
      this.isSaving = true; // 设置保存状态
      try {
        await this.saveCurrentMindMap();
        // console.log('✅ UnifiedAiCreateDialog - 当前思维导图已异步保存');
        this.$message.success('当前思维导图已保存');
      } catch (error) {
        // console.error('❌ UnifiedAiCreateDialog - 异步保存失败:', error);
        this.$message.error('思维导图自动保存失败: ' + error.message);
      } finally {
        this.isSaving = false; // 重置保存状态
      }
    },

    // 保存思维导图数据的辅助方法
    async saveMindMapData(content, title, mindMapId, userId) {
      // console.log('🔄 UnifiedAiCreateDialog - saveMindMapData: 开始保存，ID:', mindMapId, '用户:', userId, '标题:', title);
      try {
        let result;
        if (mindMapId) {
          // 更新现有思维导图
          // console.log('🔄 UnifiedAiCreateDialog - saveMindMapData: 更新现有思维导图，ID:', mindMapId);
          result = await this.$store.dispatch('saveMindMap', {
            id: mindMapId,
            userId: userId,
            title: title,
            content: content,
            isUpdate: true
          });
        } else {
          // 创建新思维导图
          // console.log('🔄 UnifiedAiCreateDialog - saveMindMapData: 创建新思维导图');
          result = await this.$store.dispatch('saveMindMap', {
            userId: userId,
            title: title,
            content: content,
            isUpdate: false
          });
        }
        // console.log('🔄 UnifiedAiCreateDialog - saveMindMapData: 保存完成，结果:', result);
        return result;
      } catch (error) {
        // console.log('🔄 UnifiedAiCreateDialog - saveMindMapData: 保存失败:', error);
        throw error;
      }
    },

    // 应用生成的数据
    applyGeneratedData() {
      if (!this.generatedMindMapData) {
        // console.error('❌ UnifiedAiCreateDialog - 没有可应用的数据');
        return;
      }

      try {
        // console.log('🎯 UnifiedAiCreateDialog - 应用AI生成的数据');
        
        // 直接设置数据
        this.mindMap.setData(this.generatedMindMapData);
        
        // 等待根节点创建完成后再居中
        setTimeout(() => {
          if (this.mindMap && this.mindMap.renderer && this.mindMap.renderer.root) {
            this.mindMap.renderer.setRootNodeCenter();
          }
        }, 100);
        
        // 清空临时数据
        this.generatedMindMapData = null;
        this.generatingContent = '';
        this.isLoopRendering = false;
        // console.log('🎯 UnifiedAiCreateDialog - AI生成完成，重置ID为null，当前ID:', this.$store.state.currentMindMapId);
        // AI生成新的思维导图内容后，重置ID，使其成为新的思维导图
        // console.log('🔄 UnifiedAiCreateDialog - applyGeneratedData成功重置ID为null');
        this.$store.commit('setCurrentMindMapId', null);
        // console.log('🔄 UnifiedAiCreateDialog - ID已重置，当前ID:', this.$store.state.currentMindMapId);
        
      } catch (error) {
        // console.error('❌ UnifiedAiCreateDialog - 应用数据失败:', error);
        // console.log('🎯 UnifiedAiCreateDialog - 应用数据失败，重置ID为null，当前ID:', this.$store.state.currentMindMapId);
        // AI生成过程中出错，也需要重置ID，因为原内容已被AI生成过程覆盖
        // console.log('🔄 UnifiedAiCreateDialog - applyGeneratedData失败重置ID为null');
        this.$store.commit('setCurrentMindMapId', null);
        // console.log('🔄 UnifiedAiCreateDialog - 应用数据失败情况下ID已重置，当前ID:', this.$store.state.currentMindMapId);
        this.$message.error('应用AI生成数据失败: ' + error.message);
      }
    },

    // 处理保存确认对话框关闭
    handleSaveConfirmClose() {
      // 用户直接关闭对话框，相当于取消操作
      this.saveConfirmVisible = false;
      this.generatedMindMapData = null;
      this.$message.info('已取消应用AI生成结果');
    },

    // 初始化拖拽功能
    initDragFunctionality() {
      // 对话框拖拽功能 - 处理主要的AI创建对话框
      this.initDragForDialog('.draggable-unified-ai-create-dialog', 'AI创建思维导图')
      
      // 对话框拖拽功能 - 处理保存确认对话框
      this.initDragForDialog('.draggable-save-confirm-dialog', '温馨提示')
    },
    
    // 为指定对话框初始化拖拽功能
    initDragForDialog(dialogClass, dialogTitle) {
      // 尝试多种选择器方式
      let dialogHeaderEl = document.querySelector(`${dialogClass} .el-dialog__header`)
      let dragDom = document.querySelector(`${dialogClass} .el-dialog`)
      
      // 如果通过custom-class找不到，尝试通过class找
      if (!dialogHeaderEl || !dragDom) {
        const allDialogs = document.querySelectorAll('.el-dialog')
        for (let dialog of allDialogs) {
          const title = dialog.querySelector('.el-dialog__title')
          if (title && title.textContent.includes(dialogTitle)) {
            dragDom = dialog
            dialogHeaderEl = dialog.querySelector('.el-dialog__header')
            break
          }
        }
      }

      if (!dialogHeaderEl || !dragDom) {
        // console.log(`${dialogTitle}对话框元素未找到`)
        return
      }
      
      // console.log(`${dialogTitle}对话框拖拽初始化成功`)

      // 设置标题栏样式
      dialogHeaderEl.style.cursor = 'move'
      dialogHeaderEl.style.userSelect = 'none'

      let startX = 0
      let startY = 0
      let lastX = 0
      let lastY = 0

      const mousedownHandler = (e) => {
        // 只有点击标题栏才触发拖拽
        if (e.target !== dialogHeaderEl && !dialogHeaderEl.contains(e.target)) {
          return
        }

        startX = e.clientX
        startY = e.clientY

        // 获取当前transform值
        const style = window.getComputedStyle(dragDom)
        const transform = style.transform
        if (transform && transform !== 'none') {
          const matrix = new DOMMatrix(transform)
          lastX = matrix.m41
          lastY = matrix.m42
        } else {
          lastX = 0
          lastY = 0
        }

        const mousemoveHandler = (e) => {
          const offsetX = e.clientX - startX
          const offsetY = e.clientY - startY
          dragDom.style.transform = `translate(${lastX + offsetX}px, ${lastY + offsetY}px)`
          dragDom.style.willChange = 'transform' // 优化性能
        }

        const mouseupHandler = () => {
          dragDom.style.willChange = 'auto'
          document.removeEventListener('mousemove', mousemoveHandler)
          document.removeEventListener('mouseup', mouseupHandler)
        }

        document.addEventListener('mousemove', mousemoveHandler)
        document.addEventListener('mouseup', mouseupHandler)

        e.preventDefault()
      }

      dialogHeaderEl.addEventListener('mousedown', mousedownHandler)

      // 为不同对话框设置不同的拖拽处理器
      if (dialogTitle.includes('AI创建思维导图')) {
        this.dragHandler = {
          element: dialogHeaderEl,
          mousedownHandler: mousedownHandler
        }
      } else if (dialogTitle.includes('温馨提示')) {
        this.saveConfirmDragHandler = {
          element: dialogHeaderEl,
          mousedownHandler: mousedownHandler
        }
      }
    },

    // 清理拖拽事件
    cleanupDragEvents() {
      if (this.dragHandler) {
        this.dragHandler.element.removeEventListener('mousedown', this.dragHandler.mousedownHandler)
        this.dragHandler = null
      }
      
      if (this.saveConfirmDragHandler) {
        this.saveConfirmDragHandler.element.removeEventListener('mousedown', this.saveConfirmDragHandler.mousedownHandler)
        this.saveConfirmDragHandler = null
      }
    }
  },
  beforeDestroy() {
    // 组件销毁时停止计时器
    this.stopTimer();
    // 清理拖拽事件
    this.cleanupDragEvents();
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

// 保存确认对话框样式
.saveConfirmDialog {
  margin-top: 115px;
  
  .confirm-content {
    padding: 10px 0;
    
    .confirm-text {
      margin: 0 0 15px 0;
      font-size: 15px;
      color: #606266;
      line-height: 1.5;
      text-align: center;
    }
  }
  
  .dialog-footer {
    text-align: right;
    padding: 15px 20px 0 20px;
    border-top: none;
    
    .el-button {
      margin-left: 12px;
      
      i {
        margin-right: 5px;
      }
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
  
  // 深色主题下的保存确认对话框
  .saveConfirmDialog {
    /deep/ .el-dialog {
      background-color: #2b2f33;
      border: 1px solid #404040;
    }
    
    /deep/ .el-dialog__header {
      background-color: #2b2f33;
      border-bottom: 1px solid #404040;
    }
    
    /deep/ .el-dialog__title {
      color: hsla(0, 0%, 100%, 0.9);
    }
    
    /deep/ .el-dialog__headerbtn .el-dialog__close {
      color: hsla(0, 0%, 100%, 0.6);
    }
    
    .confirm-content {
      .confirm-text {
        color: hsla(0, 0%, 100%, 0.8);
      }
    }
    
    .dialog-footer {
      border-top: none;
    }
  }
}

// 加载动画样式
.ai-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.ai-loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-icon {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.ai-timer {
  margin-top: 10px; /* 在加载图标下方 */
  z-index: 100000; /* 确保计时器在最上层 */
  
  .timer-text {
    font-size: 16px;
    font-weight: bold;
    color: #409EFF;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 6px 12px;
    border-radius: 18px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    display: inline-block;
  }
}

// 与AiCreate.vue中的按钮样式保持一致
.ai-loading-overlay .btn {
  position: absolute;
  left: 50%;
  top: 150px; /* 调整位置为给计时器留出空间 */
  transform: translateX(-50%);
}

// 深色主题下的加载动画适配
body.isDark .ai-loading-overlay {
  background-color: rgba(0, 0, 0, 0.7);
}

body.isDark .loading-icon {
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top: 3px solid #409eff;
}

// 深色主题下的停止按钮适配
body.isDark .el-button--warning {
  background-color: #e6a23c;
  border-color: #e6a23c;
  color: #fff;
}

// 深色主题下的停止按钮适配
body.isDark .el-button--warning {
  background-color: #e6a23c;
  border-color: #e6a23c;
  color: #fff;
}
</style>