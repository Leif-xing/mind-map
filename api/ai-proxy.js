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

    console.log('AI代理请求:', { api, headers: Object.keys(headers), data })

    const response = await fetch(api, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    console.log('AI API响应状态:', response.status)

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `AI API请求失败: ${response.status} ${response.statusText}` 
      })
    }

    // 检查是否是流式响应
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('text/plain')) {
      // 流式响应
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }
        res.end()
      } catch (streamError) {
        console.error('流式响应处理错误:', streamError)
        res.status(500).json({ error: '流式响应处理失败' })
      }
    } else {
      // 普通JSON响应
      const result = await response.json()
      res.json(result)
    }
  } catch (error) {
    console.error('AI代理错误:', error)
    res.status(500).json({ 
      error: `代理服务器错误: ${error.message}`,
      details: error.stack
    })
  }
}