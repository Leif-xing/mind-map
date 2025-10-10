import { mapActions } from 'vuex'

class SecureAi {
  constructor(options = {}) {
    this.options = options
    this.controller = null
    this.currentChunk = ''
    this.content = ''
  }

  // 初始化方法，现在只接收用户ID和上下文信息
  init(userId, storeContext = null) {
    this.userId = userId
    this.storeContext = storeContext
    console.log('安全AI初始化完成:', { userId })
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
      // 通过store调用安全的AI服务
      if (!this.storeContext) {
        throw new Error('缺少store上下文')
      }

      const response = await this.storeContext.$store.dispatch('callAiThroughProxy', {
        userId: this.userId,
        aiPayload: data
      })

      // 处理响应
      clearTimeout(timeout)
      end(response.content || response.choices?.[0]?.message?.content || JSON.stringify(response))
    } catch (error) {
      clearTimeout(timeout)
      console.error('安全AI请求失败:', error)
      // 手动停止请求不需要触发错误回调
      if (!(error && error.name === 'AbortError')) {
        err(error)
      }
    }
  }

  async postMsg(data) {
    // 由于使用store代理，这个方法现在使用store的API
    throw new Error('安全AI类不直接使用postMsg，请使用request方法')
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
    // 由于使用store代理，直接调用存储的取消方法
    // 暂时留空，实际实现取决于具体需求
  }
}

export default SecureAi