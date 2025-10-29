import supabase from '@/utils/supabase'
import { compressMindMap, decompressMindMap } from '@/utils/mindmap-compression'

// 用户相关API
export const userApi = {
  // 注册用户
  async register(username, password, email = null) {

    
    // 首先检查用户名是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 表示未找到数据
      // console.log('Supabase API - Check username error:', checkError); // 调试时可启用
      throw new Error('检查用户名时出错')
    }

    if (existingUser) {
      // console.log('Supabase API - Username already exists:', existingUser); // 隐私保护：不输出用户信息
      throw new Error('用户名已存在')
    }

    // 创建新用户（mind_map_permission 默认为 0）
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password_hash: await hashPassword(password), // 实际应用中应在后端处理
        mind_map_permission: 0  // 新用户默认权限为0，需管理员设置
      }])
      .select()
      .single()

    if (error) {
      // console.log('Supabase API - Insert user error:', error); // 调试时可启用
      throw new Error(error.message || '注册失败')
    }

    // console.log('Supabase API - User registered successfully:', newUser); // 隐私保护：不输出用户数据
    return newUser
  },

  // 用户登录
  async login(username, password) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      throw new Error('用户名或密码错误')
    }

    // 在实际应用中，密码验证应在后端完成
    // 这里简化处理，假设密码验证通过
    
    // 转换字段名为前端使用的格式，确保与本地存储一致
    const transformedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      mindMapPermission: user.mind_map_permission,
      createdAt: user.created_at
    };

    return transformedUser
  },

  // 获取用户信息
  async getUserById(id) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message || '获取用户信息失败')
    }

    return user
  },

  // 根据邮箱获取用户信息（用于会话恢复）
  async getUserByEmail(email) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      throw new Error(error.message || '获取用户信息失败')
    }

    // 转换字段名为前端使用的格式
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      mindMapPermission: user.mind_map_permission,
      createdAt: user.created_at
    }
  },

  // 验证用户是否存在且有效（用于会话验证）
  async validateUser(userId, email) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, is_admin, mind_map_permission, created_at')
      .eq('id', userId)
      .eq('email', email)
      .single()

    if (error) {
      throw new Error('用户不存在或已被删除')
    }

    // 转换字段名为前端使用的格式
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      mindMapPermission: user.mind_map_permission,
      createdAt: user.created_at
    }
  },

  // 仅通过ID验证用户是否存在且有效
  async validateUserById(userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, is_admin, mind_map_permission, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error('用户不存在或已被删除')
    }

    // 转换字段名为前端使用的格式
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      mindMapPermission: user.mind_map_permission,
      createdAt: user.created_at
    }
  },

  // 更新用户权限
  // 更新用户导图权限
  async updateMindMapPermission(userId, permission) {
    // console.log('Updating mind map permission:', { userId, permission }); // 隐私保护：不输出用户ID
    
    const { error } = await supabase
      .from('users')
      .update({ mind_map_permission: permission })
      .eq('id', userId)

    if (error) {
      console.error('Update error:', error);
      throw new Error(error.message || '更新用户权限失败')
    }

    // 重新获取更新后的用户数据
    const { data: updatedUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (selectError) {
      console.error('Select error:', selectError);
      throw new Error(selectError.message || '获取更新后的用户数据失败')
    }

    // console.log('Updated user data:', updatedUser); // 隐私保护：不输出用户数据
    return updatedUser
  }
}

