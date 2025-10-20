<template>
  <div>
    <!-- 客户端连接失败提示弹窗 -->
    <el-dialog
      class="clientTipDialog"
      :title="$t('ai.connectFailedTitle')"
      :visible.sync="clientTipDialogVisible"
      width="400px"
      append-to-body
    >
      <div class="tipBox">
        <p>{{ $t('ai.connectFailedTip') }}</p>
        <p>
          {{ $t('ai.connectFailedCheckTip1')
          }}<a
            href="https://pan.baidu.com/s/1huasEbKsGNH2Af68dvWiOg?pwd=3bp3"
            >{{ $t('ai.baiduNetdisk') }}</a
          >、<a href="https://github.com/wanglin2/mind-map/releases">Github</a>
        </p>
        <p>{{ $t('ai.connectFailedCheckTip2') }}</p>
        <P>{{ $t('ai.connectFailedCheckTip3') }}</P>
        <p>
          {{ $t('ai.connectFailedCheckTip4')
          }}<el-button size="small" @click="testConnect">{{
            $t('ai.connectionDetection')
          }}</el-button>
        </p>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="clientTipDialogVisible = false">{{
          $t('ai.close')
        }}</el-button>
      </div>
    </el-dialog>
    <!-- ai内容输入弹窗 -->
    <el-dialog
      class="createDialog"
      :title="$t('ai.createMindMapTitle')"
      :visible.sync="createDialogVisible"
      width="450px"
      append-to-body
      custom-class="draggable-ai-create-dialog"
    >
      <div class="inputBox">
        <el-input
          type="textarea"
          :rows="5"
          :placeholder="$t('ai.createTip')"
          v-model="aiInput"
        >
        </el-input>
        <div class="tip warning">
          {{ $t('ai.importantTip') }}
        </div>
        <div class="tip">
          {{ $t('ai.wantModifyAiConfigTip')
          }}<el-button size="small" @click="showAiSelectionDialog">{{
            isCurrentUserAdmin ? $t('ai.manageAIConfiguration') : $t('ai.selectAIConfiguration')
          }}</el-button>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="closeAiCreateDialog">{{
          $t('ai.cancel')
        }}</el-button>
        <el-button type="primary" @click="doAiCreate">{{
          $t('ai.confirm')
        }}</el-button>
      </div>
    </el-dialog>
    <!-- ai生成中添加一个透明层，防止期间用户进行操作 -->
    <div
      class="aiCreatingMask"
      ref="aiCreatingMaskRef"
      v-show="aiCreatingMaskVisible"
    >
      <div class="ai-timer">
        <span class="timer-text">{{ formatTime(aiCreateElapsedTime) }}</span>
      </div>
      <el-button type="warning" class="btn" @click="stopCreate">{{
        $t('ai.stopGenerating')
      }}</el-button>
    </div>
    <!-- AI续写专用加载动画遮罩层 -->
    <div
      class="aiPartCreatingMask"
      v-show="aiPartCreating"
    >
      <div class="ai-part-loading-content">
        <div class="ai-part-loading-icon"></div>
        <div class="ai-timer-part">
          <span class="timer-text">{{ formatTime(aiPartElapsedTime) }}</span>
        </div>
      </div>
      <el-button 
        type="danger" 
        class="btn"
        @click="stopPartCreate"
      >
        停止续写
      </el-button>
    </div>

    <!-- 保存确认对话框 -->
    <el-dialog
      class="saveConfirmDialog"
      title="AI生成完成"
      :visible.sync="saveConfirmVisible"
      width="420px"
      append-to-body
      :before-close="handleSaveConfirmClose"
    >
      <div class="confirm-content">
        <div class="confirm-icon">
          <i class="el-icon-warning" style="color: #E6A23C; font-size: 48px;"></i>
        </div>
        <div class="confirm-text">
          <h3>是否保存当前思维导图后再生成？</h3>
          <p class="current-title">当前思维导图：{{ currentMindMapTitle || '未命名思维导图' }}</p>
          <p class="tip-text">选择"保存"将保存当前内容并应用AI生成结果</p>
          <p class="tip-text">选择"覆盖"将直接替换当前内容（不保存）</p>
        </div>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button @click="handleOverwrite" type="info">
          <i class="el-icon-refresh-left"></i>
          覆盖
        </el-button>
        <el-button @click="handleSaveAndApply" type="primary">
          <i class="el-icon-document"></i>
          保存
        </el-button>
      </div>
    </el-dialog>

    <AiConfigDialog v-model="aiConfigDialogVisible"></AiConfigDialog>
    <AiSelectionDialog v-model="aiSelectionDialogVisible"></AiSelectionDialog>
    <!-- AI续写 -->
    <el-dialog
      class="createDialog"
      :title="$t('ai.aiCreatePart')"
      :visible.sync="createPartDialogVisible"
      width="450px"
      append-to-body
      custom-class="draggable-ai-create-part-dialog"
    >
      <div class="inputBox">
        <el-input type="textarea" :rows="8" v-model="aiPartInput"> </el-input>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="closeAiCreatePartDialog">{{
          $t('ai.cancel')
        }}</el-button>
        <el-button type="primary" @click="confirmAiCreatePart">{{
          $t('ai.confirm')
        }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { transformMarkdownTo } from 'simple-mind-map/src/parse/markdownTo'
import {
  createUid,
  isUndef,
  checkNodeOuter,
  getStrWithBrFromHtml
} from 'simple-mind-map/src/utils'
import { mapState } from 'vuex'
import AiConfigDialog from './AiConfigDialog.vue'
import AiSelectionDialog from './AiSelectionDialog.vue'

export default {
  components: {
    AiConfigDialog,
    AiSelectionDialog
  },
  props: {
    mindMap: {
      type: Object
    }
  },
  data() {
    return {
      isAiCreating: false,
      aiCreatingContent: '',

      isLoopRendering: false,
      uidMap: {},
      latestUid: '',

      clientTipDialogVisible: false,
      createDialogVisible: false,
      aiInput: '',
      aiCreatingMaskVisible: false,
      aiConfigDialogVisible: false,
      aiSelectionDialogVisible: false,

      mindMapDataCache: '',
      beingAiCreateNodeUid: '',

      createPartDialogVisible: false,
      aiPartInput: '',
      beingCreatePartNode: null,
      aiPartCreating: false,  // AI续写专用加载状态
      aiCreateStartTime: null, // AI创建开始时间
      aiCreateElapsedTime: 0,  // AI创建已用时间（秒）
      aiPartStartTime: null,   // AI续写开始时间
      aiPartElapsedTime: 0,    // AI续写已用时间（秒）
      timerInterval: null,     // 计时器ID
      partTimerInterval: null,  // AI续写计时器ID
      
      // 保存提示对话框相关
      saveConfirmVisible: false,
      generatedMindMapData: null, // 临时存储生成的思维导图数据
      currentMindMapTitle: '',    // 当前思维导图标题
      createContent: ''           // 保存用户输入的创建内容
    }
  },
  computed: {
    ...mapState(['aiSystem', 'currentUser']),

    // 为了向后兼容，提供aiConfig的计算属性
    aiConfig() {
      const currentProvider = this.aiSystem.providers[this.aiSystem.currentProvider]
      if (!currentProvider) return {}
      return {
        api: currentProvider.api,
        key: currentProvider.config.key,
        model: currentProvider.config.model,
        port: currentProvider.config.port,
        method: currentProvider.config.method
      }
    },
    
    isCurrentUserAdmin() {
      return this.currentUser && this.currentUser.isAdmin;
    }
  },
  created() {
    this.$bus.$on('ai_create_all', this.aiCrateAll)
    this.$bus.$on('ai_create_part', this.showAiCreatePartDialog)
    this.$bus.$on('ai_chat', this.aiChat)
    this.$bus.$on('ai_chat_stop', this.aiChatStop)
    this.$bus.$on('showAiConfigDialog', this.showAiSelectionDialog) // 改为调用新的AI选择对话框
    
    // 预加载AI配置以提高后续加载速度
    this.preloadAiConfigs();
  },
  mounted() {
    document.body.appendChild(this.$refs.aiCreatingMaskRef)
    
    // 监听对话框显示和隐藏事件
    this.$watch('createDialogVisible', (newVal) => {
      if (newVal) {
        // 延迟更长时间确保DOM完全渲染
        setTimeout(() => {
          this.initCreateDialogDrag()
        }, 200)
      } else {
        this.cleanupCreateDialogDragEvents()
      }
    })
    
    this.$watch('createPartDialogVisible', (newVal) => {
      if (newVal) {
        // 延迟更长时间确保DOM完全渲染
        setTimeout(() => {
          this.initPartDialogDrag()
        }, 200)
      } else {
        this.cleanupPartDialogDragEvents()
      }
    })
  },
  beforeDestroy() {
    this.$bus.$off('ai_create_all', this.aiCrateAll)
    this.$bus.$off('ai_create_part', this.showAiCreatePartDialog)
    this.$bus.$off('ai_chat', this.aiChat)
    this.$bus.$off('ai_chat_stop', this.aiChatStop)
    this.$bus.$off('showAiConfigDialog', this.showAiSelectionDialog) // 改为取消监听新对话框
    
    // 组件销毁时停止计时器
    this.stopTimer()
    this.stopPartTimer()
    
    // 清理拖拽事件
    this.cleanupCreateDialogDragEvents()
    this.cleanupPartDialogDragEvents()
  },
  methods: {
    // 预加载AI配置以提高打开对话框的速度
    async preloadAiConfigs() {
      try {
        const currentUser = this.$store.state.currentUser;
        if (!currentUser) {
          return;
        }
        
        const userId = currentUser.id;
        if (!userId) {
          return;
        }
        
        // 触发API配置的预加载（如果当前用户不是管理员，则加载可用配置）
        if (!currentUser.isAdmin) {
          await this.$store.dispatch('fetchAvailableAiConfigs', userId);
        }
      } catch (error) {
        // 预加载失败不影响主要功能，仅记录日志
        // console.log('预加载AI配置失败:', error); // 仅调试时使用
      }
    },

    // 显示AI配置修改弹窗
    showAiConfigDialog() {
      this.aiConfigDialogVisible = true
    },

    // 显示AI选择弹窗
    showAiSelectionDialog() {
      this.aiSelectionDialogVisible = true
    },
    
    // 格式化时间（秒转为mm:ss格式）
    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // 客户端连接检测
    async testConnect() {
      const isDeployed = window.location.hostname !== 'localhost' &&
                        window.location.hostname !== '127.0.0.1'

      // 获取当前提供商配置
      const currentProvider = this.aiSystem.providers[this.aiSystem.currentProvider]
      if (!currentProvider) {
        this.$message.error('未配置AI提供商')
        return
      }

      const config = currentProvider.config



      if (isDeployed) {


        // 确保使用HTTPS
        const secureApi = currentProvider.api.replace(/^http:\/\//, 'https://')
        // console.log('使用安全API地址进行测试:', secureApi); // 仅调试时使用

        try {
          const response = await fetch(secureApi, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + config.key,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: config.model,
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1,
              stream: false
            })
          })

          if (response.ok) {
            this.$message.success(this.$t('ai.connectSuccessful'))
            this.clientTipDialogVisible = false
            this.createDialogVisible = true
          } else {
            const errorText = await response.text()
            // console.error('AI API测试失败:', response.status, errorText)
            this.$message.error(`${this.$t('ai.connectFailed')} (${response.status}): ${errorText}`)
          }
        } catch (error) {
          // console.error('AI API测试异常:', error)
          this.$message.error(`${this.$t('ai.connectFailed')}: ${error.message}`)
        }
      } else {
        // 本地环境：测试代理服务
        try {
          const response = await fetch(`http://localhost:${config.port}/ai/test`, {
            method: 'GET'
          })

          this.$message.success(this.$t('ai.connectSuccessful'))
          this.clientTipDialogVisible = false
          this.createDialogVisible = true
        } catch (error) {
          // console.error('代理服务测试失败:', error)
          this.$message.error(this.$t('ai.connectFailed'))
        }
      }
    },

    // 检测ai是否可用
    async aiTest() {
      const isDeployed = window.location.hostname !== 'localhost' &&
                        window.location.hostname !== '127.0.0.1'

      // 获取当前提供商配置
      const currentProvider = this.aiSystem.providers[this.aiSystem.currentProvider]
      if (!currentProvider) {
        this.showAiSelectionDialog()
        throw new Error(this.$t('ai.configurationMissing'))
      }

      const config = currentProvider.config

      // 检查配置
      if (isDeployed) {
        // 部署环境：只检查基本配置，不检查port
        if (!(currentProvider.api && config.key && config.model)) {
          this.showAiSelectionDialog()
          throw new Error(this.$t('ai.configurationMissing'))
        }
        // 部署环境不需要检查本地连接，直接返回
        return
      } else {
        // 本地环境：仅对需要本地代理的提供商（如火山方舟）检查端口与本地连接
        const needsProxy = this.aiSystem.currentProvider === 'huoshan'
        // 基础配置校验
        if (!(currentProvider.api && config.key && config.model)) {
          this.showAiSelectionDialog()
          throw new Error(this.$t('ai.configurationMissing'))
        }
        if (needsProxy) {
          if (!config.port) {
            this.showAiSelectionDialog()
            throw new Error(this.$t('ai.configurationMissing'))
          }
          // 检查本地连接
          let isConnect = false
          try {
            await fetch(`http://localhost:${config.port}/ai/test`, {
              method: 'GET'
            })
            isConnect = true
          } catch (error) {
            console.log(error)
            this.clientTipDialogVisible = true
          }
          if (!isConnect) {
            throw new Error(this.$t('ai.connectFailed'))
          }
        }
        // 对于不需要代理的提供商，跳过本地端口检测，直接通过
      }
    },

    // AI生成整体
    async aiCrateAll() {
      try {
        await this.aiTest()
        this.createDialogVisible = true
      } catch (error) {
        console.log(error)
      }
    },

    // 关闭ai内容输入弹窗
    closeAiCreateDialog() {
      this.createDialogVisible = false
      this.aiInput = ''
    },

    // 确认生成
    async doAiCreate() {
      const aiInputText = this.aiInput.trim()
      if (!aiInputText) {
        this.$message.warning(this.$t('ai.noInputTip'))
        return
      }
      
      // 保存输入内容到实例变量
      this.createContent = aiInputText
      
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
          this.closeAiCreateDialog()
          this.showSaveConfirmDialog()
        } else {
          // 不需要保存，直接开始AI生成
          // console.log('思维导图无变化，直接开始AI生成') // 调试日志，可移除
          this.closeAiCreateDialog()
          await this.startActualAiCreate()
        }
      } catch (error) {
        console.error('检查思维导图是否需要保存时出错:', error)
        // 出错时按需要保存处理
        this.closeAiCreateDialog()
        this.showSaveConfirmDialog()
      }
    },
    
    // 开始实际的AI创建过程
    async startActualAiCreate() {
      this.aiCreatingMaskVisible = true
      // 发起请求
      this.isAiCreating = true
      
      // 启动计时器
      this.startTimer()
      
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
        
        // 使用安全代理发起AI请求
        const aiPayload = {
          messages: [
            {
              role: 'user',
              content: `${this.$t(
                'ai.aiCreateMsgPrefix'
              )}${this.createContent}${this.$t('ai.aiCreateMsgPostfix')}`
            }
          ]
        }
        
        // 先设置为空数据，但不调用setRootNodeCenter（因为此时没有节点）
        this.mindMap.setData(null)
        

        
        // 调用后端代理进行AI请求
        const response = await this.$store.dispatch('callAiThroughProxy', {
          userId: currentUserId,
          aiPayload: aiPayload
        })
        
        // 成功获取AI响应后，开始渲染
        this.aiCreatingContent = response.choices?.[0]?.message?.content || response.content || JSON.stringify(response)
        this.loopRenderOnAiCreating()
        this.resetOnAiCreatingStop()
        this.$message.success(this.$t('ai.aiGenerationSuccess'))
      } catch (error) {
        // console.error('AI生成失败:', error)
        this.resetOnAiCreatingStop()
        this.resetOnRenderEnd()
        
        // 根据错误类型提供更具体的错误信息
        let errorMessage = this.$t('ai.generationFailed')
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
    
    // 启动计时器
    startTimer() {
      // 清除之前的定时器
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
      }
      
      this.aiCreateStartTime = new Date();
      this.aiCreateElapsedTime = 0;
      
      this.timerInterval = setInterval(() => {
        if (this.aiCreatingMaskVisible) { // 只有在遮罩显示时才计时
          const now = new Date();
          this.aiCreateElapsedTime = Math.floor((now - this.aiCreateStartTime) / 1000);
        } else {
          // 如果遮罩已隐藏，停止计时器
          this.stopTimer();
        }
      }, 1000);
    },
    
    // 停止计时器
    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },
    
    // 启动AI续写计时器
    startPartTimer() {
      // 清除之前的续写定时器
      if (this.partTimerInterval) {
        clearInterval(this.partTimerInterval);
      }
      
      this.aiPartStartTime = new Date();
      this.aiPartElapsedTime = 0;
      
      this.partTimerInterval = setInterval(() => {
        if (this.aiPartCreating) { // 只有在续写遮罩显示时才计时
          const now = new Date();
          this.aiPartElapsedTime = Math.floor((now - this.aiPartStartTime) / 1000);
        } else {
          // 如果续写遮罩已隐藏，停止计时器
          this.stopPartTimer();
        }
      }, 1000);
    },
    
    // 停止AI续写计时器
    stopPartTimer() {
      if (this.partTimerInterval) {
        clearInterval(this.partTimerInterval);
        this.partTimerInterval = null;
      }
    },
    
    // AI请求完成或出错后需要复位的数据
    resetOnAiCreatingStop() {
      this.aiCreatingMaskVisible = false
      this.isAiCreating = false
      this.stopTimer()
    },

    // 渲染结束后需要复位的数据
    resetOnRenderEnd() {
      this.isLoopRendering = false
      this.uidMap = {}
      this.aiCreatingContent = ''
      this.mindMapDataCache = ''
      this.beingAiCreateNodeUid = ''
    },

    // 停止生成
    stopCreate() {
      this.isAiCreating = false
      this.aiCreatingMaskVisible = false
      this.stopTimer()
      this.$message.success(this.$t('ai.stoppedGenerating'))
    },

    // 停止AI续写
    stopPartCreate() {
      this.isAiCreating = false
      this.aiPartCreating = false  // 销毁AI续写加载动画
      this.stopPartTimer()
      this.$message.success('已停止AI续写')
    },

    // 轮询进行渲染
    loopRenderOnAiCreating() {
      if (!this.aiCreatingContent.trim() || this.isLoopRendering) return
      

      
      this.isLoopRendering = true
      let treeData
      
      try {
        treeData = transformMarkdownTo(this.aiCreatingContent)
        
        // 验证数据有效性
        if (!treeData || typeof treeData !== 'object') {
          // console.error('转换后的数据无效:', treeData)
          this.isLoopRendering = false
          return
        }
        
        this.addUid(treeData)
      } catch (error) {
        // console.error('数据转换失败:', error)
        this.isLoopRendering = false
        this.$message.error('AI内容解析失败: ' + error.message)
        return
      }
      
      let lastTreeData = JSON.stringify(treeData)

      // 在当前渲染完成时再进行下一次渲染
      const onRenderEnd = () => {
        try {
          // 处理超出画布的节点
          this.checkNodeOuter()

          // 如果生成结束数据渲染完毕，那么解绑事件
          if (!this.isAiCreating && !this.aiCreatingContent) {
            this.mindMap.off('node_tree_render_end', onRenderEnd)
            this.latestUid = ''
            this.resetOnRenderEnd()
            this.$message.success(this.$t('ai.aiGenerationSuccess'))
            return
          }

          const treeData = transformMarkdownTo(this.aiCreatingContent)
          if (!treeData) {
            console.warn('渲染中数据转换失败')
            return
          }
          
          this.addUid(treeData)
          // 正在生成中
          if (this.isAiCreating) {
            // 如果和上次数据一样则不触发重新渲染
            const curTreeData = JSON.stringify(treeData)
            if (curTreeData === lastTreeData) {
              setTimeout(() => {
                onRenderEnd()
              }, 500)
              return
            }
            lastTreeData = curTreeData
            this.mindMap.updateData(treeData)
          } else {
            // 已经生成结束
            // 还要触发一遍渲染，否则会丢失数据
            this.mindMap.updateData(treeData)
            this.resetOnRenderEnd()
            this.$message.success(this.$t('ai.aiGenerationSuccess'))
          }
        } catch (error) {
          // console.error('渲染过程出错:', error)
          this.resetOnAiCreatingStop()
          this.resetOnRenderEnd()
        }
      }
      
      this.mindMap.on('node_tree_render_end', onRenderEnd)

      try {
        this.mindMap.setData(treeData)
        
        // 确保根节点居中（在有数据后调用）
        setTimeout(() => {
          if (this.mindMap.renderer && this.mindMap.renderer.root) {
            this.mindMap.renderer.setRootNodeCenter()
          }
        }, 100)
      } catch (error) {
        // console.error('设置思维导图数据失败:', error)
        this.isLoopRendering = false
        this.resetOnAiCreatingStop()
        this.resetOnRenderEnd()
      }
    },

    // 处理超出画布的节点
    checkNodeOuter() {
      if (this.latestUid) {
        const latestNode = this.mindMap.renderer.findNodeByUid(this.latestUid)
        if (latestNode) {
          const { isOuter, offsetLeft, offsetTop } = checkNodeOuter(
            this.mindMap,
            latestNode,
            100,
            100
          )
          if (isOuter) {
            this.mindMap.view.translateXY(offsetLeft, offsetTop)
          }
        }
      }
    },

    // AI续写专用：修复父子文本合并问题（AI续写时容易出现父节点包含子节点拼接的情况）
    fixParentChildTextMerge(node) {
      if (!node || !node.data || !node.children || node.children.length === 0) {
        return
      }
      
      // 获取纯文本
      const getPlainText = (text) => {
        if (!text) return ''
        return text.replace(/<[^>]*>/g, '').trim()
      }
      
      const parentText = getPlainText(node.data.text)
      const childTexts = node.children.map(child => getPlainText(child.data.text)).filter(Boolean)
      
      // 检查父节点文本是否是子节点的简单拼接
      if (childTexts.length > 0) {
        const childrenJoined = childTexts.join('')
        const parentWithoutSpaces = parentText.replace(/\s/g, '')
        
        // 如果父节点文本包含所有子节点文本的拼接，则提取主题词
        if (parentWithoutSpaces.includes(childrenJoined) || childrenJoined.includes(parentWithoutSpaces)) {
          // 从父节点文本中移除子节点文本，保留主题部分
          let cleanedParent = parentText
          childTexts.forEach(childText => {
            cleanedParent = cleanedParent.replace(childText, '').trim()
          })
          
          // 如果清理后还有内容，使用清理后的；否则尝试从原文提取主题
          if (cleanedParent.length > 0) {
            node.data.text = node.data.richText ? `<p>${cleanedParent}</p>` : cleanedParent
          } else {
            // 尝试从原始父文本开头提取主题词（到第一个子节点文本为止）
            let theme = parentText
            for (const childText of childTexts) {
              const index = theme.indexOf(childText)
              if (index > 0) {
                theme = theme.substring(0, index).trim()
                break
              }
            }
            if (theme && theme !== parentText) {
              node.data.text = node.data.richText ? `<p>${theme}</p>` : theme
            }
          }
        }
      }
      
      // 递归处理子节点
      node.children.forEach(child => {
        this.fixParentChildTextMerge(child)
      })
    },

    // AI续写专用：添加UID（续写场景下需要处理重复内容）
    addUid(data) {
      const checkRepeatUidMap = {}
      const walk = (node, pUid = '') => {
        if (!node.data) {
          node.data = {}
        }
        if (isUndef(node.data.uid)) {
          // 根据pUid+文本内容来复用上一次生成数据的uid
          const key = pUid + '-' + node.data.text
          node.data.uid = this.uidMap[key] || createUid()
          // 当前uid和之前的重复，那么重新生成一个。这种情况很少，但是以防万一
          if (checkRepeatUidMap[node.data.uid]) {
            node.data.uid = createUid()
          }
          this.latestUid = this.uidMap[key] = node.data.uid
          checkRepeatUidMap[node.data.uid] = true
        }
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => {
            walk(child, node.data.uid)
          })
        }
      }
      walk(data)
    },

    // 显示AI续写弹窗
    showAiCreatePartDialog(node) {
      this.beingCreatePartNode = node
      const currentMindMapData = this.mindMap.getData()
      // 填充默认内容
      this.aiPartInput = `${this.$t(
        'ai.aiCreatePartMsgPrefix'
      )}${getStrWithBrFromHtml(currentMindMapData.data.text)}${this.$t(
        'ai.aiCreatePartMsgCenter'
      )}${getStrWithBrFromHtml(node.getData('text'))}${this.$t(
        'ai.aiCreatePartMsgPostfix'
      )}`
      this.createPartDialogVisible = true
    },

    // 关闭AI续写弹窗
    closeAiCreatePartDialog() {
      this.createPartDialogVisible = false
    },

    // 复位AI续写弹窗数据
    resetAiCreatePartDialog() {
      this.beingCreatePartNode = null
      this.aiPartInput = ''
    },

    // 确认AI续写
    confirmAiCreatePart() {
      if (!this.aiPartInput.trim()) return
      this.closeAiCreatePartDialog()
      this.aiCreatePart()
    },

    // AI生成部分
    async aiCreatePart() {
      const originalMindMapId = this.$store.state.currentMindMapId;
      // console.log('🔄 AiCreate - 开始AI续写，续写前ID:', originalMindMapId);
      
      try {
        if (!this.beingCreatePartNode) {
          return
        }
        // 移除旧的aiTest()检查，直接进行续写
        this.beingAiCreateNodeUid = this.beingCreatePartNode.getData('uid')
        const currentMindMapData = this.mindMap.getData()
        this.mindMapDataCache = JSON.stringify(currentMindMapData)
        this.aiPartCreating = true  // 显示AI续写专用加载动画
        // 发起请求
        this.isAiCreating = true
        
        // 启动AI续写计时器
        this.startPartTimer()
        
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

          // 使用安全代理发起AI请求
          const aiPayload = {
            messages: [
              {
                role: 'user',
                content: this.aiPartInput.trim() + this.$t('ai.aiCreatePartMsgHelp')
              }
            ]
          }
          
          // 调用后端代理进行AI请求
          const response = await this.$store.dispatch('callAiThroughProxy', {
            userId: currentUserId,
            aiPayload: aiPayload
          })
          
          // 成功获取AI响应后，开始渲染
          this.aiCreatingContent = response.choices?.[0]?.message?.content || response.content || JSON.stringify(response)
          this.loopRenderOnAiCreatingPart()
          // 为AI续写创建专门的停止处理
          this.isAiCreating = false
          this.aiPartCreating = false  // 结束AI续写加载动画
          this.stopPartTimer()
          this.resetAiCreatePartDialog()
          // console.log('🔄 AiCreate - AI续写成功完成，续写后ID:', this.$store.state.currentMindMapId, '原始ID:', originalMindMapId);
          this.$message.success(this.$t('ai.aiGenerationSuccess'))
        } catch (error) {
          // console.error('AI续写失败:', error)
          // 为AI续写创建专门的错误处理
          this.isAiCreating = false
          this.aiPartCreating = false  // 结束AI续写加载动画
          this.stopPartTimer()
          this.resetAiCreatePartDialog()
          this.resetOnRenderEnd()
          // console.log('🔄 AiCreate - AI续写失败，失败后ID:', this.$store.state.currentMindMapId, '原始ID:', originalMindMapId);
          this.$message.error(this.$t('ai.generationFailed') + ': ' + (error.message || '未知错误'))
        }
      } catch (error) {
        console.log(error)
        // console.log('🔄 AiCreate - AI续写异常，异常后ID:', this.$store.state.currentMindMapId, '原始ID:', originalMindMapId);
      }
    },

    // 将生成的数据添加到指定节点上
    addToTargetNode(newChildren = []) {
      const initData = JSON.parse(this.mindMapDataCache)
      const walk = node => {
        if (node.data.uid === this.beingAiCreateNodeUid) {
          if (!node.children) {
            node.children = []
          }
          node.children.push(...newChildren)
          return
        }
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => {
            walk(child)
          })
        }
      }
      walk(initData)
      return initData
    },

    // 轮询进行部分渲染
    loopRenderOnAiCreatingPart() {
      // console.log('🔄 AiCreate - 开始AI续写渲染，当前ID:', this.$store.state.currentMindMapId);
      if (!this.aiCreatingContent.trim() || this.isLoopRendering) return
      this.isLoopRendering = true
      const partData = transformMarkdownTo(this.aiCreatingContent)
      
      // 修复transformMarkdownTo的父子文本合并问题
      if (partData) {
        this.fixParentChildTextMerge(partData)
      }
      
      this.addUid(partData)
      let lastPartData = JSON.stringify(partData)
      const treeData = this.addToTargetNode(partData.children || [])

      // 在当前渲染完成时再进行下一次渲染
      const onRenderEnd = () => {
        try {
          // 处理超出画布的节点
          this.checkNodeOuter()

          // 如果生成结束数据渲染完毕，那么解绑事件
          if (!this.isAiCreating && !this.aiCreatingContent) {
            // AI续写结束，检查当前ID（续写不应该改变ID）
            // console.log('🎯 AiCreate - AI续写结束，当前ID保持不变:', this.$store.state.currentMindMapId);
            this.mindMap.off('node_tree_render_end', onRenderEnd)
            this.latestUid = ''
            return
          }

          const partData = transformMarkdownTo(this.aiCreatingContent)
          
          // 修复transformMarkdownTo的父子文本合并问题
          if (partData) {
            this.fixParentChildTextMerge(partData)
          }
          
          this.addUid(partData)
          const treeData = this.addToTargetNode(partData.children || [])

          if (this.isAiCreating) {
            // 如果和上次数据一样则不触发重新渲染
            const curPartData = JSON.stringify(partData)
            if (curPartData === lastPartData) {
              setTimeout(() => {
                onRenderEnd()
              }, 500)
              return
            }
            lastPartData = curPartData
            this.mindMap.updateData(treeData)
          } else {
            this.mindMap.updateData(treeData)
            // AI续写成功完成，检查当前ID（续写不应该改变ID）
            // console.log('🎯 AiCreate - AI续写成功完成，当前ID保持不变:', this.$store.state.currentMindMapId);
            this.resetOnRenderEnd()
            this.$message.success(this.$t('ai.aiGenerationSuccess'))
          }
        } catch (error) {
          // console.error('🔄 AiCreate - AI续写渲染过程出错:', error);
          // 续写出错时，当前ID也应保持不变
          // console.log('🎯 AiCreate - AI续写渲染出错，当前ID保持不变:', this.$store.state.currentMindMapId);
          // 解绑事件以避免循环调用
          this.mindMap.off('node_tree_render_end', onRenderEnd)
          this.resetOnRenderEnd()
        }
      }
      this.mindMap.on('node_tree_render_end', onRenderEnd)
      // 因为是续写，所以首次也直接使用updateData方法渲染
      this.mindMap.updateData(treeData)
    },

    // AI对话
    async aiChat(
      messageList = [],
      progress = () => {},
      end = () => {},
      err = () => {}
    ) {
      try {
        // 移除旧的aiTest()检查，直接进行AI对话
        
        // 检查用户是否有AI权限和有效的AI配置
        const currentUserId = this.$store.state.currentUser?.id
        if (!currentUserId) {
          throw new Error('用户未登录')
        }
        
        const currentConfig = await this.$store.dispatch('fetchUserCurrentAiConfig', currentUserId)
        if (!currentConfig) {
          throw new Error('未选择AI配置，请先选择AI服务')
        }

        // 使用安全代理发起AI请求
        const aiPayload = {
          messages: messageList.map(msg => {
            return {
              role: 'user',
              content: msg
            }
          })
        }
        
        try {
          // 发起安全AI请求
          this.isAiCreating = true
          const response = await this.$store.dispatch('callAiThroughProxy', {
            userId: currentUserId,
            aiPayload: aiPayload
          })
          
          const content = response.choices?.[0]?.message?.content || response.content || JSON.stringify(response)
          progress(content)
          end(content)
        } catch (error) {
          // console.error('AI对话失败:', error)
          err(error)
        } finally {
          this.isAiCreating = false
        }
      } catch (error) {
        console.log(error)
        err(error)
      }
    },

    // AI对话停止
    aiChatStop() {
      this.isAiCreating = false
    },

    // 显示保存确认对话框
    showSaveConfirmDialog() {
      // console.log('🎯 AiCreate - 显示保存确认对话框');
      
      // 获取当前思维导图的标题（从根节点获取）
      this.getCurrentMindMapTitle();
      
      // 显示确认对话框
      this.saveConfirmVisible = true;
    },

    // 生成思维导图数据
    generateMindMapData() {
      if (!this.aiCreatingContent.trim()) {
        // console.error('❌ AiCreate - 没有生成内容');
        return;
      }
      
      try {
        const treeData = transformMarkdownTo(this.aiCreatingContent);
        
        if (!treeData || typeof treeData !== 'object') {
          throw new Error('思维导图转换失败：数据结构不完整');
        }
        
        // 添加唯一标识
        this.addUid(treeData);
        
        // 存储生成的数据
        this.generatedMindMapData = treeData;
        // console.log('✅ AiCreate - 思维导图数据生成完成');
        
      } catch (error) {
        // console.error('❌ AiCreate - 思维导图数据生成失败:', error);
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
        // console.log('📝 AiCreate - 当前思维导图标题:', this.currentMindMapTitle);
      } catch (error) {
        // console.error('❌ AiCreate - 获取当前标题失败:', error);
        this.currentMindMapTitle = '未命名思维导图';
      }
    },

    // 处理保存并应用
    async handleSaveAndApply() {
      // console.log('💾 AiCreate - 保存当前思维导图，然后开始生成');
      
      try {
        // 1. 先保存当前思维导图
        await this.saveCurrentMindMap();
        // console.log('✅ AiCreate - 当前思维导图已保存');
        
        // 2. 关闭确认对话框
        this.saveConfirmVisible = false;
        
        // 3. 开始AI生成
        await this.startActualAiCreate();
        
      } catch (error) {
        // console.error('❌ AiCreate - 保存失败:', error);
        this.$message.error('保存失败: ' + error.message);
        this.saveConfirmVisible = false;
      }
    },

    // 处理覆盖
    async handleOverwrite() {
      // console.log('🔄 AiCreate - 直接开始生成（不保存当前内容）');
      
      // 1. 关闭确认对话框
      this.saveConfirmVisible = false;
      
      // 2. 直接开始AI生成
      await this.startActualAiCreate();
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
      
      // console.log('💾 AiCreate - 开始保存当前思维导图，当前ID:', currentMindMapId);
      
      if (!currentUser) {
        throw new Error('用户未登录');
      }

      // 获取当前思维导图数据
      const currentData = this.mindMap.getData(true);
      
      if (currentMindMapId) {
        // 有ID，更新现有思维导图
        // console.log('📝 AiCreate - 更新现有思维导图, ID:', currentMindMapId);
        
        await this.$store.dispatch('saveMindMap', {
          id: currentMindMapId,
          userId: currentUser.id,
          title: this.currentMindMapTitle,
          content: currentData,
          isUpdate: true
        });
        
        // 保存成功后，立即更新本地缓存
        try {
          const cacheKey = `mindmap_cache_${currentMindMapId}`;
          localStorage.setItem(cacheKey, JSON.stringify(currentData));
        } catch (error) {
          // console.error('保存思维导图缓存失败:', error);
        }
        
      } else {
        // 无ID，创建新思维导图
        // console.log('📝 AiCreate - 创建新思维导图（ID为空）');
        
        const result = await this.$store.dispatch('saveMindMap', {
          userId: currentUser.id,
          title: this.currentMindMapTitle,
          content: currentData,
          isUpdate: false
        });
        
        // 更新当前思维导图ID
        if (result && result.id) {
          // console.log('🔄 AiCreate - 保存新思维导图后，ID设置为:', result.id);
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
      // console.log('💾 AiCreate - 保存操作完成，当前ID:', this.$store.state.currentMindMapId);
    },

    // 应用生成的数据
    applyGeneratedData() {
      if (!this.generatedMindMapData) {
        // console.error('❌ AiCreate - 没有可应用的数据');
        return;
      }

      try {
        // console.log('🎯 AiCreate - 应用AI生成的数据');
        
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
        this.resetOnRenderEnd();
        
      } catch (error) {
        // console.error('❌ AiCreate - 应用数据失败:', error);
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

    // 初始化创建对话框拖拽功能
    initCreateDialogDrag() {
      // 尝试多种选择器
      let dialogHeaderEl = document.querySelector('.draggable-ai-create-dialog .el-dialog__header')
      let dragDom = document.querySelector('.draggable-ai-create-dialog .el-dialog')

      // 如果custom-class找不到，尝试原始class
      if (!dialogHeaderEl || !dragDom) {
        dialogHeaderEl = document.querySelector('.createDialog .el-dialog__header')
        dragDom = document.querySelector('.createDialog .el-dialog')
      }

      if (!dialogHeaderEl || !dragDom) {
        // console.log('AI创建对话框元素未找到，所有选择器都失败')
        return
      }
      
      // console.log('AI创建对话框拖拽初始化成功')

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

        this.createDialogDragHandler = {
          element: dialogHeaderEl,
          mousedownHandler: mousedownHandler
        }
    },

    // 初始化续写对话框拖拽功能
    initPartDialogDrag() {
      // 尝试多种选择器
      let dialogHeaderEl = document.querySelector('.draggable-ai-create-part-dialog .el-dialog__header')
      let dragDom = document.querySelector('.draggable-ai-create-part-dialog .el-dialog')

      // 如果custom-class找不到，尝试原始class（续写对话框也使用createDialog class）
      if (!dialogHeaderEl || !dragDom) {
        // 查找所有createDialog中标题包含"续写"或"AI续写"的
        const allDialogs = document.querySelectorAll('.createDialog .el-dialog')
        for (let dialog of allDialogs) {
          const title = dialog.querySelector('.el-dialog__title')
          if (title && (title.textContent.includes('续写') || title.textContent.includes('AI续写'))) {
            dragDom = dialog
            dialogHeaderEl = dialog.querySelector('.el-dialog__header')
            break
          }
        }
      }

      if (!dialogHeaderEl || !dragDom) {
        // console.log('AI续写对话框元素未找到，所有选择器都失败')
        return
      }
      
      // console.log('AI续写对话框拖拽初始化成功')

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

        this.partDialogDragHandler = {
          element: dialogHeaderEl,
          mousedownHandler: mousedownHandler
        }
    },

    // 清理创建对话框拖拽事件
    cleanupCreateDialogDragEvents() {
      if (this.createDialogDragHandler) {
        this.createDialogDragHandler.element.removeEventListener('mousedown', this.createDialogDragHandler.mousedownHandler)
        this.createDialogDragHandler = null
      }
    },

    // 清理续写对话框拖拽事件
    cleanupPartDialogDragEvents() {
      if (this.partDialogDragHandler) {
        this.partDialogDragHandler.element.removeEventListener('mousedown', this.partDialogDragHandler.mousedownHandler)
        this.partDialogDragHandler = null
      }
    }
  }
}
</script>

<style lang="less" scoped>
.clientTipDialog,
.createDialog {
  /deep/ .el-dialog__body {
    padding: 12px 20px;
  }
}

.tipBox {
  p {
    margin-bottom: 12px;

    a {
      color: #409eff;
    }
  }
}

.inputBox {
  .tip {
    margin-top: 12px;

    &.warning {
      color: #f56c6c;
    }
  }
}

// 设置AI创建和AI续写对话框中的文本输入框为不同背景色
// AI创建对话框的输入框使用白色背景
.draggable-ai-create-dialog .el-textarea__inner {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
// AI续写对话框的输入框使用浅灰色背景
.draggable-ai-create-part-dialog .el-textarea__inner {
  background-color: #f5f7fa !important;  /* 浅灰色背景 */
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
// 使用深度选择器确保样式传播到子组件
::v-deep .draggable-ai-create-dialog .el-textarea .el-textarea__inner {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
::v-deep .draggable-ai-create-part-dialog .el-textarea .el-textarea__inner {
  background-color: #f5f7fa !important;  /* 浅灰色背景 */
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
// 兼容旧版Vue的/deep/写法
/deep/ .draggable-ai-create-dialog .el-textarea .el-textarea__inner {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}
/deep/ .draggable-ai-create-part-dialog .el-textarea .el-textarea__inner {
  background-color: #f5f7fa !important;  /* 浅灰色背景 */
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}

// AI续写对话框使用更高优先级的选择器
.createDialog.draggable-ai-create-part-dialog .el-textarea__inner {
  background-color: #f5f7fa !important;  /* 浅灰色背景 */
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}

// 使用最高优先级的深度选择器
/deep/ .createDialog.draggable-ai-create-part-dialog .el-textarea .el-textarea__inner {
  background-color: #f5f7fa !important;  /* 浅灰色背景 */
  border-color: #dcdfe6 !important;
  color: #606266 !important;
}

// AI续写对话框 - 使用scoped样式和深度选择器
::v-deep .draggable-ai-create-part-dialog .el-textarea .el-textarea__inner {
  background-color: #2a2d3a !important;  /* 深灰蓝色背景 */
  border-color: #4a4e5c !important;
  color: #e4e7ed !important;
}

.aiCreatingMask {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 99999;
  background-color: transparent;

  .btn {
    position: absolute;
    left: 50%;
    top: 130px; /* 调整位置为给计时器留出空间 */
    transform: translateX(-50%);
  }
  
  .ai-timer {
    position: absolute;
    left: 50%;
    top: 80px; /* 位于按钮上方 */
    transform: translateX(-50%);
    text-align: center;
    z-index: 100000; /* 确保计时器在最上层 */
    
    .timer-text {
      font-size: 16px;
      font-weight: bold;
      color: #409EFF;
      background-color: rgba(255, 255, 255, 0.9);
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
      display: inline-block;
    }
  }
}

// AI续写专用加载动画遮罩层
.aiPartCreatingMask {
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

.ai-part-loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative; /* 为计时器定位做准备 */
}

.ai-part-loading-icon {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.ai-timer-part {
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// AI续写停止按钮在遮罩层中的位置与AiCreate相同
.aiPartCreatingMask .btn {
  position: absolute;
  left: 50%;
  top: 150px; /* 调整位置为给计时器留出空间 */
  transform: translateX(-50%);
}

// 深色主题适配
body.isDark .aiPartCreatingMask {
  background-color: rgba(0, 0, 0, 0.7);
}

body.isDark .ai-part-loading-icon {
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top: 3px solid #409eff;
}

// 保存确认对话框样式（复用 UnifiedAiCreateDialog 的样式）
.saveConfirmDialog {
  .confirm-content {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 20px 0;
    
    .confirm-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      background: rgba(230, 162, 60, 0.1);
      border-radius: 50%;
    }
    
    .confirm-text {
      flex: 1;
      
      h3 {
        margin: 0 0 15px 0;
        font-size: 18px;
        color: #303133;
        font-weight: 600;
        line-height: 1.4;
      }
      
      .current-title {
        margin: 10px 0;
        padding: 8px 12px;
        background: #f5f7fa;
        border-radius: 4px;
        color: #606266;
        font-size: 14px;
        font-weight: 500;
        border-left: 3px solid #409EFF;
      }
      
      .tip-text {
        margin: 8px 0;
        color: #909399;
        font-size: 13px;
        line-height: 1.5;
        
        &:first-of-type {
          color: #67C23A;
        }
        
        &:last-of-type {
          color: #F56C6C;
        }
      }
    }
  }
  
  .dialog-footer {
    text-align: right;
    padding-top: 20px;
    border-top: 1px solid #EBEEF5;
    
    .el-button {
      margin-left: 12px;
      
      &:first-child {
        margin-left: 0;
      }
      
      i {
        margin-right: 5px;
      }
    }
  }
}

// 深色主题下的保存确认对话框
body.isDark {
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
      .confirm-icon {
        background: rgba(230, 162, 60, 0.2);
      }
      
      .confirm-text {
        h3 {
          color: hsla(0, 0%, 100%, 0.9);
        }
        
        .current-title {
          background: #363b3f;
          color: hsla(0, 0%, 100%, 0.8);
          border-left-color: #409EFF;
        }
        
        .tip-text {
          color: hsla(0, 0%, 100%, 0.6);
          
          &:first-of-type {
            color: #67C23A;
          }
          
          &:last-of-type {
            color: #F56C6C;
          }
        }
      }
    }
    
    .dialog-footer {
      border-top-color: #404040;
    }
  }
}
</style>
