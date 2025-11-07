<template>
  <div
    class="editContainer"
    @dragenter.stop.prevent="onDragenter"
    @dragleave.stop.prevent
    @dragover.stop.prevent
    @drop.stop.prevent
  >
    <!-- 左侧边栏触发器 -->
    <LeftSidebarTrigger />
    
    <!-- 编辑器页面 -->
    <div v-show="currentPage === 'editor'" class="editor-page">
    <div
      class="mindMapContainer"
      id="mindMapContainer"
      ref="mindMapContainer"
    ></div>
    <!-- <Count :mindMap="mindMap" v-if="!isZenMode"></Count> -->
    <Navigator v-if="mindMap" :mindMap="mindMap"></Navigator>
    <NavigatorToolbar :mindMap="mindMap" v-if="!isZenMode"></NavigatorToolbar>
    <OutlineSidebar :mindMap="mindMap"></OutlineSidebar>
    <Style v-if="mindMap && !isZenMode" :mindMap="mindMap"></Style>
    <BaseStyle
      :data="mindMapData"
      :configData="mindMapConfig"
      :mindMap="mindMap"
    ></BaseStyle>
    <AssociativeLineStyle
      v-if="mindMap"
      :mindMap="mindMap"
    ></AssociativeLineStyle>
    <Theme v-if="mindMap" :data="mindMapData" :mindMap="mindMap"></Theme>
    <Structure :mindMap="mindMap"></Structure>
    <ShortcutKey></ShortcutKey>
    <Contextmenu v-if="mindMap" :mindMap="mindMap"></Contextmenu>
    <RichTextToolbar v-if="mindMap" :mindMap="mindMap"></RichTextToolbar>
    <NodeNoteContentShow
      v-if="mindMap"
      :mindMap="mindMap"
    ></NodeNoteContentShow>
    <NodeImgPreview v-if="mindMap" :mindMap="mindMap"></NodeImgPreview>
    <SidebarTrigger v-if="!isZenMode"></SidebarTrigger>
    <Search v-if="mindMap" :mindMap="mindMap"></Search>
    <NodeIconSidebar v-if="mindMap" :mindMap="mindMap"></NodeIconSidebar>
    <NodeIconToolbar v-if="mindMap" :mindMap="mindMap"></NodeIconToolbar>
    <OutlineEdit v-if="mindMap" :mindMap="mindMap"></OutlineEdit>
    <Scrollbar v-if="isShowScrollbar && mindMap" :mindMap="mindMap"></Scrollbar>
    <FormulaSidebar v-if="mindMap" :mindMap="mindMap"></FormulaSidebar>
    <NodeOuterFrame v-if="mindMap" :mindMap="mindMap"></NodeOuterFrame>
    <NodeTagStyle v-if="mindMap" :mindMap="mindMap"></NodeTagStyle>
    <Setting :configData="mindMapConfig" :mindMap="mindMap"></Setting>
    <NodeImgPlacementToolbar
      v-if="mindMap"
      :mindMap="mindMap"
    ></NodeImgPlacementToolbar>
    <NodeNoteSidebar v-if="mindMap" :mindMap="mindMap"></NodeNoteSidebar>
    <TagMindmapSidebar v-if="mindMap" :mindMap="mindMap"></TagMindmapSidebar>
    <AiCreate v-if="mindMap && enableAi" :mindMap="mindMap"></AiCreate>
    <UnifiedAiManager v-if="mindMap" :mindMap="mindMap"></UnifiedAiManager>
    <AiChat v-if="enableAi"></AiChat>
    <div
      class="dragMask"
      v-if="showDragMask"
      @dragleave.stop.prevent="onDragleave"
      @dragover.stop.prevent
      @drop.stop.prevent="onDrop"
    >
      <div class="dragTip">{{ $t('edit.dragTip') }}</div>
    </div>
    </div>
    
    <!-- 思维导图管理页面 -->
    <TagMindmapPage v-show="currentPage === 'mindmap-manager'" />
  </div>
</template>

<script>
import MindMap from 'simple-mind-map'
import MiniMap from 'simple-mind-map/src/plugins/MiniMap.js'
import Watermark from 'simple-mind-map/src/plugins/Watermark.js'
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import ExportPDF from 'simple-mind-map/src/plugins/ExportPDF.js'
import ExportXMind from 'simple-mind-map/src/plugins/ExportXMind.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import Drag from 'simple-mind-map/src/plugins/Drag.js'
import Select from 'simple-mind-map/src/plugins/Select.js'
import RichText from 'simple-mind-map/src/plugins/RichText.js'
import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine.js'
import TouchEvent from 'simple-mind-map/src/plugins/TouchEvent.js'
import NodeImgAdjust from 'simple-mind-map/src/plugins/NodeImgAdjust.js'
import SearchPlugin from 'simple-mind-map/src/plugins/Search.js'
import Painter from 'simple-mind-map/src/plugins/Painter.js'
import ScrollbarPlugin from 'simple-mind-map/src/plugins/Scrollbar.js'
import Formula from 'simple-mind-map/src/plugins/Formula.js'
import RainbowLines from 'simple-mind-map/src/plugins/RainbowLines.js'
import Demonstrate from 'simple-mind-map/src/plugins/Demonstrate.js'
import OuterFrame from 'simple-mind-map/src/plugins/OuterFrame.js'
import MindMapLayoutPro from 'simple-mind-map/src/plugins/MindMapLayoutPro.js'
import NodeBase64ImageStorage from 'simple-mind-map/src/plugins/NodeBase64ImageStorage.js'
import Themes from 'simple-mind-map-plugin-themes'
// 协同编辑插件
// import Cooperate from 'simple-mind-map/src/plugins/Cooperate.js'
import OutlineSidebar from './OutlineSidebar.vue'
import Style from './Style.vue'
import BaseStyle from './BaseStyle.vue'
import Theme from './Theme.vue'
import Structure from './Structure.vue'
import Count from './Count.vue'
import NavigatorToolbar from './NavigatorToolbar.vue'
import ShortcutKey from './ShortcutKey.vue'
import Contextmenu from './Contextmenu.vue'
import RichTextToolbar from './RichTextToolbar.vue'
import NodeNoteContentShow from './NodeNoteContentShow.vue'
import { getData, getConfig, storeData } from '@/api'
import Navigator from './Navigator.vue'
import NodeImgPreview from './NodeImgPreview.vue'
import SidebarTrigger from './SidebarTrigger.vue'
import { mapState } from 'vuex'
import icon from '@/config/icon'
import Vue from 'vue'
import Search from './Search.vue'
import NodeIconSidebar from './NodeIconSidebar.vue'
import NodeIconToolbar from './NodeIconToolbar.vue'
import OutlineEdit from './OutlineEdit.vue'
import { showLoading, hideLoading } from '@/utils/loading'
import handleClipboardText from '@/utils/handleClipboardText'
import Scrollbar from './Scrollbar.vue'
import exampleData from 'simple-mind-map/example/exampleData'
import FormulaSidebar from './FormulaSidebar.vue'
import NodeOuterFrame from './NodeOuterFrame.vue'
import NodeTagStyle from './NodeTagStyle.vue'
import Setting from './Setting.vue'
import AssociativeLineStyle from './AssociativeLineStyle.vue'
import NodeImgPlacementToolbar from './NodeImgPlacementToolbar.vue'
import NodeNoteSidebar from './NodeNoteSidebar.vue'
import TagMindmapSidebar from './TagMindmapSidebar.vue'
import LeftSidebarTrigger from './LeftSidebarTrigger.vue'
import TagMindmapPage from './TagMindmapPage.vue'
import AiCreate from './AiCreate.vue'
import UnifiedAiManager from './UnifiedAiManager.vue'
import AiChat from './AiChat.vue'
import { sortIconList } from '@/utils/index.js'

