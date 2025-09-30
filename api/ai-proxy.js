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
    const { api, headers, data } = req.body

    console.log('收到AI代理请求:', { 
      api, 
      headers: headers ? Object.keys(headers) : 'undefined',
      hasData: !!data 
    })

    // 验证请求参数
    if (!api || !headers || !data) {
      return res.status(400).json({ 
        error: '缺少必要参数: api, headers, data',
        received: { api: !!api, headers: !!headers, data: !!data }
      })
    }

    // 确保使用HTTPS
    const secureApi = api.replace(/^http:\/\//, 'https://')
    console.log('使用安全API地址:', secureApi)

    const response = await fetch(secureApi, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    console.log('AI API响应:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API错误响应:', errorText)
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