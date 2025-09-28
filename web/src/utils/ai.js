class Ai {
  constructor(options = {}) {
    this.options = options

    this.baseData = {}
    this.controller = null
    this.currentChunk = ''
    this.content = ''
  }

  init(type = 'huoshan', options = {}) {
    // 火山引擎接口
    if (type === 'huoshan') {
      this.baseData = {
        api: options.api,
        method: options.method,
        headers: {
          Authorization: 'Bearer ' + options.key
        },
        data: {
          model: options.model,
          stream: true
        }
      }
    }
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
          console.error('解析AI响应数据出错:', e, chunk)
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
            console.error('处理AI响应数据出错:', e, item)
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
    const res = await fetch(`http://localhost:${this.options.port}/ai/chat`, {
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
    if (res.status && res.status !== 200) {
      throw new Error('请求失败')
    }
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
