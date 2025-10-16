class Ai {
  constructor(options = {}) {
    this.options = options

    this.baseData = {}
    this.controller = null
    this.currentChunk = ''
    this.content = ''
  }

  init(providerType = 'huoshan', options = {}) {
    console.log('初始化AI提供商:', providerType, options)
    // 记录提供商类型供路由使用
    this.providerType = providerType
    
    // 检查是否是预定义类型，否则使用通用AI提供商接口
    if (providerType === 'huoshan') {
      // 火山方舟接口
      this.baseData = {
        api: options.api || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        method: options.method || 'POST',
        headers: {
          Authorization: 'Bearer ' + (options.key || options.apiKey || 'PLACEHOLDER_KEY')
        },
        data: {
          model: options.model,
          stream: true
        }
      }
    } else if (providerType === 'navy') {
      // Navy API接口
      this.baseData = {
        api: options.api || 'https://api.navy/v1/chat/completions',
        method: options.method || 'POST',
        headers: {
          'Authorization': 'Bearer ' + (options.key || options.apiKey || 'PLACEHOLDER_KEY'),
          'Content-Type': 'application/json'
        },
        data: {
          model: options.model,
          stream: true
        }
      }
    } else {
      // 通用AI提供商接口 - 适用于从数据库获取的配置
      // 在安全的系统中，前端可能没有实际的API密钥
      // 因此使用占位符密钥，实际密钥将在代理服务中处理
      this.baseData = {
        api: options.api || options.apiEndpoint || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        method: options.method || 'POST',
        headers: {
          'Authorization': 'Bearer ' + (options.key || options.apiKey || 'PLACEHOLDER_KEY'),
          'Content-Type': 'application/json'
        },
        data: {
          model: options.model || options.modelName,
          stream: true
        }
      }
    }
    
    console.log('AI初始化完成:', this.baseData)
  }

  async request(data, progress = () => {}, end = () => {}, err = () => {}) {
    // 添加超时机制
    const timeout = setTimeout(() => {
      if (this.controller) {
        this.controller.abort()
        err(new Error('请求超时'))
      }
    }, 60000) // 60秒超时

    try {
      const res = await this.postMsg(data)
      const decoder = new TextDecoder()
      while (1) {
        const { done, value } = await res.read()
        if (done) {
          clearTimeout(timeout)
          end(this.content)
          return
        }
        // 拿到当前切片的数据
        const text = decoder.decode(value)
        // 处理切片数据
        let chunk = this.handleChunkData(text)
        // 判断是否有不完整切片，如果有，合并下一次处理，没有则获取数据
        if (this.currentChunk) continue
        let isEnd = false
        let list = []
        try {
          list = chunk
            .split('\n')
            .filter(item => {
              isEnd = item.includes('[DONE]')
              return !!item && !isEnd
            })
            .map(item => {
              return JSON.parse(item.replace(/^data:/, ''))
            })
        } catch (e) {
          // console.error('解析AI响应数据出错:', e, chunk)
          // 如果解析出错，继续处理其他数据
        }
        list.forEach(item => {
          try {
            if (item.choices) {
              this.content += item.choices
                .map(item2 => {
                  return item2.delta && item2.delta.content ? item2.delta.content : ''
                })
                .join('')
            }
          } catch (e) {
            // console.error('处理AI响应数据出错:', e, item)
          }
        })
        progress(this.content)
        if (isEnd) {
          clearTimeout(timeout)
          end(this.content)
          return
        }
      }
    } catch (error) {
      clearTimeout(timeout)
      console.log(error)
      // 手动停止请求不需要触发错误回调
      if (!(error && error.name === 'AbortError')) {
        err(error)
      }
    }
  }

  async postMsg(data) {
    this.controller = new AbortController()
    
    // 检测是否为部署环境
    const isDeployed = window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1'
    
    console.log('AI请求环境检测:', {
      hostname: window.location.hostname,
      isDeployed: isDeployed,
      baseData: this.baseData
    })
    
    let res
    if (isDeployed) {
      // 部署环境：尝试直接调用AI API，如果失败则使用代理
      console.log('部署环境 - 尝试直接调用AI API...')
      
      // 确保使用HTTPS避免Mixed Content错误
      const secureApi = this.baseData.api.replace(/^http:\/\//, 'https://')
      console.log('使用安全API地址:', secureApi)
      
      try {
        res = await fetch(secureApi, {
          signal: this.controller.signal,
          method: this.baseData.method || 'POST',
          headers: {
            ...this.baseData.headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...this.baseData.data,
            ...data
          })
        })
        console.log('直接AI API响应状态:', res.status)
        
        if (!res.ok) {
          throw new Error(`直接API调用失败: ${res.status}`)
        }
      } catch (directError) {
        console.warn('直接API调用失败，尝试使用代理:', directError.message)
        
        // 使用Vercel代理
        try {
          res = await fetch('/api/ai-proxy', {
            signal: this.controller.signal,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              api: secureApi, // 使用HTTPS版本的API
              headers: this.baseData.headers,
              data: {
                ...this.baseData.data,
                ...data
              }
            })
          })
          console.log('代理API响应状态:', res.status)
          
          if (!res.ok) {
            const errorText = await res.text()
            // console.error('代理API错误详情:', errorText)
            throw new Error(`代理API失败: ${res.status} - ${errorText}`)
          }
        } catch (proxyError) {
          console.error('代理API也失败:', proxyError)
          throw new Error(`AI请求失败: ${directError.message} | 代理失败: ${proxyError.message}`)
        }
      }
    } else {
      // 本地环境：优先使用本地代理；若未提供端口，则直接调用远端API（若目标域名支持CORS则可用）
      const hasPort = !!this.options.port
      if (hasPort) {
        console.log('本地环境 - 使用代理服务:', {
          port: this.options.port,
          url: `http://localhost:${this.options.port}/ai/chat`
        })
        try {
          res = await fetch(`http://localhost:${this.options.port}/ai/chat`, {
            signal: this.controller.signal,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...this.baseData,
              data: {
                ...this.baseData.data,
                ...data
              }
            })
          })
          console.log('代理服务响应状态:', res.status)
        } catch (error) {
          // console.error('代理服务请求失败:', error)
          throw error
        }
      } else {
        // 无端口：直接调用远端API
        console.log('本地环境 - 未配置本地端口，直接调用远端API')
        const secureApi = this.baseData.api.replace(/^http:\/\//, 'https://')
        try {
          res = await fetch(secureApi, {
            signal: this.controller.signal,
            method: this.baseData.method || 'POST',
            headers: {
              ...this.baseData.headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...this.baseData.data,
              ...data
            })
          })
          console.log('本地直连AI API响应状态:', res.status)
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(`本地直连失败: ${res.status} ${text}`)
          }
        } catch (localDirectError) {
          // console.error('本地直连远端API失败:', localDirectError)
          throw localDirectError
        }
      }
    }
    
    if (res.status && res.status !== 200) {
      // console.error('请求失败，状态码:', res.status)
      throw new Error(`请求失败，状态码: ${res.status}`)
    }
    
    console.log('开始读取流式响应...')
    return res.body.getReader()
  }

  handleChunkData(chunk) {
    chunk = chunk.trim()
    // 如果存在上一个切片
    if (this.currentChunk) {
      chunk = this.currentChunk + chunk
      this.currentChunk = ''
    }
    // 如果存在done,认为是完整切片且是最后一个切片
    if (chunk.includes('[DONE]')) {
      return chunk
    }
    // 最后一个字符串不为}，则默认切片不完整，保存与下次拼接使用（这种方法不严谨，但已经能解决大部分场景的问题）
    if (chunk[chunk.length - 1] !== '}') {
      this.currentChunk = chunk
    }
    return chunk
  }

  stop() {
    this.controller.abort()
    this.controller = new AbortController()
  }
}

export default Ai
