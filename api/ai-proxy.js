export default async function handler(req, res) {
  // 设置CORS头部
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { api, headers, data, providerType, userId, configId } = req.body

    console.log('收到AI代理请求:', { 
      api, 
      providerType,
      userId: userId ? '[HIDDEN]' : 'undefined',
      configId: configId ? '[HIDDEN]' : 'undefined',
      headers: headers ? Object.keys(headers).map(key => `${key}: ${headers[key] ? (key.toLowerCase().includes('authorization') ? '[HIDDEN]' : '[PRESENT]') : '[MISSING]'}`) : 'undefined',
      hasData: !!data 
    })

    // 验证基本请求参数
    if (!api || !data) {
      return res.status(400).json({ 
        error: '缺少必要参数: api, data',
        received: { api: !!api, headers: !!headers, data: !!data, providerType: !!providerType, userId: !!userId, configId: !!configId }
      })
    }

    // 验证用户认证（通过请求头获取）
    const requestUserId = req.headers['x-user-id'] || userId
    const requestConfigId = req.headers['x-config-id'] || configId

    if (!requestUserId) {
      return res.status(401).json({ 
        error: '未提供用户身份认证',
        details: '请求必须包含有效的用户ID'
      })
    }

    console.log('用户认证信息:', {
      userId: requestUserId,
      configId: requestConfigId,
      hasAuthHeader: !!headers?.Authorization
    })

    // 确保使用HTTPS
    const secureApi = api.replace(/^http:\/\//, 'https://')
    console.log('使用安全API地址:', secureApi)

    // 处理API密钥认证
    let finalHeaders = { ...headers };
    
    // 检查Authorization头是否存在
    if (!finalHeaders['Authorization']) {
      return res.status(401).json({ 
        error: '认证失败：缺少Authorization头',
        details: '请求必须包含有效的API密钥'
      })
    }
    
    // 如果检测到占位符密钥，尝试从环境变量获取真实密钥
    if (finalHeaders['Authorization'].includes('PLACEHOLDER_KEY')) {
      console.log('检测到占位符密钥，尝试从环境变量获取真实密钥...')
      
      // 根据提供商类型获取真实的API密钥
      let realApiKey = null;
      
      if (providerType) {
        // 尝试从环境变量获取特定提供商的API密钥
        const envKey = `AI_API_KEY_${providerType.toUpperCase()}`;
        realApiKey = process.env[envKey];
        
        if (!realApiKey) {
          // 尝试使用通用的密钥环境变量
          realApiKey = process.env[`AI_${providerType.toUpperCase()}_KEY`];
        }
      }
      
      // 如果仍未找到密钥但有configId，尝试使用configId相关的环境变量
      if (!realApiKey && requestConfigId) {
        const envKey = `AI_CONFIG_${requestConfigId.toUpperCase()}_KEY`;
        realApiKey = process.env[envKey];
      }
      
      // 如果找到了真正的API密钥，用它替换占位符
      if (realApiKey) {
        finalHeaders['Authorization'] = `Bearer ${realApiKey}`;
        console.log('成功使用环境变量中的API密钥');
      } else {
        // 检查是否有一个默认的API密钥
        if (process.env.DEFAULT_AI_API_KEY) {
          finalHeaders['Authorization'] = `Bearer ${process.env.DEFAULT_AI_API_KEY}`;
          console.log('使用默认API密钥');
        } else {
          console.error('无法获取有效的API密钥，请求失败');
          return res.status(401).json({ 
            error: '认证失败：无法获取有效的API密钥',
            details: '请检查环境变量配置或联系管理员'
          })
        }
      }
    } else {
      // 如果不是占位符密钥，验证密钥格式
      if (!finalHeaders['Authorization'].startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: '认证失败：无效的Authorization格式',
          details: 'Authorization头必须以"Bearer "开头'
        })
      }
      console.log('使用前端提供的API密钥');
    }

    const response = await fetch(secureApi, {
      method: 'POST',
      headers: {
        ...finalHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    console.log('AI API响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response')
      console.error('AI API错误响应:', response.status, response.statusText, errorText.substring(0, 500))
      return res.status(response.status).json({ 
        error: `AI API请求失败: ${response.status} ${response.statusText}`,
        details: errorText
      })
    }

    // 检查内容类型
    const contentType = response.headers.get('content-type') || ''
    console.log('响应内容类型:', contentType)

    if (contentType.includes('text/plain') || contentType.includes('text/event-stream')) {
      // 流式响应
      console.log('处理流式响应...')
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('流式响应完成')
            break
          }
          
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }
        res.end()
      } catch (streamError) {
        console.error('流式响应处理错误:', streamError)
        if (!res.headersSent) {
          res.status(500).json({ error: '流式响应处理失败: ' + streamError.message })
        }
      }
    } else {
      // 普通JSON响应
      console.log('处理JSON响应...')
      const result = await response.json()
      res.json(result)
    }
  } catch (error) {
    console.error('AI代理服务器错误:', error)
    if (!res.headersSent) {
      res.status(500).json({ 
        error: `代理服务器错误: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}