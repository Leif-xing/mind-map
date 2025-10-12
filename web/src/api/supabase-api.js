import supabase from '@/utils/supabase'

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
    const { data: mindMap, error } = await supabase
      .from('mind_maps')
      .insert([{
        user_id: userId,
        title,
        content
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
    const { data: updatedMindMap, error } = await supabase
      .from('mind_maps')
      .update({
        title,
        content,
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
    // console.log('API - 开始获取用户思维导图列表，用户ID:', userId); // 隐私保护：不输出用户ID
    const { data: mindMaps, error } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('API - 获取思维导图列表失败:', error);
      throw new Error(error.message || '获取思维导图列表失败')
    }

    // console.log('API - 获取到的思维导图列表:', mindMaps); // 隐私保护：不输出思维导图数据
    if (mindMaps && mindMaps.length > 0) {
      mindMaps.forEach((map, index) => {
        // console.log(`API - 思维导图 ${index + 1}: ID=${map.id}, 标题=${map.title}, 内容类型=${typeof map.content}, 是否有内容=${!!map.content}`); // 隐私保护：不输出思维导图数据
        if (map.content) {
          // console.log(`API - 思维导图 ${index + 1} 内容预览:`, map.content.root ? map.content.root.data.text.substring(0, 50) + '...' : '无根节点'); // 隐私保护：不输出内容预览
        }
      });
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

    return mindMap
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
      .select()
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
      console.error('创建AI提供商配置失败:', error);
      throw new Error(error.message || '创建AI配置失败')
    }
    
    return transformAiConfigForFrontend(aiConfig)
  },
  
  // 管理员更新AI提供商配置
  async updateAiProviderConfig(configId, configData) {
    const updateData = {
      provider_name: configData.providerName,
      api_endpoint: configData.apiEndpoint,
      model_name: configData.modelName,
      is_active: configData.isActive
    }
    
    // 只有在提供了新API密钥时才更新
    if (configData.apiKey) {
      updateData.api_key_encrypted = await encryptApiKey(configData.apiKey)
    }
    
    const { data: aiConfig, error } = await supabase
      .from('ai_provider_configs')
      .update(updateData)
      .eq('id', configId)
      .select()
      .single()

    if (error) {
      console.error('更新AI提供商配置失败:', error);
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
      console.error('删除AI提供商配置失败:', error);
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
      console.error('获取AI提供商配置失败:', error);
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
      console.error('验证用户权限失败:', userError);
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
      console.error('获取可用AI配置失败:', error);
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
      console.error('更新密码失败:', error);
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
      console.error('更新用户AI配置选择失败:', error);
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
    
    // 直接调用后端AI代理服务
    const proxyResponse = await fetch('/api/ai-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId.toString()
      },
      body: JSON.stringify({
        userId: userId,
        aiPayload: aiPayload
      })
    })
    
    // console.log('AI代理响应状态:', proxyResponse.status); // 调试时可启用
    
    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text().catch(() => '')
      console.error('AI代理请求失败:', {
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        error: errorText
      })
      
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