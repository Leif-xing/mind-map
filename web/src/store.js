import Vue from 'vue'
import Vuex from 'vuex'
import { storeLocalConfig } from '@/api'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    isHandleLocalFile: false, // 是否操作的是本地文件
    localConfig: {
      // 本地配置
      isZenMode: false, // 是否是禅模式
      // 是否开启节点富文本
      openNodeRichText: true,
      // 鼠标行为
      useLeftKeySelectionRightKeyDrag: false,
      // 是否显示滚动条
      isShowScrollbar: false,
      // 是否是暗黑模式
      isDark: false,
      // 是否开启AI功能
      enableAi: true
    },
    activeSidebar: '', // 当前显示的侧边栏
    isOutlineEdit: false, // 是否是大纲编辑模式
    isReadonly: false, // 是否只读
    isSourceCodeEdit: false, // 是否是源码编辑模式
    extraTextOnExport: '', // 导出时底部添加的文字
    isDragOutlineTreeNode: false, // 当前是否正在拖拽大纲树的节点
    // 统一AI系统配置
    aiSystem: {
      currentProvider: 'huoshan', // 当前选择的提供商
      providers: {
        huoshan: {
          name: '火山方舟',
          api: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
          type: 'custom', // 自定义模型输入
          config: {
            key: '',
            model: '',
            port: 3456,
            method: 'POST'
          }
        },
        navy: {
          name: 'Navy API',
          api: 'https://api.navy/v1/chat/completions',
          type: 'select', // 从预设列表选择
          models: [
            'deepseek-v3.2',
            'gpt-5',
            'gemini-2.5-pro',
            'qwen3-235b-a22b-thinking-2507'
          ],
          config: {
            key: '',
            model: 'deepseek-v3.2',
            method: 'POST'
          }
        }
      }
    },
    // 扩展主题列表
    extendThemeGroupList: [],
    // 内置背景图片
    bgList: []
  },
  mutations: {
    // 设置操作本地文件标志位
    setIsHandleLocalFile(state, data) {
      state.isHandleLocalFile = data
    },

    // 设置本地配置
    setLocalConfig(state, data) {
      // 处理AI系统配置
      if (data.aiSystem) {
        state.aiSystem = { ...state.aiSystem, ...data.aiSystem }
      }
      
      // 向后兼容：迁移旧的aiConfig到新格式
      if (data.aiConfig && !data.aiSystem) {
        state.aiSystem.providers.huoshan.config = {
          ...state.aiSystem.providers.huoshan.config,
          ...data.aiConfig
        }
        state.aiSystem.currentProvider = 'huoshan'
      }
      
      // 处理其他配置
      Object.keys(data).forEach(key => {
        if (key !== 'aiSystem' && key !== 'aiConfig') {
          state.localConfig[key] = data[key]
        }
      })
      
      storeLocalConfig({
        ...state.localConfig,
        aiSystem: state.aiSystem
      })
    },

    // 设置当前显示的侧边栏
    setActiveSidebar(state, data) {
      state.activeSidebar = data
    },

    // 设置大纲编辑模式
    setIsOutlineEdit(state, data) {
      state.isOutlineEdit = data
    },

    // 设置是否只读
    setIsReadonly(state, data) {
      state.isReadonly = data
    },

    // 设置源码编辑模式
    setIsSourceCodeEdit(state, data) {
      state.isSourceCodeEdit = data
    },

    // 设置导出时底部添加的文字
    setExtraTextOnExport(state, data) {
      state.extraTextOnExport = data
    },

    // 设置树节点拖拽
    setIsDragOutlineTreeNode(state, data) {
      state.isDragOutlineTreeNode = data
    },

    // 扩展主题列表
    setExtendThemeGroupList(state, data) {
      state.extendThemeGroupList = data
    },

    // 设置背景图片列表
    setBgList(state, data) {
      state.bgList = data
    }
  },
  actions: {}
})

export default store