// 思维导图相关API
export const mindMapApi = {
  // 保存思维导图
  async saveMindMap(userId, title, content) {
    // 压缩思维导图数据
    const compressedContent = compressMindMap(content)
    
    const { data: mindMap, error } = await supabase
      .from('mind_maps')
      .insert([{
        user_id: userId,
        title,
        content: compressedContent  // 存储压缩后的内容
      }])
      .select()
      .single()

    if (error) {
      throw new Error(error.message || '保存思维导图失败')
    }

    return mindMap
  },

  // 更新思维导图
  async updateMindMap(mindMapId, title, content) {
    // 压缩思维导图数据
    const compressedContent = compressMindMap(content)
    
    const { data: updatedMindMap, error } = await supabase
      .from('mind_maps')
      .update({
        title,
        content: compressedContent,  // 存储压缩后的内容
        updated_at: new Date().toISOString()
      })
      .eq('id', mindMapId)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || '更新思维导图失败')
    }

    return updatedMindMap
  },

  // 获取用户的思维导图列表
  async getUserMindMaps(userId) {
    // 只获取元数据，不获取内容（内容在单独获取时才解压缩）
    const { data: mindMaps, error } = await supabase
      .from('mind_maps')
      .select('id, user_id, title, created_at, updated_at, is_public')  // 不包含content字段
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message || '获取思维导图列表失败')
    }

    return mindMaps
  },

  // 获取特定思维导图
  async getMindMapById(mindMapId, userId) {
    const { data: mindMap, error } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .single()

    if (error) {
      throw new Error(error.message || '获取思维导图失败')
    }

    // 如果内容存在，则解压缩
    if (mindMap && mindMap.content) {
      try {
        mindMap.content = decompressMindMap(mindMap.content)
      } catch (decompressError) {
        // console.error('解压缩思维导图失败:', decompressError)
        throw new Error('思维导图数据损坏或解压缩失败')
      }
    }

    return mindMap
  },

  // 批量获取思维导图
  async getMindMapsByIds(mindMapIds, userId) {
    if (!mindMapIds || mindMapIds.length === 0) {
      return [];
    }


    // 验证ID格式
    for (let i = 0; i < Math.min(5, mindMapIds.length); i++) {
      const id = mindMapIds[i];
    }

    // 按批次处理，避免超出数据库查询限制
    const batchSize = 100; // Supabase IN查询建议的限制
    const allResults = [];

    for (let i = 0; i < mindMapIds.length; i += batchSize) {
      const batchIds = mindMapIds.slice(i, i + batchSize);
      
      // 额外验证批次ID
      
      // 输出模拟的 SQL 查询语句
      const quotedIds = batchIds.map(id => `'${id}'`).join(', ');
      
      const { data: mindMaps, error } = await supabase
        .from('mind_maps')
        .select('*')
        .in('id', batchIds)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`批量获取思维导图失败: ${error.message || error.code || '未知错误'}`);
      }


      // 解压缩每个思维导图的内容
      for (const mindMap of mindMaps) {
        if (mindMap && mindMap.content) {
          try {
            mindMap.content = decompressMindMap(mindMap.content)
          } catch (decompressError) {
            // 跳过解压失败的项，继续处理其他项
            continue;
          }
        }
      }

      allResults.push(...mindMaps);
    }

    
    return allResults;
  },

  // 删除思维导图
  async deleteMindMap(mindMapId, userId) {
    const { error } = await supabase
      .from('mind_maps')
      .delete()
      .eq('id', mindMapId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(error.message || '删除思维导图失败')
    }

    return true
  },
  
  // 更新思维导图标题
  async updateMindMapTitle(mindMapId, userId, title) {
    const { data: updatedMindMap, error } = await supabase
      .from('mind_maps')
      .update({ 
        title,
        updated_at: new Date().toISOString()
      })
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .select('id, user_id, title, created_at, updated_at, is_public')  // 只返回元数据，不返回内容
      .single()

    if (error) {
      throw new Error(error.message || '更新思维导图标题失败')
    }

    return updatedMindMap
  }
}

