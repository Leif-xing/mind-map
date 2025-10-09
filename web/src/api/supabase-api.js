import supabase from '@/utils/supabase'

// 用户相关API
export const userApi = {
  // 注册用户
  async register(username, password, email = null) {
    console.log('Supabase API - Register called with:', { username, email });
    
    // 首先检查用户名是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 表示未找到数据
      console.log('Supabase API - Check username error:', checkError);
      throw new Error('检查用户名时出错')
    }

    if (existingUser) {
      console.log('Supabase API - Username already exists:', existingUser);
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
      console.log('Supabase API - Insert user error:', error);
      throw new Error(error.message || '注册失败')
    }

    console.log('Supabase API - User registered successfully:', newUser);
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

  // 更新用户权限
  // 更新用户导图权限
  async updateMindMapPermission(userId, permission) {
    console.log('Updating mind map permission:', { userId, permission });
    
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

    console.log('Updated user data:', updatedUser);
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
    console.log('API - 开始获取用户思维导图列表，用户ID:', userId);
    const { data: mindMaps, error } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('API - 获取思维导图列表失败:', error);
      throw new Error(error.message || '获取思维导图列表失败')
    }

    console.log('API - 获取到的思维导图列表:', mindMaps);
    if (mindMaps && mindMaps.length > 0) {
      mindMaps.forEach((map, index) => {
        console.log(`API - 思维导图 ${index + 1}: ID=${map.id}, 标题=${map.title}, 内容类型=${typeof map.content}, 是否有内容=${!!map.content}`);
        if (map.content) {
          console.log(`API - 思维导图 ${index + 1} 内容预览:`, map.content.root ? map.content.root.data.text.substring(0, 50) + '...' : '无根节点');
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