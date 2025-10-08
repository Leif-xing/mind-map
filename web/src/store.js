import Vue from 'vue'
import Vuex from 'vuex'
import { storeLocalConfig, getUserData, storeUserData } from '@/api'
import { userApi, mindMapApi } from '@/api/supabase-api'

Vue.use(Vuex)

// 初始化用户数据
const initialUserData = getUserData();
const initialUsers = initialUserData ? initialUserData.users : [
  // 预设一个管理员账号
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    isAdmin: true,
    mindMapPermission: 1, // 导图权限，默认为1（可用）
    createdAt: new Date().toISOString()
  }
];
const initialUserIdCounter = initialUserData ? initialUserData.userIdCounter : 1;

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
    // 用户列表（从localStorage加载或使用默认值）
    users: initialUsers,
    // 用户ID计数器（从localStorage加载或使用默认值）
    userIdCounter: initialUserIdCounter,
    // Supabase集成相关
    supabaseEnabled: process.env.VUE_APP_SUPABASE_ENABLED !== 'false', // 默认启用Supabase后端
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
    },
    
    // 添加用户
    addUser(state, user) {
      // 为新用户分配递增ID
      state.userIdCounter += 1;
      const newUser = {
        ...user,
        id: state.userIdCounter
      };
      state.users.push(newUser);
      // 保存到localStorage
      storeUserData(state.users, state.userIdCounter)
    },
    
    // 更新用户管理员状态
    updateUserAdminStatus(state, { userId, isAdmin }) {
      const user = state.users.find(u => u.id === userId)
      if (user) {
        user.isAdmin = isAdmin
      }
      // 保存到localStorage
      storeUserData(state.users, state.userIdCounter)
    },
    
    // 删除用户
    deleteUser(state, userId) {
      state.users = state.users.filter(u => u.id !== userId)
      // 保存到localStorage
      storeUserData(state.users, state.userIdCounter)
    },
    
    // 更新用户密码
    updateUserPassword(state, { userId, newPassword }) {
      const user = state.users.find(u => u.id === userId)
      if (user) {
        user.password = newPassword
      }
      // 保存到localStorage
      storeUserData(state.users, state.userIdCounter)
    },
    
    // 更新用户导图权限
    updateUserMindMapPermission(state, { userId, mindMapPermission }) {
      const user = state.users.find(u => u.id === userId)
      if (user) {
        user.mindMapPermission = mindMapPermission
      }
      // 保存到localStorage
      storeUserData(state.users, state.userIdCounter)
    },
    
    // 设置Supabase启用状态
    setSupabaseEnabled(state, enabled) {
      state.supabaseEnabled = enabled
    }
  },
  actions: {
    // 用户注册（使用Supabase）
    async registerUser({ commit }, { username, password, email }) {
      console.log('Register User - Supabase Enabled:', this.state.supabaseEnabled);
      if (this.state.supabaseEnabled) {
        // 使用Supabase进行注册
        const user = await userApi.register(username, password, email)
        return user
      } else {
        // 使用本地存储（当前实现）
        throw new Error('当前未启用Supabase，无法注册新用户')
      }
    },
    
    // 用户登录（使用Supabase）
    async loginUser({ commit }, { username, password }) {
      console.log('Register User - Supabase Enabled:', this.state.supabaseEnabled);
      if (this.state.supabaseEnabled) {
        // 使用Supabase进行登录
        const user = await userApi.login(username, password)
        // 确保返回的用户对象字段名与本地存储一致
        return {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          mindMapPermission: user.mindMapPermission,
          createdAt: user.createdAt
        };
      } else {
        // 使用本地存储（当前实现）
        const localUsers = this.state.users
        const user = localUsers.find(u => 
          u.username === username && u.password === password
        )
        if (user && user.mindMapPermission === 1) {
          return user
        } else {
          throw new Error('用户名或密码错误，或权限不足')
        }
      }
    },
    
    // 获取用户思维导图列表
    async getUserMindMaps({ commit }, userId) {
      if (this.state.supabaseEnabled) {
        return await mindMapApi.getUserMindMaps(userId)
      } else {
        // 返回本地存储的思维导图数据
        return []
      }
    },
    
    // 保存思维导图
    async saveMindMap({ commit }, { userId, title, content }) {
      if (this.state.supabaseEnabled) {
        return await mindMapApi.saveMindMap(userId, title, content)
      } else {
        // 本地保存逻辑
        return null
      }
    },
    
    // 切换Supabase启用状态
    toggleSupabase({ commit }, enabled) {
      commit('setSupabaseEnabled', enabled)
    }
  }
})

export default store