// 注册插件
MindMap.usePlugin(MiniMap)
  .usePlugin(Watermark)
  .usePlugin(Drag)
  .usePlugin(KeyboardNavigation)
  .usePlugin(ExportPDF)
  .usePlugin(ExportXMind)
  .usePlugin(Export)
  .usePlugin(Select)
  .usePlugin(AssociativeLine)
  .usePlugin(NodeImgAdjust)
  .usePlugin(TouchEvent)
  .usePlugin(SearchPlugin)
  .usePlugin(Painter)
  .usePlugin(Formula)
  .usePlugin(RainbowLines)
  .usePlugin(Demonstrate)
  .usePlugin(OuterFrame)
  .usePlugin(MindMapLayoutPro)
  .usePlugin(NodeBase64ImageStorage)
// .usePlugin(Cooperate) // 协同插件

// 注册主题
Themes.init(MindMap)
// 扩展主题列表
if (typeof MoreThemes !== 'undefined') {
  MoreThemes.init(MindMap)
}

export default {
  components: {
    OutlineSidebar,
    Style,
    BaseStyle,
    Theme,
    Structure,
    Count,
    NavigatorToolbar,
    ShortcutKey,
    Contextmenu,
    RichTextToolbar,
    NodeNoteContentShow,
    Navigator,
    NodeImgPreview,
    SidebarTrigger,
    Search,
    NodeIconSidebar,
    NodeIconToolbar,
    OutlineEdit,
    Scrollbar,
    FormulaSidebar,
    NodeOuterFrame,
    NodeTagStyle,
    Setting,
    AssociativeLineStyle,
    NodeImgPlacementToolbar,
    NodeNoteSidebar,
    TagMindmapSidebar,
    LeftSidebarTrigger,
    TagMindmapPage,
    AiCreate,
    UnifiedAiManager,
    AiChat
  },
  data() {
    return {
      enableShowLoading: true,
      mindMap: null,
      mindMapData: null,
      mindMapConfig: {},
      prevImg: '',
      storeConfigTimer: null,
      showDragMask: false,
      lastSavedData: null, // 保存最后保存的数据，用于检测是否有修改
      currentPage: 'editor' // 'editor' | 'mindmap-manager'
    }
  },
  computed: {
    ...mapState({
      isZenMode: state => state.localConfig.isZenMode,
      openNodeRichText: state => state.localConfig.openNodeRichText,
      isShowScrollbar: state => state.localConfig.isShowScrollbar,
      enableDragImport: state => state.localConfig.enableDragImport,
      useLeftKeySelectionRightKeyDrag: state =>
        state.localConfig.useLeftKeySelectionRightKeyDrag,
      extraTextOnExport: state => state.extraTextOnExport,
      isDragOutlineTreeNode: state => state.isDragOutlineTreeNode,
      enableAi: state => state.localConfig.enableAi
    })
  },
  watch: {
    openNodeRichText() {
      if (this.openNodeRichText) {
        this.addRichTextPlugin()
      } else {
        this.removeRichTextPlugin()
      }
    },
    isShowScrollbar() {
      if (this.isShowScrollbar) {
        this.addScrollbarPlugin()
      } else {
        this.removeScrollbarPlugin()
      }
    }
  },
  mounted() {
    showLoading()
    this.getData()
    this.init()
    this.$bus.$on('execCommand', this.execCommand)
    this.$bus.$on('paddingChange', this.onPaddingChange)
    this.$bus.$on('export', this.export)
    this.$bus.$on('setData', this.setData)
    this.$bus.$on('loadMindMapData', this.handleLoadMindMapData)

    this.$bus.$on('startTextEdit', this.handleStartTextEdit)
    this.$bus.$on('endTextEdit', this.handleEndTextEdit)
    this.$bus.$on('createAssociativeLine', this.handleCreateLineFromActiveNode)
    this.$bus.$on('startPainter', this.handleStartPainter)
    this.$bus.$on('node_tree_render_end', this.handleHideLoading)
    this.$bus.$on('showLoading', this.handleShowLoading)
    this.$bus.$on('localStorageExceeded', this.onLocalStorageExceeded)
    window.addEventListener('resize', this.handleResize)
    this.$bus.$on('showDownloadTip', this.showDownloadTip)
    this.$bus.$on('triggerShiftWForRootNode', this.handleTriggerShiftWForRootNode)
    this.$bus.$on('loadMindMap', this.handleLoadMindMap)
    this.$bus.$on('openMindmapManager', this.handleOpenMindmapManager)
    this.$bus.$on('backToEditor', this.handleBackToEditor)
    // this.webTip() // 已注释：移除网页版更新提示
  },
  beforeDestroy() {
    this.$bus.$off('execCommand', this.execCommand)
    this.$bus.$off('paddingChange', this.onPaddingChange)
    this.$bus.$off('export', this.export)
    this.$bus.$off('setData', this.setData)
    this.$bus.$off('loadMindMapData', this.handleLoadMindMapData)
    this.$bus.$off('startTextEdit', this.handleStartTextEdit)
    this.$bus.$off('endTextEdit', this.handleEndTextEdit)
    this.$bus.$off('createAssociativeLine', this.handleCreateLineFromActiveNode)
    this.$bus.$off('startPainter', this.handleStartPainter)
    this.$bus.$off('node_tree_render_end', this.handleHideLoading)
    this.$bus.$off('showLoading', this.handleShowLoading)
    this.$bus.$off('localStorageExceeded', this.onLocalStorageExceeded)
    window.removeEventListener('resize', this.handleResize)
    this.$bus.$off('showDownloadTip', this.showDownloadTip)
    this.$bus.$off('triggerShiftWForRootNode', this.handleTriggerShiftWForRootNode)
    this.$bus.$off('loadMindMap', this.handleLoadMindMap)
    this.$bus.$off('openMindmapManager', this.handleOpenMindmapManager)
    this.$bus.$off('backToEditor', this.handleBackToEditor)
    this.$bus.$off('execCommand', this.handleExecCommand)
    this.mindMap.destroy()
  },
  methods: {
    onLocalStorageExceeded() {
      this.$notify({
        type: 'warning',
        title: this.$t('edit.tip'),
        message: this.$t('edit.localStorageExceededTip'),
        duration: 0
      })
    },

    handleStartTextEdit() {
      this.mindMap.renderer.startTextEdit()
    },

    handleEndTextEdit() {
      this.mindMap.renderer.endTextEdit()
    },

    handleCreateLineFromActiveNode() {
      this.mindMap.associativeLine.createLineFromActiveNode()
    },

    handleStartPainter() {
      this.mindMap.painter.startPainter()
    },

    handleResize() {
      this.mindMap.resize()
    },

    // 显示loading
    handleShowLoading() {
      this.enableShowLoading = true
      showLoading()
    },

    // 渲染结束后关闭loading
    handleHideLoading() {
      if (this.enableShowLoading) {
        this.enableShowLoading = false
        hideLoading()
      }
    },

    // 获取思维导图数据，实际应该调接口获取
    getData() {
      this.mindMapData = getData()
      this.mindMapConfig = getConfig() || {}
    },

    // 存储数据当数据有变时
    bindSaveEvent() {
      this.$bus.$on('data_change', data => {
        storeData({ root: data })
      })
      this.$bus.$on('view_data_change', data => {
        clearTimeout(this.storeConfigTimer)
        this.storeConfigTimer = setTimeout(() => {
          storeData({
            view: data
          })
        }, 300)
      })
    },

    // 手动保存
    manualSave() {
      storeData(this.mindMap.getData(true))
      this.updateLastSavedData() // 更新最后保存的数据
    },

    // 初始化
    init() {
      let hasFileURL = this.hasFileURL()
      let { root, layout, theme, view } = this.mindMapData
      const config = this.mindMapConfig
      // 如果url中存在要打开的文件，那么思维导图数据、主题、布局都使用默认的
      if (hasFileURL) {
        root = {
          data: {
            text: this.$t('edit.root')
          },
          children: []
        }
        layout = exampleData.layout
        theme = exampleData.theme
        view = null
      }
      // 如果主题模板未定义或为空，则使用暗夜冰刃主题
      if (!theme || !theme.template) {
        theme = {
          template: 'darkNightLceBlade',
          config: {}
        }
      }

      this.mindMap = new MindMap({
        el: this.$refs.mindMapContainer,
        data: root,
        fit: false,
        layout: layout,
        theme: theme.template,
        themeConfig: theme.config,
        viewData: view,
        nodeTextEditZIndex: 1000,
        nodeNoteTooltipZIndex: 1000,
        customNoteContentShow: {
          show: (content, left, top, node) => {
            this.$bus.$emit('showNoteContent', content, left, top, node)
          },
          hide: () => {
            // this.$bus.$emit('hideNoteContent')
          }
        },
        openRealtimeRenderOnNodeTextEdit: true,
        enableAutoEnterTextEditWhenKeydown: true,
        demonstrateConfig: {
          openBlankMode: false
        },
        ...(config || {}),
        iconList: [...icon],
        useLeftKeySelectionRightKeyDrag: this.useLeftKeySelectionRightKeyDrag,
        customInnerElsAppendTo: null,
        customHandleClipboardText: handleClipboardText,
        defaultNodeImage: require('../../../assets/img/图片加载失败.svg'),
        initRootNodePosition: ['center', 'center'],
        handleIsSplitByWrapOnPasteCreateNewNode: () => {
          return this.$confirm(
            this.$t('edit.splitByWrap'),
            this.$t('edit.tip'),
            {
              confirmButtonText: this.$t('edit.yes'),
              cancelButtonText: this.$t('edit.no'),
              type: 'warning'
              }
          )
        },
        errorHandler: (code, err) => {
          console.error(err)
          switch (code) {
            case 'export_error':
              this.$message.error(this.$t('edit.exportError'))
              break
            default:
              break
          }
        },
        addContentToFooter: () => {
          const text = this.extraTextOnExport.trim()
          if (!text) return null
          const el = document.createElement('div')
          el.className = 'footer'
          el.innerHTML = text
          const cssText = `
            .footer {
              width: 100%;
              height: 30px;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 12px;
              color: #979797;
            }
          `
          return {
            el,
            cssText,
            height: 30
          }
        },
        expandBtnNumHandler: num => {
          return num >= 100 ? '…' : num
        },
        beforeDeleteNodeImg: node => {
          return new Promise(resolve => {
            this.$confirm(
              this.$t('edit.deleteNodeImgTip'),
              this.$t('edit.tip'),
              {
                confirmButtonText: this.$t('edit.yes'),
                cancelButtonText: this.$t('edit.no'),
                type: 'warning'
              }
            )
              .then(() => {
                resolve(false)
              })
              .catch(() => {
                resolve(true)
              })
          })
        }
      })

      this.loadPlugins()
      this.mindMap.keyCommand.addShortcut('Control+s', () => {
        this.manualSave()
      })
      this.mindMap.keyCommand.addShortcut('Shift+a', () => {
        this.handleToggleNumbering()
      })
      this.mindMap.keyCommand.addShortcut('Shift+w', () => {
        this.handleToggleTodoCheckbox()
      })
      this.mindMap.keyCommand.addShortcut('Shift+s', () => {
        this.handleToggleTodoStatus()
      })
      
      // 设置编号更新监听器
      this.setupNumberingUpdateListener()
      
      // 转发事件
      ;[
        'node_active',
        'data_change',
        'view_data_change',
        'back_forward',
        'node_contextmenu',
        'node_click',
        'draw_click',
        'expand_btn_click',
        'svg_mousedown',
        'mouseup',
        'mode_change',
        'node_tree_render_end',
        'rich_text_selection_change',
        'transforming-dom-to-images',
        'generalization_node_contextmenu',
        'painter_start',
        'painter_end',
        'scrollbar_change',
        'scale',
        'translate',
        'node_attachmentClick',
        'node_attachmentContextmenu',
        'demonstrate_jump',
        'exit_demonstrate',
        'node_note_dblclick',
        'node_mousedown'
      ].forEach(event => {
        this.mindMap.on(event, (...args) => {
          this.$bus.$emit(event, ...args)
        })
      })
      this.bindSaveEvent()
      // 如果应用被接管，那么抛出事件传递思维导图实例
      if (window.takeOverApp) {
        this.$bus.$emit('app_inited', this.mindMap)
      }
      // 发布思维导图实例，以便其他组件可以访问
      this.$bus.$emit('mind_map_inited', this.mindMap)
      
      // 注册全局编号方法
      window.mindMapInstance = {
        toggleNumbering: () => {
          this.handleToggleNumbering()
        }
      }
      // 解析url中的文件
      if (hasFileURL) {
        this.$bus.$emit('handle_file_url')
      }
      // api/index.js文件使用
      // 当正在编辑本地文件时通过该方法获取最新数据
      Vue.prototype.getCurrentData = () => {
        const fullData = this.mindMap.getData(true)
        return { ...fullData }
      }
      // 协同测试
      this.cooperateTest()
    },

    // 加载相关插件
    loadPlugins() {
      if (this.openNodeRichText) this.addRichTextPlugin()
      if (this.isShowScrollbar) this.addScrollbarPlugin()
    },

    // url中是否存在要打开的文件
    hasFileURL() {
      const fileURL = this.$route.query.fileURL
      if (!fileURL) return false
      return /\.(smm|json|xmind|md|xlsx)$/.test(fileURL)
    },

    // 动态设置思维导图数据
    setData(data) {
      
      if (!this.mindMap) {
        return;
      }
      
      try {
        // 简单直接的数据设置
        if (data.root) {
          this.mindMap.setFullData(data);
        } else {
          this.mindMap.setData(data);
        }
        
        // 重置视图
        if (this.mindMap.view) {
          this.mindMap.view.reset();
        }
        
        // 强制重新渲染
        if (this.mindMap.renderer) {
          this.mindMap.renderer.reRender && this.mindMap.renderer.reRender();
        }
        
      } catch (error) {
      }
    },
    
    // 强制重新渲染思维导图
    forceReRender() {
      if (this.mindMap) {
        try {
          // 清除所有缓存
          if (this.mindMap.renderer) {
            this.mindMap.renderer.clear();
          }
          // 重新渲染
          this.mindMap.reRender();
          // 重置视图
          if (this.mindMap.view) {
            this.mindMap.view.reset();
          }
        } catch (err) {
        }
      }
    },
    
    // 处理加载思维导图数据
    handleLoadMindMapData(mindMapDataObj) {
      
      if (!this.mindMap) {
        return;
      }
      
      try {
        // 提取数据内容
        const data = mindMapDataObj.content || mindMapDataObj;
        
        if (!data) {
          return;
        }
        
        this.setData(data);
        
        // 发送加载完成事件
        this.$bus.$emit('mindMapLoaded');
        
      } catch (error) {
      }
    },
    
    // 更新最后保存的数据
    updateLastSavedData() {
      if (this.mindMap) {
        this.lastSavedData = JSON.stringify(this.mindMap.getData(true));
      }
    },
    
    // 检测思维导图是否被修改
    isMindMapModified() {
      if (!this.mindMap || !this.lastSavedData) {
        return false;
      }
      const currentData = JSON.stringify(this.mindMap.getData(true));
      return currentData !== this.lastSavedData;
    },

    // 重新渲染
    reRender() {
      this.mindMap.reRender()
    },

    // 执行命令
    execCommand(...args) {
      this.mindMap.execCommand(...args)
    },

    // 导出
    async export(...args) {
      try {
        showLoading()
        await this.mindMap.export(...args)
        hideLoading()
      } catch (error) {
        console.log(error)
        hideLoading()
      }
    },

    // 修改导出内边距
    onPaddingChange(data) {
      this.mindMap.updateConfig(data)
    },

    // 加载节点富文本编辑插件
    addRichTextPlugin() {
      if (!this.mindMap) return
      this.mindMap.addPlugin(RichText)
    },

    // 移除节点富文本编辑插件
    removeRichTextPlugin() {
      this.mindMap.removePlugin(RichText)
    },

    // 加载滚动条插件
    addScrollbarPlugin() {
      if (!this.mindMap) return
      this.mindMap.addPlugin(ScrollbarPlugin)
    },

    // 移除滚动条插件
    removeScrollbarPlugin() {
      this.mindMap.removePlugin(ScrollbarPlugin)
    },

    // 协同测试
    cooperateTest() {
      if (this.mindMap.cooperate && this.$route.query.userName) {
        this.mindMap.cooperate.setProvider(null, {
          roomName: 'demo-room',
          signalingList: ['ws://localhost:4444']
        })
        this.mindMap.cooperate.setUserInfo({
          id: Math.random(),
          name: this.$route.query.userName,
          color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'][
            Math.floor(Math.random() * 5)
          ],
          avatar:
            Math.random() > 0.5
              ? 'https://img0.baidu.com/it/u=4270674549,2416627993&fm=253&app=138&size=w931&n=0&f=JPEG&fmt=auto?sec=1696006800&t=4d32871d14a7224a4591d0c3c7a97311'
              : ''
        })
      }
    },

    // 拖拽文件到页面导入
    onDragenter() {
      if (!this.enableDragImport || this.isDragOutlineTreeNode) return
      this.showDragMask = true
    },

    onDragleave() {
      this.showDragMask = false
    },

    onDrop(e) {
      if (!this.enableDragImport) return
      this.showDragMask = false
      const dt = e.dataTransfer
      const file = dt.files && dt.files[0]
      if (!file) return
      this.$bus.$emit('importFile', file)
    },

    // 网页版试用提示 (已禁用)
    // webTip() {
    //   const storageKey = 'webUseTip'
    //   const data = localStorage.getItem(storageKey)
    //   if (data) {
    //     return
    //   }
    //   this.showDownloadTip(
    //     '重要提示',
    //     '网页版已暂停更新，部分功能缺失，请下载客户端获得完整体验~'
    //   )
    //   localStorage.setItem(storageKey, 1)
    // },

    showDownloadTip(title, desc) {
      const h = this.$createElement
      this.$msgbox({
        title,
        message: h('div', null, [
          h(
            'p',
            {
              style: {
                marginBottom: '12px'
              }
            },
            desc
          ),
          h('div', null, [
            h(
              'a',
              {
                attrs: {
                  href:
                    'https://pan.baidu.com/s/1huasEbKsGNH2Af68dvWiOg?pwd=3bp3',
                  target: '_blank'
                },
                style: {
                  color: '#409eff',
                  marginRight: '12px'
                }
              },
              this.$t('edit.downBaidu')
            ),
            h(
              'a',
              {
                attrs: {
                  href: 'https://github.com/wanglin2/mind-map/releases',
                  target: '_blank'
                },
                style: {
                  color: '#409eff'
                }
              },
              this.$t('edit.downGithub')
            )
          ])
        ]),
        showCancelButton: false,
        showConfirmButton: false
      })
    },

    // 获取字母（A, B, C... Z, AA, AB...）
    getAlphabet(num) {
      if (num <= 0) return ''
      let result = ''
      num-- // 从0开始计算
      
      while (num >= 0) {
        result = String.fromCharCode(65 + (num % 26)) + result
        num = Math.floor(num / 26) - 1
      }
      
      return result
    },

    // 处理编号切换 - 调用ToolbarNodeBtnList的编号功能
    handleToggleNumbering() {
      // 直接从思维导图实例获取活动节点
      const activeNodes = this.mindMap.renderer.activeNodeList
      
      if (!activeNodes || activeNodes.length === 0) {
        this.$message.warning('请先选择节点')
        return
      }

      // 检查是否选中了根节点
      const hasRootNode = activeNodes.some(node => node.isRoot)
      
      if (hasRootNode && activeNodes.length === 1) {
        // 如果只选中了根节点，为所有层级的节点编号
        this.numberingAllNodesFromRoot(activeNodes[0])
      } else {
        // 为所有选中的非根节点添加编号
        activeNodes.forEach(node => {
          if (!node.isRoot) {
            this.numberingSingleNodeFromShortcut(node)
          }
        })
        
        // 如果包含根节点，给出提示
        if (hasRootNode) {
          this.$message.info('已为选中的非根节点添加编号，根节点已跳过')
        }
      }
    },

    // 从根节点为所有层级节点编号
    numberingAllNodesFromRoot(rootNode) {
      const children = rootNode.children || []
      if (children.length === 0) {
        this.$message.info('根节点没有子节点可以编号')
        return
      }

      // 递归处理所有层级的节点
      this.numberingAllNodesRecursive(rootNode, 0)
    },

    // 递归为所有层级的节点编号
    numberingAllNodesRecursive(node, parentLevel) {
      const children = node.children || []
      
      children.forEach((child, index) => {
        const currentLevel = parentLevel + 1
        this.toggleNodeNumberingFromShortcut(child, currentLevel, index)
        
        // 递归处理子节点
        if (child.children && child.children.length > 0) {
          this.numberingAllNodesRecursive(child, currentLevel)
        }
      })
    },

    // 为单个节点编号（快捷键触发）
    numberingSingleNodeFromShortcut(node) {
      const level = this.getNodeLevel(node)
      const siblings = this.getSiblingNodes(node)
      const index = siblings.indexOf(node)
      
      this.toggleNodeNumberingFromShortcut(node, level, index)
    },

    // 切换节点编号状态（快捷键版本）- 使用图标系统
    toggleNodeNumberingFromShortcut(node, level, index) {
      // 获取节点当前的图标列表
      const iconList = [...(node.getData('icon') || [])]
      
      // 查找是否已有编号图标（任何number-开头的图标）
      const numberIconIndex = iconList.findIndex(item => item.startsWith('number-'))
      
      if (numberIconIndex !== -1) {
        // 移除现有编号图标
        iconList.splice(numberIconIndex, 1)
      } else {
        // 添加新的编号图标
        const numberingIcon = this.generateNumberingIconFromShortcut(level, index)
        if (numberingIcon) {
          iconList.push(numberingIcon)
        }
      }
      
      // 使用统一的排序函数确保checkbox始终在最左边
      const sortedIconList = sortIconList(iconList)
      
      // 更新节点图标
      node.setIcon(sortedIconList)
    },

    // 生成编号图标标识（快捷键版本）
    generateNumberingIconFromShortcut(level, index) {
      // 根据层级确定编号类型和文本
      let numberType = ''
      let numberText = ''
      
      switch (level) {
        case 1:
          // 一级：中文数字
          numberType = 'number-1'
          numberText = this.toChineseNumberFromShortcut(index + 1)
          break
        case 2:
          // 二级：阿拉伯数字
          numberType = 'number-2'
          numberText = `${index + 1}`
          break
        case 3:
          // 三级：大写字母
          numberType = 'number-3'
          numberText = String.fromCharCode(65 + (index % 26))
          break
        case 4:
          // 四级：小写字母
          numberType = 'number-4'
          numberText = String.fromCharCode(97 + (index % 26))
          break
        default:
          // 五级及以上：循环使用
          const cycleLevel = ((level - 1) % 4) + 1
          return this.generateNumberingIconFromShortcut(cycleLevel, index)
      }
      
      // 返回图标标识：type_text格式
      return `${numberType}_${numberText}`
    },

    // 中文数字转换函数（快捷键版本）
    toChineseNumberFromShortcut(num) {
      const chineseDigits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
      const chineseUnits = ['', '十', '百', '千']
      
      if (num === 0) return '零'
      if (num <= 10) return chineseDigits[num] || '十'
      if (num < 20) return '十' + (num === 10 ? '' : chineseDigits[num - 10])
      if (num < 100) {
        const tens = Math.floor(num / 10)
        const ones = num % 10
        return chineseDigits[tens] + '十' + (ones === 0 ? '' : chineseDigits[ones])
      }
      
      // 处理更大的数字
      return num.toString()
    },

    // 监听删除节点事件，更新编号
    setupNumberingUpdateListener() {
      // 创建事件处理函数
      this.handleExecCommand = (commandName, ...args) => {
        // 删除节点相关命令
        if (commandName === 'REMOVE_NODE' || commandName === 'REMOVE_CURRENT_NODE' || commandName === 'CUT_NODE') {
          this.triggerNumberingUpdate()
        }
        
        // 节点位置变换相关命令
        if (commandName === 'MOVE_NODE_TO' || commandName === 'UP_NODE' || commandName === 'DOWN_NODE' || commandName === 'INSERT_NODE') {
          this.triggerNumberingUpdate()
        }
      }
      
      // 监听删除节点的快捷键和按钮
      this.$bus.$on('execCommand', this.handleExecCommand)
      
      // 监听拖动结束事件
      this.mindMap.on('node_dragend', () => {
        this.triggerNumberingUpdate()
      })
      
      // 同时监听思维导图实例的命令执行
      this.mindMap.on('afterExecCommand', (commandName, ...args) => {
        
        // 删除节点相关命令
        if (commandName === 'REMOVE_NODE' || commandName === 'REMOVE_CURRENT_NODE' || commandName === 'CUT_NODE') {
          this.triggerNumberingUpdate()
        }
        
        // 节点位置变换相关命令
        if (commandName === 'MOVE_NODE_TO' || commandName === 'UP_NODE' || commandName === 'DOWN_NODE' || commandName === 'INSERT_NODE') {
          this.triggerNumberingUpdate()
        }
      })
    },

    // 触发编号更新（统一的延迟更新机制）
    triggerNumberingUpdate() {
      // 延迟执行编号更新，确保节点操作完成后再更新
      this.$nextTick(() => {
        setTimeout(() => {
          this.updateSiblingNumbering()
        }, 50)
      })
    },

    // 更新同级节点编号
    updateSiblingNumbering() {
      
      // 递归检查所有节点，更新有编号的同级节点
      this.updateNodeGroupsRecursive(this.mindMap.renderer.root, 0)
    },

    // 递归更新节点组编号
    updateNodeGroupsRecursive(node, parentLevel) {
      const children = node.children || []
      
      if (children.length > 0) {
        const currentLevel = parentLevel + 1
        
        // 检查当前层级是否有编号节点
        const numberedChildren = children.filter(child => {
          const iconList = child.getData('icon') || []
          return iconList.some(item => item.startsWith('number-'))
        })
        
        // 如果有编号节点，重新排序
        if (numberedChildren.length > 0) {
          numberedChildren.forEach((child, index) => {
            const iconList = [...(child.getData('icon') || [])]
            const numberIconIndex = iconList.findIndex(item => item.startsWith('number-'))
            
            if (numberIconIndex !== -1) {
              // 生成新的编号图标
              const newNumberingIcon = this.generateNumberingIconFromShortcut(currentLevel, index)
              if (newNumberingIcon) {
                iconList[numberIconIndex] = newNumberingIcon
                // 使用统一的排序函数确保checkbox始终在最左边
                const sortedIconList = sortIconList(iconList)
                child.setIcon(sortedIconList)
              }
            }
          })
        }
        
        // 递归处理子节点
        children.forEach(child => {
          if (child.children && child.children.length > 0) {
            this.updateNodeGroupsRecursive(child, currentLevel)
          }
        })
      }
    },


    // 为单个节点添加编号
    addNodeNumbering(node, level, index) {
      const numberingConfig = this.generateNumberingConfig(level, index)
      const currentText = node.data.text || ''
      const numberedText = this.addNumberingPrefix(currentText, numberingConfig)
      
      node.setData({ 
        text: numberedText,
        numbering: numberingConfig
      })
    },

    // 移除单个节点的编号
    removeNodeNumbering(node) {
      const currentText = node.data.text || ''
      const newText = this.removeNumberingPrefix(currentText)
      
      // 从节点数据中移除编号配置
      const newData = { ...node.data }
      delete newData.numbering
      newData.text = newText
      
      node.setData(newData)
    },

    // 检查兄弟节点是否都有编号
    hasNumberingPrefix(text) {
      return /<span[^>]*style="[^"]*background-color:[^"]*"[^>]*>.*?<\/span>/.test(text)
    },

    // 生成编号配置
    generateNumberingConfig(level, index) {
      const numberText = this.getNumberingSymbol(level, index)
      const backgroundColor = this.getNumberingColor(index)

      return {
        text: numberText,
        backgroundColor,
        level,
        index
      }
    },

    // 转换为罗马数字
    toRoman(num) {
      const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
      const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
      let result = ''
      
      for (let i = 0; i < values.length; i++) {
        while (num >= values[i]) {
          result += numerals[i]
          num -= values[i]
        }
      }
      return result
    },

    // 添加编号前缀
    addNumberingPrefix(text, config) {
      const circle = `<span style="display: inline-block; width: 20px; height: 20px; background-color: ${config.backgroundColor}; color: white; border-radius: 50%; text-align: center; line-height: 20px; font-size: 12px; margin-right: 5px; vertical-align: middle;">${config.text}</span>`
      return circle + text
    },

    // 移除编号前缀
    removeNumberingPrefix(text) {
      // 移除HTML格式的圆形编号标记
      return text.replace(/<span[^>]*style="[^"]*background-color:[^"]*"[^>]*>.*?<\/span>\s*/i, '')
    },

    // 检查是否有编号前缀
    hasNumberingPrefix(text) {
      return /<span[^>]*style="[^"]*background-color:[^"]*"[^>]*>.*?<\/span>/.test(text)
    },

    // 获取节点层级
    getNodeLevel(node) {
      let level = 0
      let current = node.parent
      while (current && !current.isRoot) {
        level++
        current = current.parent
      }
      return level + 1 // 根节点的直接子节点为第1层
    },

    // 获取同级节点
    getSiblingNodes(node) {
      if (!node.parent) return [node]
      return node.parent.children || []
    },

    // 处理待办复选框切换 (Shift+W) - 添加或移除复选框
    handleToggleTodoCheckbox() {
      // 直接从思维导图实例获取活动节点
      const activeNodes = this.mindMap.renderer.activeNodeList
      
      if (!activeNodes || activeNodes.length === 0) {
        this.$message.warning('请先选择节点')
        return
      }

      // 检查是否选中了根节点
      const hasRootNode = activeNodes.some(node => node.isRoot)
      
      if (hasRootNode && activeNodes.length === 1) {
        // 如果只选中了根节点，检查所有子节点（不包括根节点本身）是否都已添加复选框
        const selectedNode = activeNodes[0]
        if (selectedNode.children && selectedNode.children.length > 0) {
          // 检查所有直接子节点及其后代是否有复选框
          const allChildrenHaveCheckbox = this.checkAllDescendantsOfChildrenHaveCheckbox(selectedNode, ['checkbox_unchecked', 'checkbox_success', 'checkbox_failed']);
          
          // 对所有子节点执行添加/移除操作
          selectedNode.children.forEach(child => {
            this.toggleCheckboxForAllDescendants(child, false, !allChildrenHaveCheckbox)
          })
        }
      } else {
        // 为所有选中的非根节点添加/移除待办
        activeNodes.forEach(node => {
          if (!node.isRoot) {
            this.toggleCheckboxForSingleNode(node)
          }
        })
        
        // 如果包含根节点，给出提示
        if (hasRootNode) {
          this.$message.info('已为选中的非根节点切换待办状态，根节点已跳过')
        }
      }
    },

    // 处理待办状态切换 (Shift+S) - 在复选框状态下循环切换状态
    handleToggleTodoStatus() {
      // 直接从思维导图实例获取活动节点
      const activeNodes = this.mindMap.renderer.activeNodeList
      
      if (!activeNodes || activeNodes.length === 0) {
        this.$message.warning('请先选择节点')
        return
      }

      // 检查是否选中了根节点
      const hasRootNode = activeNodes.some(node => node.isRoot)
      
      if (hasRootNode && activeNodes.length === 1) {
        // 如果只选中了根节点，则不执行任何操作
        this.$message.info('根节点不支持状态切换功能')
        return
      } else {
        // 为所有选中的非根节点切换状态
        let hasValidNode = false
        activeNodes.forEach(node => {
          if (!node.isRoot) {
            this.toggleStatusForSingleNode(node)
            hasValidNode = true
          }
        })
        
        // 如果包含根节点，给出提示
        if (hasRootNode) {
          this.$message.info('已为选中的非根节点切换状态，根节点已跳过')
        } else if (!hasValidNode) {
          this.$message.info('没有可以切换状态的节点')
        }
      }
    },
    
    // 为单个节点切换复选框图标
    toggleCheckboxForSingleNode(node) {
      // 获取当前节点的图标列表
      const iconList = [...(node.getData('icon') || [])]
      
      // 查找是否存在复选框图标
      const checkboxIcons = ['checkbox_unchecked', 'checkbox_success', 'checkbox_failed']
      const existingCheckboxIndex = iconList.findIndex(item => checkboxIcons.includes(item))
      
      if (existingCheckboxIndex !== -1) {
        // 如果存在复选框图标，则移除它
        iconList.splice(existingCheckboxIndex, 1)
      } else {
        // 如果不存在，则添加未选中状态的复选框图标
        iconList.push('checkbox_unchecked')
      }
      
      // 使用统一的排序函数确保checkbox始终在最左边
      const sortedIconList = sortIconList(iconList)
      
      // 更新节点图标
      node.setIcon(sortedIconList)
    },
    
    // 为单个节点切换复选框状态
    toggleStatusForSingleNode(node) {
      // 获取当前节点的图标列表
      const iconList = [...(node.getData('icon') || [])]
      
      // 查找是否存在复选框图标
      const checkboxIcons = ['checkbox_unchecked', 'checkbox_success', 'checkbox_failed']
      const existingCheckboxIndex = iconList.findIndex(item => checkboxIcons.includes(item))
      
      if (existingCheckboxIndex === -1) {
        // 如果没有复选框图标，不执行任何操作或显示提示
        this.$message.info('请先为节点添加复选框')
        return
      }
      
      // 当前状态
      const currentStatus = iconList[existingCheckboxIndex]
      let nextStatus = 'checkbox_unchecked' // 默认为未选中
      
      // 按照顺序循环: 未选中(空) -> 选中(对号) -> 失败(叉号) -> 未选中(空) ...
      if (currentStatus === 'checkbox_unchecked') {
        nextStatus = 'checkbox_success'
      } else if (currentStatus === 'checkbox_success') {
        nextStatus = 'checkbox_failed'
      } else if (currentStatus === 'checkbox_failed') {
        nextStatus = 'checkbox_unchecked'
      }
      
      // 更新图标列表中的复选框状态
      iconList[existingCheckboxIndex] = nextStatus
      
      // 使用统一的排序函数确保checkbox始终在最左边
      const sortedIconList = sortIconList(iconList)
      
      // 更新节点图标
      node.setIcon(sortedIconList)
    },
    
    // 递归为所有后代节点添加复选框 (用于根节点，只添加)
    addCheckboxForAllDescendants(node) {
      // 获取当前节点的图标列表
      const iconList = [...(node.getData('icon') || [])]
      
      // 查找是否存在复选框图标
      const checkboxIcons = ['checkbox_unchecked', 'checkbox_success', 'checkbox_failed']
      const existingCheckboxIndex = iconList.findIndex(item => checkboxIcons.includes(item))
      
      // 如果不存在复选框，则添加未选中状态的复选框
      if (existingCheckboxIndex === -1) {
        iconList.push('checkbox_unchecked')
        // 使用统一的排序函数确保checkbox始终在最左边
        const sortedIconList = sortIconList(iconList)
        node.setIcon(sortedIconList)
      }
      
      // 递归处理所有子节点
      if (node.children) {
        node.children.forEach(child => {
          this.addCheckboxForAllDescendants(child)
        })
      }
    },
    
    // 递归为所有后代节点切换复选框 (用于子节点)
    toggleCheckboxForAllDescendants(node, isRoot, shouldAdd) {
      // 获取当前节点的图标列表
      const iconList = [...(node.getData('icon') || [])]
      
      // 查找是否存在复选框图标
      const checkboxIcons = ['checkbox_unchecked', 'checkbox_success', 'checkbox_failed']
      const existingCheckboxIndex = iconList.findIndex(item => checkboxIcons.includes(item))
      
      // 根据 shouldAdd 参数决定是添加还是移除
      if (shouldAdd) {
        // 如果不存在复选框，则添加未选中状态的复选框
        if (existingCheckboxIndex === -1) {
          iconList.push('checkbox_unchecked')
          // 使用统一的排序函数确保checkbox始终在最左边
          const sortedIconList = sortIconList(iconList)
          node.setIcon(sortedIconList)
        }
      } else {
        // 如果已存在复选框，则移除
        if (existingCheckboxIndex !== -1) {
          iconList.splice(existingCheckboxIndex, 1)
          // 使用统一的排序函数确保checkbox始终在最左边
          const sortedIconList = sortIconList(iconList)
          node.setIcon(sortedIconList)
        }
      }
      
      // 递归处理所有子节点
      if (node.children) {
        node.children.forEach(child => {
          this.toggleCheckboxForAllDescendants(child, false, shouldAdd)
        })
      }
    },
    
    // 检查所有子节点的后代是否都包含复选框图标（不包括指定节点本身）
    checkAllDescendantsOfChildrenHaveCheckbox(node, checkboxIcons) {
      // 检查所有子节点及其后代是否有复选框
      if (!node.children || node.children.length === 0) {
        return true; // 如果没有子节点，认为所有子节点都有复选框（以便添加功能）
      }
      
      for (let child of node.children) {
        if (!this.checkAllDescendantsHaveCheckbox(child, checkboxIcons)) {
          return false; // 只要有一个子节点（及其后代）没有复选框，就返回false
        }
      }
      
      return true; // 所有子节点及其后代都有复选框
    },
    
    // 检查一个节点及其所有后代是否都包含复选框图标（对整个树进行检查）
    checkAllDescendantsHaveCheckbox(node, checkboxIcons) {
      // 检查当前节点是否包含复选框
      const iconList = [...(node.getData('icon') || [])]
      const existingCheckboxIndex = iconList.findIndex(item => checkboxIcons.includes(item))
      const hasCheckbox = existingCheckboxIndex !== -1;
      
      // 检查所有子节点
      if (node.children) {
        for (let child of node.children) {
          if (!this.checkAllDescendantsHaveCheckbox(child, checkboxIcons)) {
            return false; // 只要有一个子节点没有复选框，就返回false
          }
        }
      }
      
      return hasCheckbox; // 只有当前节点有复选框且所有子节点都有复选框时才返回true
    },
    
    // 递归为所有后代节点切换复选框状态 (用于子节点)
    toggleStatusForAllDescendants(node) {
      // 获取当前节点的图标列表
      const iconList = [...(node.getData('icon') || [])]
      
      // 查找是否存在复选框图标
      const checkboxIcons = ['checkbox_unchecked', 'checkbox_success', 'checkbox_failed']
      const existingCheckboxIndex = iconList.findIndex(item => checkboxIcons.includes(item))
      
      if (existingCheckboxIndex !== -1) {
        // 当前状态
        const currentStatus = iconList[existingCheckboxIndex]
        let nextStatus = 'checkbox_unchecked' // 默认为未选中
        
        // 按照顺序循环: 未选中(空) -> 选中(对号) -> 失败(叉号) -> 未选中(空) ...
        if (currentStatus === 'checkbox_unchecked') {
          nextStatus = 'checkbox_success'
        } else if (currentStatus === 'checkbox_success') {
          nextStatus = 'checkbox_failed'
        } else if (currentStatus === 'checkbox_failed') {
          nextStatus = 'checkbox_unchecked'
        }
        
        // 更新图标状态
        iconList[existingCheckboxIndex] = nextStatus
        
        // 使用统一的排序函数确保checkbox始终在最左边
        const sortedIconList = sortIconList(iconList)
        
        // 更新节点图标
        node.setIcon(sortedIconList)
      }
      
      // 递归处理所有子节点
      if (node.children) {
        node.children.forEach(child => {
          this.toggleStatusForAllDescendants(child)
        })
      }
    },
    
    // 处理根节点的Shift+W操作事件
    handleTriggerShiftWForRootNode() {
      // 直接从思维导图实例获取活动节点
      const activeNodes = this.mindMap.renderer.activeNodeList
      
      if (!activeNodes || activeNodes.length === 0) {
        this.$message.warning('请先选择节点')
        return
      }

      // 检查是否选中了根节点
      const hasRootNode = activeNodes.some(node => node.isRoot)
      
      if (hasRootNode && activeNodes.length === 1) {
        // 如果只选中了根节点，处理根节点逻辑
        const selectedNode = activeNodes[0]
        if (selectedNode.isRoot && selectedNode.children && selectedNode.children.length > 0) {
          // 检查所有子节点（不包括根节点本身）是否都已添加复选框
          const allChildrenHaveCheckbox = this.checkAllDescendantsOfChildrenHaveCheckbox(selectedNode, ['checkbox_unchecked', 'checkbox_success', 'checkbox_failed']);
          
          // 对所有子节点执行添加/移除操作
          selectedNode.children.forEach(child => {
            this.toggleCheckboxForAllDescendants(child, false, !allChildrenHaveCheckbox)
          })
        }
      } else {
        // 为所有选中的非根节点添加/移除待办
        activeNodes.forEach(node => {
          if (!node.isRoot) {
            this.toggleCheckboxForSingleNode(node)
          }
        })
        
        // 如果包含根节点，给出提示
        if (hasRootNode) {
          this.$message.info('已为选中的非根节点切换待办状态，根节点已跳过')
        }
      }
    },

    // 处理加载思维导图事件
    async handleLoadMindMap(mindMapId) {
      try {
        if (!mindMapId) {
          this.$message.error('思维导图ID不能为空')
          return
        }

        // 从缓存中获取思维导图内容
        const cachedContent = await this.$store.dispatch('getMindMapContent', mindMapId)
        
        if (cachedContent) {
          // 设置当前思维导图ID
          this.$store.commit('setCurrentMindMapId', mindMapId)
          
          // 加载思维导图数据
          this.setData(cachedContent)
          
          // 提示用户
          const mindMap = this.$store.state.localMindMaps.find(m => m.id === mindMapId)
          if (mindMap) {
            this.$message.success(`已加载思维导图：${mindMap.title}`)
          }
        } else {
          this.$message.error('思维导图数据不存在或已损坏')
        }
      } catch (error) {
        console.error('加载思维导图失败:', error)
        this.$message.error('加载思维导图失败，请重试')
      }
    },

    // 处理打开思维导图管理页面
    handleOpenMindmapManager() {
      this.currentPage = 'mindmap-manager'
    },

    // 处理返回编辑器
    handleBackToEditor() {
      this.currentPage = 'editor'
      // 触发从思维导图管理页面返回的事件，用于恢复工具栏状态
      this.$bus.$emit('backFromMindmapManager')
    }
  }
}
</script>

<style lang="less" scoped>
.editContainer {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;

  .dragMask {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3999;

    .dragTip {
      pointer-events: none;
      font-weight: bold;
    }
  }

  .mindMapContainer {
    position: absolute;
    left: 0px;
    top: 0px;
    width: 100%;
    height: 100%;
  }
}
</style>