// AI配置相关API
export const aiConfigApi = {
  // 管理员创建AI提供商配置
  async createAiProviderConfig(configData) {
    // 检查必填字段
    if (!configData.providerName || !configData.apiEndpoint || !configData.modelName || !configData.apiKey) {
      throw new Error('缺少必要字段')
    }
    
    // 加密API密钥
    const encryptedApiKey = await encryptApiKey(configData.apiKey)
    
    // 检查是否已存在相同API密钥和模型名称的配置
    const { data: existingConfig, error: existingError } = await supabase
      .from('ai_provider_configs')
      .select('id, provider_name')
      .eq('api_key_encrypted', encryptedApiKey)
      .eq('model_name', configData.modelName)
      .single()
    
    if (existingConfig) {
      throw new Error(`已存在相同的API密钥和模型名称配置: ${existingConfig.provider_name}`)
    }
    
    const { data: aiConfig, error } = await supabase
      .from('ai_provider_configs')
      .insert([{
        provider_name: configData.providerName,
        api_endpoint: configData.apiEndpoint,
        model_name: configData.modelName,
        api_key_encrypted: encryptedApiKey, // 加密存储
        is_active: configData.isActive !== undefined ? configData.isActive : true,
        created_by: configData.createdBy
      }])
      .select()
      .single()

    if (error) {
      // console.error('创建AI提供商配置失败:', error);
      throw new Error(error.message || '创建AI配置失败')
    }
    
    return transformAiConfigForFrontend(aiConfig)
  },
  
  // 管理员更新AI提供商配置
  async updateAiProviderConfig(configId, configData) {
    // 获取现有配置以确保所有必需字段都存在
    const { data: existingConfig, error: fetchError } = await supabase
      .from('ai_provider_configs')
      .select('api_key_encrypted')
      .eq('id', configId)
      .single()

    if (fetchError) {
      throw new Error('获取现有配置失败: ' + fetchError.message)
    }

    const updateData = {
      provider_name: configData.providerName,
      api_endpoint: configData.apiEndpoint,
      model_name: configData.modelName,
      is_active: configData.isActive !== undefined ? configData.isActive : existingConfig.is_active
    }
    
    // 如果提供了新API密钥，则使用新密钥，否则保留现有密钥以满足数据库约束
    if (configData.apiKey) {
      updateData.api_key_encrypted = await encryptApiKey(configData.apiKey)
    } else {
      // 保留现有的加密密钥，以避免违反数据库的非空约束
      updateData.api_key_encrypted = existingConfig.api_key_encrypted
    }
    
    const { data: aiConfig, error } = await supabase
      .from('ai_provider_configs')
      .update(updateData)
      .eq('id', configId)
      .select()
      .single()

    if (error) {
      // console.error('更新AI提供商配置失败:', error);
      throw new Error(error.message || '更新AI配置失败')
    }
    
    return transformAiConfigForFrontend(aiConfig)
  },
  
  // 管理员删除AI提供商配置
  async deleteAiProviderConfig(configId) {
    const { error } = await supabase
      .from('ai_provider_configs')
      .delete()
      .eq('id', configId)

    if (error) {
      // console.error('删除AI提供商配置失败:', error);
      throw new Error(error.message || '删除AI配置失败')
    }
    
    return true
  },
  
  // 获取所有AI提供商配置（仅管理员）
  async getAllAiProviderConfigs() {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      // console.error('获取AI提供商配置失败:', error);
      throw new Error(error.message || '获取AI配置失败')
    }
    
    // 转换数据格式以适配前端使用
    return data.map(config => transformAiConfigForFrontend(config))
  },
  
  // 获取用户可用的AI配置（普通用户只能看到基本信息）
  async getUserAvailableAiConfigs(userId) {
    // 首先验证用户权限
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_admin, mind_map_permission')
      .eq('id', userId)
      .single()
    
    if (userError) {
      // console.error('验证用户权限失败:', userError);
      throw new Error('验证用户权限失败')
    }
    
    if (!user) {
      throw new Error('用户不存在')
    }
    
    // 检查AI使用权限：只要有思维导图权限，就具有AI权限
    if (!user.is_admin && user.mind_map_permission !== 1) {
      throw new Error('无AI使用权限')
    }
    
    let query = supabase
      .from('ai_provider_configs')
      .select('id, provider_name, api_endpoint, model_name, is_active, created_at, updated_at')
      .eq('is_active', true)  // 只返回激活的配置
    
    if (!user.is_admin) {
      // 普通用户只能看到激活的配置
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) {
      // console.error('获取可用AI配置失败:', error);
      throw new Error(error.message || '获取AI配置失败')
    }
    
    return data
  },
  
  // 更新用户密码
  async updatePassword(userId, newPassword) {
    // 注意：在实际应用中，密码更新应该使用专门的密码重置流程
    // 这里只是一个示例实现
    const hashedPassword = btoa(newPassword); // 简单的Base64编码，实际应用中应使用更强的哈希算法
    
    const { error } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId)
    
    if (error) {
      // console.error('更新密码失败:', error);
      throw new Error(error.message || '更新密码失败');
    }
    

    return { success: true };
  },
  
  // 用户选择AI配置
  async selectAiConfig(userId, configId) {
    // 首先验证用户权限
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_admin, mind_map_permission')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      throw new Error('验证用户权限失败')
    }
    
    // 检查AI使用权限：只要有思维导图权限，就具有AI权限
    if (!user.is_admin && user.mind_map_permission !== 1) {
      throw new Error('无AI使用权限')
    }
    
    // 验证配置是否存在且激活
    const { data: config, error: configError } = await supabase
      .from('ai_provider_configs')
      .select('id')
      .eq('id', configId)
      .eq('is_active', true)
      .single()
    
    if (configError || !config) {
      throw new Error('指定的AI配置不存在或不可用')
    }
    
    // 更新用户当前选择的AI配置
    const { error } = await supabase
      .from('users')
      .update({ current_ai_config_id: configId })
      .eq('id', userId)
    
    if (error) {
      // console.error('更新用户AI配置选择失败:', error);
      throw new Error(error.message || '更新AI配置选择失败')
    }
    
    return true
  },
  
  // 获取用户当前选择的AI配置信息（不包含密钥）
  async getUserCurrentAiConfig(userId) {
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('current_ai_config_id, is_admin, mind_map_permission')
      .eq('id', userId)
      .single()
    
    if (userError || !userInfo) {
      throw new Error('获取用户信息失败')
    }
    
    // 检查AI使用权限：只要有思维导图权限，就具有AI权限
    if (!userInfo.is_admin && userInfo.mind_map_permission !== 1) {
      throw new Error('无AI使用权限')
    }
    
    if (!userInfo.current_ai_config_id) {
      return null
    }
    
    const { data: config, error: configError } = await supabase
      .from('ai_provider_configs')
      .select('id, provider_name, api_endpoint, model_name')
      .eq('id', userInfo.current_ai_config_id)
      .eq('is_active', true)
      .single()
    
    if (configError || !config) {
      return null
    }
    
    return config
  },
  
  // 根据API接口获取AI提供商配置
  async getAiProviderConfigsByEndpoint(apiEndpoint) {
    // 首先验证管理员权限
    // 注意：此方法仅在管理员上下文中使用，需确保调用方已验证权限
    
    // 确保API端点是有效的URL格式
    if (!apiEndpoint || typeof apiEndpoint !== 'string') {
      throw new Error('API端点必须是有效的字符串')
    }
    
    // 检查API端点是否是完整URL
    let validatedEndpoint = apiEndpoint.trim();
    if (!validatedEndpoint.startsWith('http://') && !validatedEndpoint.startsWith('https://')) {
      throw new Error('API端点必须是完整URL（以http://或https://开头）')
    }
    
    try {
      const { data: configs, error } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .eq('api_endpoint', validatedEndpoint)  // 根据API接口匹配
      
      if (error) {
        console.error('根据API接口获取AI提供商配置失败:', error); // 添加详细错误日志
        throw new Error(error.message || '获取AI配置失败')
      }
      
      // 转换数据格式以适配前端使用
      return configs.map(config => transformAiConfigForFrontend(config));
    } catch (error) {
      console.error('查询AI提供商配置时发生错误:', {
        apiEndpoint: validatedEndpoint,
        error: error
      }); // 详细错误日志
      throw error;
    }
  },

  // 通过后端代理调用AI服务（基于数据库配置）
  async callAiService(userId, aiPayload) {
    // console.log('开始AI服务调用:', { userId, hasPayload: !!aiPayload }); // 隐私保护：不输出用户ID和请求负载
    
    // 验证必要参数
    if (!userId) {
      throw new Error('用户ID不能为空')
    }
    
    if (!aiPayload) {
      throw new Error('AI请求数据不能为空')
    }
    
    // console.log('准备发送AI代理请求:', {
    //   userId: userId,
    //   payloadKeys: Object.keys(aiPayload),
    //   messagesCount: aiPayload.messages?.length
    // }); // 隐私保护：不输出用户ID和请求详情
    
    // 获取用户当前选择的AI配置ID（从localStorage）
    let currentConfigId = null
    try {
      const localConfig = JSON.parse(localStorage.getItem('SIMPLE_MIND_MAP_LOCAL_CONFIG') || '{}')
      currentConfigId = localConfig.aiSystem?.currentProvider || null
    } catch (e) {
      console.warn('无法从localStorage获取AI配置ID:', e)
    }
    
    // 调用后端AI代理服务
    const proxyResponse = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId.toString()
      },
      body: JSON.stringify({
        userId: userId,
        configId: currentConfigId, // 从localStorage获取的配置ID
        aiPayload: aiPayload
      })
    })
    
    // console.log('AI代理响应状态:', proxyResponse.status); // 调试时可启用
    
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text().catch(() => '')
      // console.error('AI代理请求失败:', {
      //   status: proxyResponse.status,
      //   statusText: proxyResponse.statusText,
      //   error: errorText
      // })
      
      let errorData = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { error: errorText || '未知错误' }
      }
      
      // 根据状态码提供更具体的错误信息
      if (proxyResponse.status === 401) {
        throw new Error(errorData.error || '认证失败，请重新登录')
      } else if (proxyResponse.status === 403) {
        throw new Error(errorData.error || '无AI使用权限')
      } else if (proxyResponse.status === 400) {
        throw new Error(errorData.error || '请求参数错误')
      } else if (proxyResponse.status === 503) {
        throw new Error(errorData.error || '无法连接到AI服务')
      } else if (proxyResponse.status === 504) {
        throw new Error(errorData.error || 'AI服务请求超时')
      } else {
        throw new Error(errorData.error || `AI服务调用失败: ${proxyResponse.status} ${proxyResponse.statusText}`)
      }
    }
    
    const result = await proxyResponse.json()
    // console.log('AI服务调用成功:', {
    //   hasChoices: !!result.choices,
    //   choicesLength: result.choices?.length,
    //   hasContent: !!result.choices?.[0]?.message?.content
    // }); // 隐私保护：不输出AI响应内容
    
    return result
  }
}

