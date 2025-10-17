import Vue from 'vue'
import Vuex from 'vuex'
import { storeLocalConfig, getUserData, storeUserData } from '@/api'
import { userApi, mindMapApi, aiConfigApi } from '@/api/supabase-api'
import { compressMindMap, decompressMindMap } from '@/utils/mindmap-compression'

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
      isDark: true,
      // 是否开启AI功能
      enableAi: true
    },
    activeSidebar: '', // 当前显示的侧边栏
    isOutlineEdit: false, // 是否是大纲编辑模式
    isReadonly: false, // 是否只读
    isSourceCodeEdit: false, // 是否是源码编辑模式
    extraTextOnExport: '', // 导出时底部添加的文字
    isDragOutlineTreeNode: false, // 当前是否正在拖拽大纲树的节点
    currentMindMapId: null, // 当前正在编辑的思维导图ID
    localMindMaps: [], // 本地缓存的思维导图列表
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
    // 当前登录用户
    currentUser: null,
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
    
    setCurrentMindMapId(state, mindMapId) {
      state.currentMindMapId = mindMapId
    },
    
    // 设置本地缓存的思维导图列表
    setLocalMindMaps(state, mindMaps) {
      state.localMindMaps = mindMaps;
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
    },
    
    // 设置当前用户
    setCurrentUser(state, user) {
      state.currentUser = user
    }
  },
  actions: {
    // 用户注册（使用Supabase）
    async registerUser({ commit }, { username, password, email }) {
      // console.log('Register User - Supabase Enabled:', this.state.supabaseEnabled); // 仅调试时使用
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
      // console.log('Register User - Supabase Enabled:', this.state.supabaseEnabled); // 仅调试时使用
      let user;
      if (this.state.supabaseEnabled) {
        // 使用Supabase进行登录
        const supabaseUser = await userApi.login(username, password)
        // 确保返回的用户对象字段名与本地存储一致
        user = {
          id: supabaseUser.id,
          username: supabaseUser.username,
          email: supabaseUser.email,
          isAdmin: supabaseUser.isAdmin,
          mindMapPermission: supabaseUser.mindMapPermission,
          createdAt: supabaseUser.createdAt
        };
      } else {
        // 使用本地存储（当前实现）
        const localUsers = this.state.users
        user = localUsers.find(u => 
          u.username === username && u.password === password
        )
        if (!user || user.mindMapPermission !== 1) {
          throw new Error('用户名或密码错误，或权限不足')
        }
      }
      
      // 在store中设置当前用户
      commit('setCurrentUser', user);
      
      return user;
    },
    
    // 获取用户思维导图列表
    async getUserMindMaps({ commit }, userId) {
      if (this.state.supabaseEnabled) {
        const mindMaps = await mindMapApi.getUserMindMaps(userId)
        // console.log('从Supabase获取到的思维导图列表:', mindMaps); // 隐私保护：不输出用户数据
        return mindMaps
      } else {
        // 返回本地存储的思维导图数据
        return []
      }
    },
    
    // 保存思维导图（根据是否传入ID来决定是创建还是更新），并同步到本地缓存
    async saveMindMap({ commit, state }, { id, userId, title, content, isUpdate }) {
      // console.log('💾 Store - 开始保存思维导图，ID:', id, '标题:', title, '用户ID:', userId);
      
      if (this.state.supabaseEnabled) {
        let result;
        if (id) {
          // 如果传入了ID，则更新现有思维导图
          // console.log('💾 Store - 更新现有思维导图，ID:', id);
          // 输出完整的思维导图内容以确认保存的是最新内容
          // console.log('💾 Store - 准备保存的思维导图内容:', JSON.stringify(content, null, 2));
          result = await mindMapApi.updateMindMap(id, title, content);
          // console.log('💾 Store - 更新思维导图完成，结果ID:', result?.id);
          
          // 同步到本地缓存 - 更新现有记录
          const updatedMindMap = {
            id: result.id,
            user_id: result.user_id,
            title: result.title,
            created_at: result.created_at,
            updated_at: result.updated_at,
            is_public: result.is_public
          };
          
          // 更新本地缓存列表中的对应记录
          const updatedLocalList = state.localMindMaps.map(mindMap => 
            mindMap.id === id ? updatedMindMap : mindMap
          );
          commit('setLocalMindMaps', updatedLocalList);
          console.log('💾 Store - 本地缓存已更新，列表长度:', updatedLocalList.length);
          
        } else {
          // 如果没有传入ID，则创建新思维导图
          // console.log('💾 Store - 创建新思维导图，用户ID:', userId);

          result = await mindMapApi.saveMindMap(userId, title, content);
          // console.log('💾 Store - 创建思维导图完成，结果ID:', result?.id);
          
          // 同步到本地缓存 - 添加新记录
          const newMindMap = {
            id: result.id,
            user_id: result.user_id,
            title: result.title,
            created_at: result.created_at,
            updated_at: result.updated_at,
            is_public: result.is_public
          };
          
          // 将新记录添加到本地缓存列表的开头
          const updatedLocalList = [newMindMap, ...state.localMindMaps];
          commit('setLocalMindMaps', updatedLocalList);
          console.log('💾 Store - 本地缓存已更新，列表长度:', updatedLocalList.length);
        }
        
        return result;
      } else {
        console.log('💾 Store - Supabase未启用，使用本地保存逻辑');
        // 本地保存逻辑
        return null;
      }
    },
    
    // 更新思维导图标题
    async updateMindMapTitle({ commit }, { mindMapId, userId, title }) {
      if (this.state.supabaseEnabled) {
        return await mindMapApi.updateMindMapTitle(mindMapId, userId, title)
      } else {
        // 本地更新逻辑
        return null
      }
    },
    
    // 删除思维导图
    async deleteMindMap({ commit }, { mindMapId, userId }) {
      if (this.state.supabaseEnabled) {
        return await mindMapApi.deleteMindMap(mindMapId, userId)
      } else {
        // 本地删除逻辑
        return null
      }
    },
    
    // 获取特定思维导图的完整数据
    async getMindMapById({ commit }, { mindMapId, userId }) {
      if (this.state.supabaseEnabled) {
        return await mindMapApi.getMindMapById(mindMapId, userId)
      } else {
        // 本地获取逻辑
        return null
      }
    },
    
    // 切换Supabase启用状态
    toggleSupabase({ commit }, enabled) {
      commit('setSupabaseEnabled', enabled)
    },
    
    // 用户登出
    logout({ commit }) {
      commit('setCurrentUser', null);
    },
    
    // 更新用户密码
    async updateUserPassword({ commit, state }, { userId, newPassword }) {
      if (state.supabaseEnabled) {
        // 使用 Supabase API 更新密码
        try {
          await userApi.updatePassword(userId, newPassword);
          // 注意：出于安全考虑，实际的密码更新需要使用专门的API
          // 这里仅作为占位符，实际实现需要根据你的 Supabase 配置进行调整
          // console.log('通过Supabase更新密码成功'); // 仅调试时使用
        } catch (error) {
          // console.error('更新数据库密码失败:', error);
          throw error;
        }
      } else {
        // 使用本地存储更新密码
        commit('updateUserPassword', { userId, newPassword });
      }
    },
    
    // 获取用户可用的AI配置
    async fetchAvailableAiConfigs({ commit, state }, userId) {
      try {
        const configs = await aiConfigApi.getUserAvailableAiConfigs(userId)
        
        // 更新state中的AI系统配置，但不包含敏感信息
        const updatedProviders = {}
        configs.forEach(config => {
          updatedProviders[config.id] = {
            name: config.provider_name || config.providerName,
            api: config.api_endpoint || config.apiEndpoint,
            type: 'custom', // 默认类型，可以根据实际配置调整
            config: {
              model: config.model_name || config.modelName,
              // 不包含API密钥等敏感信息
            }
          }
        })
        
        const newAiSystem = {
          ...state.aiSystem,
          providers: {
            ...state.aiSystem.providers,
            ...updatedProviders
          }
        }
        
        commit('setLocalConfig', { aiSystem: newAiSystem })
        return configs
      } catch (error) {
        // console.error('获取AI配置失败:', error)
        throw error
      }
    },
    
    // 用户选择AI配置（优化版本：立即更新UI，异步更新数据库）
    async selectAiConfig({ commit, state }, { userId, configId }) {
      try {
        // 首先尝试从本地状态获取配置，避免重复数据库查询
        const providers = state.aiSystem.providers || {};
        const configInState = providers[configId];
        
        if (configInState) {
          // 如果配置已经在本地状态中，立即更新当前配置，然后异步更新数据库
          const newAiSystem = {
            ...state.aiSystem,
            currentProvider: configId
          };
          commit('setLocalConfig', { aiSystem: newAiSystem });
          
          // 异步更新数据库，不阻塞UI响应
          aiConfigApi.selectAiConfig(userId, configId)
            .then(success => {
              if (success) {
                // console.log('AI配置选择已同步到数据库:', configId); // 仅调试时使用
              } else {
                // console.error('AI配置选择同步到数据库失败:', configId);
              }
            })
            .catch(error => {
              // console.error('异步更新AI配置选择到数据库失败:', error);
            });
          
          return true;
        } else {
          // 如果配置不在本地状态中，按原方式处理
          const success = await aiConfigApi.selectAiConfig(userId, configId)
          if (success) {
            // 从后端获取所选配置的详细信息
            const selectedConfig = await aiConfigApi.getUserCurrentAiConfig(userId)
            
            if (selectedConfig) {
              // 更新本地状态，包括当前配置ID和配置详情
              const newAiSystem = {
                ...state.aiSystem,
                currentProvider: configId,
                providers: {
                  ...state.aiSystem.providers,
                  [configId]: {
                    name: selectedConfig.provider_name || selectedConfig.providerName,
                    api: selectedConfig.api_endpoint || selectedConfig.apiEndpoint,
                    type: 'custom',
                    config: {
                      model: selectedConfig.model_name || selectedConfig.modelName,
                      // 注意：不包含API密钥等敏感信息
                    }
                  }
                }
              }
              commit('setLocalConfig', { aiSystem: newAiSystem })
              
              // 添加调试信息
              // console.log('选择AI配置成功 - 新的AI系统状态:', newAiSystem); // 隐私保护：不输出系统状态
            } else {
              // 如果获取不到配置详情，至少更新当前选择
              const newAiSystem = {
                ...state.aiSystem,
                currentProvider: configId
              }
              commit('setLocalConfig', { aiSystem: newAiSystem })
              
              // 添加调试信息
              // console.log('选择AI配置成功 - 但未获取到配置详情，AI系统状态:', newAiSystem); // 隐私保护：不输出系统状态
            }
            
            return success
          }
        }
      } catch (error) {
        // console.error('选择AI配置失败:', error)
        throw error
      }
    },
    
    // 获取用户当前AI配置
    async fetchUserCurrentAiConfig({ commit, state }, userId) {
      try {
        const config = await aiConfigApi.getUserCurrentAiConfig(userId)
        if (config) {
          // 更新本地AI系统配置
          const updatedProviders = {
            ...state.aiSystem.providers,
            [config.id]: {
              name: config.provider_name || config.providerName,
              api: config.api_endpoint || config.apiEndpoint,
              type: 'custom',
              config: {
                model: config.model_name || config.modelName,
              }
            }
          }
          
          const newAiSystem = {
            ...state.aiSystem,
            currentProvider: config.id,
            providers: updatedProviders
          }
          
          commit('setLocalConfig', { aiSystem: newAiSystem })
          return config
        }
        return null
      } catch (error) {
        // console.error('获取用户当前AI配置失败:', error)
        throw error
      }
    },
    
    // 通过代理调用AI服务
    async callAiThroughProxy({ state }, { userId, aiPayload }) {
      try {
        return await aiConfigApi.callAiService(userId, aiPayload)
      } catch (error) {
        // console.error('AI服务调用失败:', error)
        throw error
      }
    }
  },
  getters: {
    // 获取用户可用的AI配置
    availableAiConfigs: (state) => {
      // 从AI系统中提取可用的配置信息，不包含敏感信息如API密钥
      const currentProviderId = state.aiSystem.currentProvider;
      const providers = state.aiSystem.providers || {};
      
      // 只返回激活状态的配置（普通用户视角）
      const availableConfigs = [];
      Object.keys(providers).forEach(key => {
        const provider = providers[key];
        // 仅返回非内置配置（即从数据库获取的配置）
        if (key !== 'huoshan' && key !== 'navy') {
          availableConfigs.push({
            id: key,
            provider_name: provider.name || provider.providerName,
            api_endpoint: provider.api || provider.apiEndpoint,
            model_name: provider.config?.model || provider.modelName,
            is_active: true, // 从数据库加载的配置默认为激活状态
            created_at: provider.createdAt,
            updated_at: provider.updatedAt
          });
        }
      });
      
      return availableConfigs;
    }
  }
})

export default store
