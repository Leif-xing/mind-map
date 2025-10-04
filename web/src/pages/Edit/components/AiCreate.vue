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
          }}<el-button size="small" @click="showAiConfigDialog">{{
            $t('ai.modifyAIConfiguration')
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
      <el-button type="warning" class="btn" @click="stopCreate">{{
        $t('ai.stopGenerating')
      }}</el-button>
    </div>
    <AiConfigDialog v-model="aiConfigDialogVisible"></AiConfigDialog>
    <!-- AI续写 -->
    <el-dialog
      class="createDialog"
      :title="$t('ai.aiCreatePart')"
      :visible.sync="createPartDialogVisible"
      width="450px"
      append-to-body
    >
      <div class="inputBox">
        <el-input type="textarea" :rows="5" v-model="aiPartInput"> </el-input>
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
import Ai from '@/utils/ai'
import { transformMarkdownTo } from 'simple-mind-map/src/parse/markdownTo'
import {
  createUid,
  isUndef,
  checkNodeOuter,
  getStrWithBrFromHtml
} from 'simple-mind-map/src/utils'
import { mapState } from 'vuex'
import AiConfigDialog from './AiConfigDialog.vue'

export default {
  components: {
    AiConfigDialog
  },
  props: {
    mindMap: {
      type: Object
    }
  },
  data() {
    return {
      aiInstance: null,
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

      mindMapDataCache: '',
      beingAiCreateNodeUid: '',

      createPartDialogVisible: false,
      aiPartInput: '',
      beingCreatePartNode: null
    }
  },
  computed: {
    ...mapState(['aiSystem']),

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
    }
  },
  created() {
    this.$bus.$on('ai_create_all', this.aiCrateAll)
    this.$bus.$on('ai_create_part', this.showAiCreatePartDialog)
    this.$bus.$on('ai_chat', this.aiChat)
    this.$bus.$on('ai_chat_stop', this.aiChatStop)
    this.$bus.$on('showAiConfigDialog', this.showAiConfigDialog)
  },
  mounted() {
    document.body.appendChild(this.$refs.aiCreatingMaskRef)
  },
  beforeDestroy() {
    this.$bus.$off('ai_create_all', this.aiCrateAll)
    this.$bus.$off('ai_create_part', this.showAiCreatePartDialog)
    this.$bus.$off('ai_chat', this.aiChat)
    this.$bus.$off('ai_chat_stop', this.aiChatStop)
    this.$bus.$off('showAiConfigDialog', this.showAiConfigDialog)
  },
  methods: {
    // 显示AI配置修改弹窗
    showAiConfigDialog() {
      this.aiConfigDialogVisible = true
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

      console.log('AI连接测试:', {
        hostname: window.location.hostname,
        isDeployed: isDeployed,
        currentProvider: currentProvider.name,
        config: {
          api: currentProvider.api,
          model: config.model,
          hasKey: !!config.key,
          port: config.port
        }
      })

      if (isDeployed) {
        // 部署环境：直接测试AI API
        console.log('部署环境 - 测试AI API连接...')

        // 确保使用HTTPS
        const secureApi = currentProvider.api.replace(/^http:\/\//, 'https://')
        console.log('使用安全API地址进行测试:', secureApi)

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
          console.log('AI API测试响应:', response.status, response.statusText)

          if (response.ok) {
            this.$message.success(this.$t('ai.connectSuccessful'))
            this.clientTipDialogVisible = false
            this.createDialogVisible = true
          } else {
            const errorText = await response.text()
            console.error('AI API测试失败:', response.status, errorText)
            this.$message.error(`${this.$t('ai.connectFailed')} (${response.status}): ${errorText}`)
          }
        } catch (error) {
          console.error('AI API测试异常:', error)
          this.$message.error(`${this.$t('ai.connectFailed')}: ${error.message}`)
        }
      } else {
        // 本地环境：测试代理服务
        console.log('本地环境 - 测试代理服务连接...')
        try {
          const response = await fetch(`http://localhost:${config.port}/ai/test`, {
            method: 'GET'
          })
          console.log('代理服务测试响应:', response.status)

          this.$message.success(this.$t('ai.connectSuccessful'))
          this.clientTipDialogVisible = false
          this.createDialogVisible = true
        } catch (error) {
          console.error('代理服务测试失败:', error)
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
        this.showAiConfigDialog()
        throw new Error(this.$t('ai.configurationMissing'))
      }

      const config = currentProvider.config

      // 检查配置
      if (isDeployed) {
        // 部署环境：只检查基本配置，不检查port
        if (!(currentProvider.api && config.key && config.model)) {
          this.showAiConfigDialog()
          throw new Error(this.$t('ai.configurationMissing'))
        }
        // 部署环境不需要检查本地连接，直接返回
        return
      } else {
        // 本地环境：仅对需要本地代理的提供商（如火山方舟）检查端口与本地连接
        const needsProxy = this.aiSystem.currentProvider === 'huoshan'
        // 基础配置校验
        if (!(currentProvider.api && config.key && config.model)) {
          this.showAiConfigDialog()
          throw new Error(this.$t('ai.configurationMissing'))
        }
        if (needsProxy) {
          if (!config.port) {
            this.showAiConfigDialog()
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
    doAiCreate() {
      const aiInputText = this.aiInput.trim()
      if (!aiInputText) {
        this.$message.warning(this.$t('ai.noInputTip'))
        return
      }
      
      console.log('开始AI生成，输入内容:', aiInputText)
      
      this.closeAiCreateDialog()
      this.aiCreatingMaskVisible = true
      // 发起请求
      this.isAiCreating = true
      // 获取当前提供商配置
      const currentProvider = this.aiSystem.providers[this.aiSystem.currentProvider]
      const config = currentProvider.config

      this.aiInstance = new Ai({
        port: config.port
      })
      this.aiInstance.init(this.aiSystem.currentProvider, config)
      
      // 先设置为空数据，但不调用setRootNodeCenter（因为此时没有节点）
      this.mindMap.setData(null)
      
      console.log('发起AI请求...')
      this.aiInstance.request(
        {
          messages: [
            {
              role: 'user',
              content: `${this.$t(
                'ai.aiCreateMsgPrefix'
              )}${aiInputText}${this.$t('ai.aiCreateMsgPostfix')}`
            }
          ]
        },
        content => {
          if (content) {
            const arr = content.split(/\n+/)
            this.aiCreatingContent = arr.splice(0, arr.length - 1).join('\n')
          }
          this.loopRenderOnAiCreating()
        },
        content => {
          this.aiCreatingContent = content
          this.resetOnAiCreatingStop()
        },
        (error) => {
          console.error('AI生成失败:', error)
          this.resetOnAiCreatingStop()
          this.resetOnRenderEnd()
          this.$message.error(this.$t('ai.generationFailed') + ': ' + (error.message || '未知错误'))
        }
      )
    },

    // AI请求完成或出错后需要复位的数据
    resetOnAiCreatingStop() {
      this.aiCreatingMaskVisible = false
      this.isAiCreating = false
      this.aiInstance = null
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
      this.aiInstance.stop()
      this.isAiCreating = false
      this.aiCreatingMaskVisible = false
      this.$message.success(this.$t('ai.stoppedGenerating'))
    },

    // 轮询进行渲染
    loopRenderOnAiCreating() {
      if (!this.aiCreatingContent.trim() || this.isLoopRendering) return
      
      console.log('开始渲染AI内容:', this.aiCreatingContent)
      
      this.isLoopRendering = true
      let treeData
      
      try {
        treeData = transformMarkdownTo(this.aiCreatingContent)
        console.log('转换后的树数据:', treeData)
        
        // 验证数据有效性
        if (!treeData || typeof treeData !== 'object') {
          console.error('转换后的数据无效:', treeData)
          this.isLoopRendering = false
          return
        }
        
        this.addUid(treeData)
      } catch (error) {
        console.error('数据转换失败:', error)
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
          console.error('渲染过程出错:', error)
          this.resetOnAiCreatingStop()
          this.resetOnRenderEnd()
        }
      }
      
      this.mindMap.on('node_tree_render_end', onRenderEnd)

      try {
        console.log('设置思维导图数据...')
        this.mindMap.setData(treeData)
        
        // 确保根节点居中（在有数据后调用）
        setTimeout(() => {
          if (this.mindMap.renderer && this.mindMap.renderer.root) {
            console.log('设置根节点居中...')
            this.mindMap.renderer.setRootNodeCenter()
          }
        }, 100)
      } catch (error) {
        console.error('设置思维导图数据失败:', error)
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
      try {
        if (!this.beingCreatePartNode) {
          return
        }
        await this.aiTest()
        this.beingAiCreateNodeUid = this.beingCreatePartNode.getData('uid')
        const currentMindMapData = this.mindMap.getData()
        this.mindMapDataCache = JSON.stringify(currentMindMapData)
        this.aiCreatingMaskVisible = true
        // 发起请求
        this.isAiCreating = true
        // 获取当前提供商配置
        const currentProvider = this.aiSystem.providers[this.aiSystem.currentProvider]
        const config = currentProvider.config

        this.aiInstance = new Ai({
          port: config.port
        })
        this.aiInstance.init(this.aiSystem.currentProvider, config)
        this.aiInstance.request(
          {
            messages: [
              {
                role: 'user',
                content:
                  this.aiPartInput.trim() + this.$t('ai.aiCreatePartMsgHelp')
              }
            ]
          },
          content => {
            if (content) {
              const arr = content.split(/\n+/)
              this.aiCreatingContent = arr.splice(0, arr.length - 1).join('\n')
            }

            this.loopRenderOnAiCreatingPart()
          },
          content => {
            this.aiCreatingContent = content
            this.resetOnAiCreatingStop()
            this.resetAiCreatePartDialog()
          },
          () => {
            this.resetOnAiCreatingStop()
            this.resetAiCreatePartDialog()
            this.resetOnRenderEnd()
            this.$message.error(this.$t('ai.generationFailed'))
          }
        )
      } catch (error) {
        console.log(error)
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
        // 处理超出画布的节点
        this.checkNodeOuter()

        // 如果生成结束数据渲染完毕，那么解绑事件
        if (!this.isAiCreating && !this.aiCreatingContent) {
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
          this.resetOnRenderEnd()
          this.$message.success(this.$t('ai.aiGenerationSuccess'))
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
        await this.aiTest()
        // 发起请求
        this.isAiCreating = true
        // 获取当前提供商配置
        const currentProvider = this.aiSystem.providers[this.aiSystem.currentProvider]
        const config = currentProvider.config

        this.aiInstance = new Ai({
          port: config.port
        })
        this.aiInstance.init(this.aiSystem.currentProvider, config)
        this.aiInstance.request(
          {
            messages: messageList.map(msg => {
              return {
                role: 'user',
                content: msg
              }
            })
          },
          content => {
            progress(content)
          },
          content => {
            end(content)
          },
          error => {
            err(error)
          }
        )
      } catch (error) {
        console.log(error)
      }
    },

    // AI对话停止
    aiChatStop() {
      if (this.aiInstance) {
        this.aiInstance.stop()
        this.isAiCreating = false
        this.aiInstance = null
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
    top: 100px;
    transform: translateX(-50%);
  }
}
</style>