// 简单加密函数（实际应用中需要更安全的加密）
async function encryptApiKey(key) {
  // 在实际应用中，敏感数据加密应在后端完成
  // 这里仅作演示，实际部署时应移除或加强加密算法
  return btoa(unescape(encodeURIComponent(key)))
}

async function decryptApiKey(encryptedKey) {
  // 在实际应用中，敏感数据解密应在后端完成
  // 这里仅作演示，实际部署时应移除或加强加密算法
  return decodeURIComponent(escape(atob(encryptedKey)))
}

// 将数据库格式的AI配置转换为前端可用格式
function transformAiConfigForFrontend(config) {
  return {
    id: config.id,
    providerName: config.provider_name,
    apiEndpoint: config.api_endpoint,
    modelName: config.model_name,
    isActive: config.is_active,
    createdAt: config.created_at,
    updatedAt: config.updated_at,
    // 不包含api_key_encrypted字段
  }
}

// 标签API替代方案 - 使用本地存储模拟
const tagStorageManager = {
  // 获取标签存储key
  getTagsKey(userId) {
    return `user_tags_${userId}`
  },
  
  getMindMapTagsKey(userId) {
    return `user_mindmap_tags_${userId}`
  },

  // 获取用户标签列表
  getUserTags(userId) {
    try {
      const key = this.getTagsKey(userId)
      const tags = JSON.parse(localStorage.getItem(key) || '[]')
      return tags
    } catch (error) {
      console.error('获取用户标签失败:', error)
      return []
    }
  },

  // 保存用户标签列表
  saveUserTags(userId, tags) {
    try {
      const key = this.getTagsKey(userId)
      localStorage.setItem(key, JSON.stringify(tags))
      return true
    } catch (error) {
      console.error('保存用户标签失败:', error)
      return false
    }
  },

  // 获取思维导图标签关联
  getMindMapTags(userId) {
    try {
      const key = this.getMindMapTagsKey(userId)
      const relations = JSON.parse(localStorage.getItem(key) || '[]')
      return relations
    } catch (error) {
      console.error('获取思维导图标签关联失败:', error)
      return []
    }
  },

  // 保存思维导图标签关联
  saveMindMapTags(userId, relations) {
    try {
      const key = this.getMindMapTagsKey(userId)
      localStorage.setItem(key, JSON.stringify(relations))
      return true
    } catch (error) {
      console.error('保存思维导图标签关联失败:', error)
      return false
    }
  },

  // 生成唯一ID
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
}

