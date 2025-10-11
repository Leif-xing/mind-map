const express = require('express')
const axios = require('axios')
const net = require('net')
const { createClient } = require('@supabase/supabase-js')

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '.env') })
// Supabase 配置 - 需要根据实际环境变量配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// API密钥解密函数
function decryptApiKey(encryptedKey) {
  try {
    // 如果是Base64编码，先尝试解码
    if (encryptedKey && typeof encryptedKey === 'string') {
      // 检查是否是Base64格式
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (base64Regex.test(encryptedKey)) {
        const decoded = Buffer.from(encryptedKey, 'base64').toString('utf-8')
        return decoded
      }
    }
    
    // 如果不是Base64，直接返回（假设是明文存储）
    return encryptedKey
  } catch (error) {
    console.error('密钥解密过程出错:', error)
    // 如果解密失败，返回原始值
    return encryptedKey
  }
}

const port = 3456

const isPortUsed = port => {
  return new Promise(resolve => {
    const server = net.createServer()
    server.once('error', err => {
      if (err.code === 'EADDRINUSE') {
        resolve(true) // 端口被占用
      } else {
        resolve(false) // 其他错误
      }
    })
    server.once('listening', () => {
      server.close(() => resolve(false)) // 端口可用
    })
    server.listen(port) // 尝试监听端口
  })
}

const createServe = () => {
  // 起个服务
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // 允许跨域
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*') // 允许所有来源的跨域请求，或者指定一个域名
    res.header('Access-Control-Allow-Methods', '*') // 允许的方法
    res.header('Access-Control-Allow-Headers', '*') // 允许的头部信息
    next()
  })

  // 监听对话请求
  app.get('/ai/test', (req, res) => {
    res
      .json({
        code: 0,
        data: null,
        msg: '连接成功'
      })
      .end()
  })
  app.post('/ai/chat', async (req, res, next) => {
    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const { api, method = 'POST', headers = {}, data } = req.body

    try {
      const response = await axios({
        url: api,
        method,
        headers,
        data,
        responseType: 'stream'
      })
      response.data.pipe(res)
    } catch (error) {
      next(error)
    }
  })

  // 基于数据库配置的AI代理端点
  app.post('/api/ai-proxy', async (req, res) => {
    try {
      // 从请求中获取用户ID和AI请求数据
      const { userId, aiPayload } = req.body
      const requestUserId = req.headers['x-user-id'] || userId

      // 验证用户身份
      if (!requestUserId) {
        return res.status(401).json({ 
          error: '未提供用户身份认证',
          details: '请求必须包含有效的用户ID'
        })
      }

      // 从数据库获取用户信息和权限
      let user, userError
      try {
        const result = await supabase
          .from('users')
          .select('id, mind_map_permission, current_ai_config_id, is_admin')
          .eq('id', requestUserId)
          .single()
        
        user = result.data
        userError = result.error
        
        if (userError || !user) {
          console.error('用户验证失败:', userError)
          return res.status(401).json({ 
            error: '用户验证失败',
            details: userError?.message || '用户不存在'
          })
        }
      } catch (supabaseError) {
        console.error('Supabase连接错误:', supabaseError.message)
        return res.status(500).json({ 
          error: 'Supabase连接失败',
          details: supabaseError.message
        })
      }

      // 检查AI使用权限
      if (!user.is_admin && user.mind_map_permission !== 1) {
        return res.status(403).json({ 
          error: '无AI使用权限',
          details: '当前用户没有AI功能使用权限'
        })
      }

      if (!user.current_ai_config_id) {
        return res.status(400).json({ 
          error: '未选择AI配置',
          details: '请先选择AI服务配置'
        })
      }

      // 从数据库获取AI配置
      const { data: config, error: configError } = await supabase
        .from('ai_provider_configs')
        .select('api_endpoint, api_key_encrypted, model_name, provider_name')
        .eq('id', user.current_ai_config_id)
        .eq('is_active', true)
        .single()
      
      if (configError || !config) {
        console.error('AI配置获取失败:', configError)
        return res.status(400).json({ 
          error: 'AI配置无效或不可用',
          details: configError?.message || 'AI配置不存在或已禁用'
        })
      }

      // 解密API密钥
      let apiKey
      try {
        apiKey = decryptApiKey(config.api_key_encrypted)
      } catch (error) {
        console.error('API密钥解密失败:', error)
        return res.status(500).json({ 
          error: 'API密钥解密失败',
          details: '服务器配置错误'
        })
      }

      // 构建AI服务请求
      const aiRequestData = {
        model: config.model_name,
        ...aiPayload,
        stream: false // 暂时禁用流式输出
      }

      const requestHeaders = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }

      // 调用AI服务
      const response = await axios({
        url: config.api_endpoint,
        method: 'POST',
        headers: requestHeaders,
        data: aiRequestData,
        timeout: 120000 // 2分钟超时
      })

      // 返回AI服务的响应
      res.json(response.data)

    } catch (error) {
      console.error('AI代理请求失败:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      })

      if (error.response) {
        // AI服务返回的错误
        const statusCode = error.response.status
        const errorData = error.response.data
        
        res.status(statusCode).json({
          error: `AI服务错误 (${statusCode})`,
          details: errorData,
          aiServiceError: true
        })
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: '无法连接到AI服务',
          details: '请检查AI服务配置和网络连接'
        })
      } else if (error.code === 'ETIMEDOUT') {
        res.status(504).json({
          error: 'AI服务请求超时',
          details: '请稍后重试'
        })
      } else {
        res.status(500).json({
          error: '代理服务器内部错误',
          details: error.message
        })
      }
    }
  })

  app.listen(port, () => {
    console.log(`app listening on port ${port}`)
  })
}

isPortUsed(port).then(isUsed => {
  if (isUsed) {
    console.error('端口被占用')
  } else {
    createServe()
  }
})