// 标签相关API
export const tagApi = {
  // 创建私有标签
  async createTag(userId, name, color = '#cccccc') {
    // 验证参数
    if (!userId || !name) {
      throw new Error('用户ID和标签名称不能为空')
    }

    // 检查标签名称长度
    if (name.length > 50) {
      throw new Error('标签名称不能超过50个字符')
    }

    // 验证颜色格式（简单验证）
    if (color && !color.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('颜色格式不正确，请使用十六进制格式如 #cccccc')
    }

    try {
      // 首先尝试Supabase
      const { data: tag, error } = await supabase
        .from('tags')
        .insert([{
          name: name.trim(),
          color: color,
          is_public: false,
          owner_id: userId
        }])
        .select()
        .single()

      if (!error) {
        console.log('Supabase标签创建成功')
        return tag
      }

      // Supabase失败，使用本地存储
      console.warn('Supabase创建标签失败，使用本地存储:', error.message)
    } catch (error) {
      console.warn('Supabase连接失败，使用本地存储:', error.message)
    }

    // 本地存储备用方案
    const userTags = tagStorageManager.getUserTags(userId)
    
    // 检查是否有重复标签名称
    if (userTags.some(tag => tag.name === name.trim())) {
      throw new Error('您已经创建了同名的标签')
    }

    const newTag = {
      id: tagStorageManager.generateId(),
      name: name.trim(),
      color: color,
      is_public: false,
      owner_id: userId,
      created_at: new Date().toISOString()
    }

    userTags.push(newTag)
    
    if (!tagStorageManager.saveUserTags(userId, userTags)) {
      throw new Error('保存标签到本地存储失败')
    }

    console.log('本地存储标签创建成功')
    return newTag
  },

  // 验证用户权限的辅助方法
  async validateUserPermission(userId) {
    try {
      // 验证用户是否存在且有效
      const user = await userApi.validateUserById(userId)
      if (!user) {
        throw new Error('用户不存在或已被删除')
      }
      return user
    } catch (error) {
      console.error('用户权限验证失败:', error)
      throw new Error('用户权限验证失败: ' + error.message)
    }
  },

  // 删除私有标签
  async deleteTag(userId, tagId) {
    if (!userId || !tagId) {
      throw new Error('用户ID和标签ID不能为空')
    }

    // 检查标签是否被使用
    const { data: usageCount, error: usageError } = await supabase
      .from('mindmap_tags')
      .select('tag_id', { count: 'exact' })
      .eq('tag_id', tagId)

    if (usageError) {
      throw new Error('检查标签使用情况失败')
    }

    if (usageCount && usageCount.length > 0) {
      throw new Error('该标签正在被使用，无法删除。请先从相关思维导图中移除该标签')
    }

    // 删除标签（RLS策略确保只能删除自己的标签）
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId)
      .eq('owner_id', userId)
      .eq('is_public', false) // 确保不能删除公共标签

    if (error) {
      throw new Error(error.message || '删除标签失败')
    }

    return true
  },

  // 更新标签信息
  async updateTag(userId, tagId, updates) {
    if (!userId || !tagId) {
      throw new Error('用户ID和标签ID不能为空')
    }

    const updateData = {}
    
    // 验证和处理更新字段
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.length > 50) {
        throw new Error('标签名称不能为空且不能超过50个字符')
      }
      updateData.name = updates.name.trim()
    }

    if (updates.color !== undefined) {
      if (updates.color && !updates.color.match(/^#[0-9A-Fa-f]{6}$/)) {
        throw new Error('颜色格式不正确，请使用十六进制格式如 #cccccc')
      }
      updateData.color = updates.color
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('没有需要更新的内容')
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', tagId)
      .eq('owner_id', userId)
      .eq('is_public', false) // 确保不能修改公共标签
      .select()
      .single()

    if (error) {
      // 处理重复标签名称错误
      if (error.code === '23505') {
        throw new Error('您已经创建了同名的标签')
      }
      throw new Error(error.message || '更新标签失败')
    }

    return tag
  },

  // 获取用户可用的标签列表（包括自己的私有标签和公共标签）
  async getUserAvailableTags(userId) {
    if (!userId) {
      throw new Error('用户ID不能为空')
    }

    try {
      // 首先尝试Supabase
      const { data: tags, error } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          color,
          is_public,
          owner_id,
          created_at,
          mindmap_tags(count)
        `)
        .or(`owner_id.eq.${userId},is_public.eq.true`)
        .order('is_public', { ascending: true }) // 私有标签在前
        .order('created_at', { ascending: false })

      if (!error) {
        console.log('Supabase获取标签列表成功')
        return tags.map(tag => ({
          ...tag,
          usageCount: tag.mindmap_tags?.[0]?.count || 0,
          isOwned: tag.owner_id === userId
        }))
      }

      console.warn('Supabase获取标签失败，使用本地存储:', error.message)
    } catch (error) {
      console.warn('Supabase连接失败，使用本地存储:', error.message)
    }

    // 本地存储备用方案
    const userTags = tagStorageManager.getUserTags(userId)
    const mindMapTagRelations = tagStorageManager.getMindMapTags(userId)

    // 计算每个标签的使用次数
    const tagsWithUsage = userTags.map(tag => {
      const usageCount = mindMapTagRelations.filter(relation => relation.tag_id === tag.id).length
      return {
        ...tag,
        usageCount: usageCount,
        isOwned: tag.owner_id === userId
      }
    })

    // 按创建时间倒序排列
    tagsWithUsage.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    console.log('本地存储获取标签列表成功')
    return tagsWithUsage
  },

  // 为思维导图添加标签
  async addTagToMindMap(userId, mindMapId, tagId) {
    if (!userId || !mindMapId || !tagId) {
      throw new Error('用户ID、思维导图ID和标签ID不能为空')
    }

    try {
      // 首先尝试Supabase
      // 验证思维导图是否属于当前用户
      const { data: mindMap, error: mindMapError } = await supabase
        .from('mind_maps')
        .select('id')
        .eq('id', mindMapId)
        .eq('user_id', userId)
        .single()

      if (!mindMapError && mindMap) {
        // 验证标签是否可用
        const { data: tag, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('id', tagId)
          .or(`owner_id.eq.${userId},is_public.eq.true`)
          .single()

        if (!tagError && tag) {
          // 先检查是否已存在关联
          const { data: existing } = await supabase
            .from('mindmap_tags')
            .select('*')
            .eq('mindmap_id', mindMapId)
            .eq('tag_id', tagId)
            .single()

          if (existing) {
            throw new Error('该思维导图已经添加了此标签')
          }

          // 添加标签关联
          const { data: relation, error } = await supabase
            .from('mindmap_tags')
            .insert([{
              mindmap_id: mindMapId,
              tag_id: tagId
            }])
            .select()
            .single()

          if (!error) {
            console.log('Supabase添加标签关联成功')
            return relation
          }

          // 处理其他错误
          if (error.code === '23505') {
            throw new Error('该思维导图已经添加了此标签')
          }
        }
      }

      console.warn('Supabase操作失败，使用本地存储')
    } catch (error) {
      console.warn('Supabase连接失败，使用本地存储:', error.message)
    }

    // 本地存储备用方案
    const userTags = tagStorageManager.getUserTags(userId)
    const mindMapTagRelations = tagStorageManager.getMindMapTags(userId)

    // 验证标签是否存在
    const tag = userTags.find(t => t.id === tagId)
    if (!tag) {
      throw new Error('标签不存在或无权限使用')
    }

    // 检查是否已经关联
    const existingRelation = mindMapTagRelations.find(r => 
      r.mindmap_id === mindMapId && r.tag_id === tagId
    )
    if (existingRelation) {
      throw new Error('该思维导图已经添加了此标签')
    }

    // 创建新关联
    const newRelation = {
      id: tagStorageManager.generateId(),
      mindmap_id: mindMapId,
      tag_id: tagId,
      created_at: new Date().toISOString()
    }

    mindMapTagRelations.push(newRelation)
    
    if (!tagStorageManager.saveMindMapTags(userId, mindMapTagRelations)) {
      throw new Error('保存标签关联到本地存储失败')
    }

    console.log('本地存储添加标签关联成功')
    return newRelation
  },

  // 从思维导图移除标签
  async removeTagFromMindMap(userId, mindMapId, tagId) {
    if (!userId || !mindMapId || !tagId) {
      throw new Error('用户ID、思维导图ID和标签ID不能为空')
    }

    // 验证思维导图是否属于当前用户
    const { data: mindMap, error: mindMapError } = await supabase
      .from('mind_maps')
      .select('id')
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .single()

    if (mindMapError || !mindMap) {
      throw new Error('思维导图不存在或无权限操作')
    }

    // 移除标签关联
    const { error } = await supabase
      .from('mindmap_tags')
      .delete()
      .eq('mindmap_id', mindMapId)
      .eq('tag_id', tagId)

    if (error) {
      throw new Error(error.message || '移除标签失败')
    }

    return true
  },

  // 获取思维导图的标签列表
  async getMindMapTags(userId, mindMapId) {
    if (!userId || !mindMapId) {
      throw new Error('用户ID和思维导图ID不能为空')
    }

    try {
      // 首先尝试Supabase
      // 验证思维导图是否属于当前用户
      const { data: mindMap, error: mindMapError } = await supabase
        .from('mind_maps')
        .select('id')
        .eq('id', mindMapId)
        .eq('user_id', userId)
        .single()

      if (!mindMapError && mindMap) {
        const { data: tags, error } = await supabase
          .from('mindmap_tags')
          .select(`
            tag_id,
            tags (
              id,
              name,
              color,
              is_public,
              owner_id
            )
          `)
          .eq('mindmap_id', mindMapId)

        if (!error) {
          console.log('Supabase获取思维导图标签成功')
          return tags.map(item => ({
            ...item.tags,
            isOwned: item.tags.owner_id === userId
          }))
        }
      }

      console.warn('Supabase获取思维导图标签失败，使用本地存储')
    } catch (error) {
      console.warn('Supabase连接失败，使用本地存储:', error.message)
    }

    // 本地存储备用方案
    const userTags = tagStorageManager.getUserTags(userId)
    const mindMapTagRelations = tagStorageManager.getMindMapTags(userId)

    // 获取当前思维导图的标签关联
    const mindMapRelations = mindMapTagRelations.filter(relation => 
      relation.mindmap_id === mindMapId
    )

    // 根据关联获取标签详情
    const tags = mindMapRelations.map(relation => {
      const tag = userTags.find(t => t.id === relation.tag_id)
      if (tag) {
        return {
          ...tag,
          isOwned: tag.owner_id === userId
        }
      }
      return null
    }).filter(Boolean)

    console.log('本地存储获取思维导图标签成功')
    return tags
  },

  // 根据标签筛选思维导图
  async getMindMapsByTags(userId, tagIds, matchAll = false) {
    if (!userId) {
      throw new Error('用户ID不能为空')
    }

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      throw new Error('标签ID列表不能为空')
    }

    let query = supabase
      .from('mind_maps')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        is_public,
        mindmap_tags!inner (
          tag_id,
          tags (
            id,
            name,
            color
          )
        )
      `)
      .eq('user_id', userId)

    if (matchAll) {
      // 需要包含所有指定标签的思维导图
      // 这需要更复杂的查询，暂时使用 in 查询后在前端过滤
      query = query.in('mindmap_tags.tag_id', tagIds)
    } else {
      // 包含任一指定标签的思维导图
      query = query.in('mindmap_tags.tag_id', tagIds)
    }

    const { data: mindMaps, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      throw new Error(error.message || '根据标签筛选思维导图失败')
    }

    // 如果需要匹配所有标签，在前端进行过滤
    if (matchAll) {
      return mindMaps.filter(mindMap => {
        const mindMapTagIds = mindMap.mindmap_tags.map(mt => mt.tag_id)
        return tagIds.every(tagId => mindMapTagIds.includes(tagId))
      })
    }

    return mindMaps
  },

  // 批量为思维导图添加标签
  async addTagsToMindMap(userId, mindMapId, tagIds) {
    if (!userId || !mindMapId || !Array.isArray(tagIds) || tagIds.length === 0) {
      throw new Error('参数不正确')
    }

    // 验证思维导图是否属于当前用户
    const { data: mindMap, error: mindMapError } = await supabase
      .from('mind_maps')
      .select('id')
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .single()

    if (mindMapError || !mindMap) {
      throw new Error('思维导图不存在或无权限操作')
    }

    // 验证所有标签是否可用
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id')
      .in('id', tagIds)
      .or(`owner_id.eq.${userId},is_public.eq.true`)

    if (tagsError) {
      throw new Error('验证标签权限失败')
    }

    if (tags.length !== tagIds.length) {
      throw new Error('部分标签不存在或无权限使用')
    }

    // 批量插入标签关联
    const relations = tagIds.map(tagId => ({
      mindmap_id: mindMapId,
      tag_id: tagId
    }))

    const { data: result, error } = await supabase
      .from('mindmap_tags')
      .insert(relations)
      .select()

    if (error) {
      throw new Error(error.message || '批量添加标签失败')
    }

    return result
  },

  // 搜索标签
  async searchTags(userId, searchTerm) {
    if (!userId || !searchTerm) {
      throw new Error('用户ID和搜索词不能为空')
    }

    const { data: tags, error } = await supabase
      .from('tags')
      .select('id, name, color, is_public, owner_id, created_at')
      .or(`owner_id.eq.${userId},is_public.eq.true`)
      .ilike('name', `%${searchTerm}%`)
      .order('is_public', { ascending: true })
      .order('name', { ascending: true })
      .limit(20)

    if (error) {
      throw new Error(error.message || '搜索标签失败')
    }

    return tags.map(tag => ({
      ...tag,
      isOwned: tag.owner_id === userId
    }))
  },

  // 获取标签使用统计
  async getTagUsageStats(userId, tagId) {
    if (!userId || !tagId) {
      throw new Error('用户ID和标签ID不能为空')
    }

    // 验证标签权限
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id, name, is_public, owner_id')
      .eq('id', tagId)
      .or(`owner_id.eq.${userId},is_public.eq.true`)
      .single()

    if (tagError || !tag) {
      throw new Error('标签不存在或无权限查看')
    }

    // 获取使用统计
    const { data: stats, error } = await supabase
      .from('mindmap_tags')
      .select(`
        mindmap_id,
        mind_maps (
          id,
          title,
          updated_at
        )
      `)
      .eq('tag_id', tagId)
      .eq('mind_maps.user_id', userId)

    if (error) {
      throw new Error(error.message || '获取标签使用统计失败')
    }

    return {
      tag: tag,
      usageCount: stats.length,
      usedByMindMaps: stats.map(item => item.mind_maps)
    }
  }
}

// 简单的密码哈希函数，实际应用中应使用更安全的方法
async function hashPassword(password) {
  // 在实际应用中，密码哈希应在后端完成
  // 这里仅作为示例
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}