/**
 * 标签缓存管理器
 * 负责管理用户标签和思维导图标签映射的localStorage缓存
 */
class TagCacheManager {
  // localStorage 键名常量
  static CACHE_KEYS = {
    USER_TAGS: 'user_tags',
    MINDMAP_TAG_IDS: 'mindmap_tag_ids'
  }

  /**
   * 获取用户所有标签
   * @returns {Object} 以标签ID为键的标签对象
   */
  static getUserTags() {
    try {
      return JSON.parse(localStorage.getItem(this.CACHE_KEYS.USER_TAGS)) || {}
    } catch (error) {
      console.warn('获取用户标签缓存失败:', error)
      return {}
    }
  }

  /**
   * 设置用户标签缓存
   * @param {Object} tags - 以标签ID为键的标签对象
   */
  static setUserTags(tags) {
    try {
      localStorage.setItem(this.CACHE_KEYS.USER_TAGS, JSON.stringify(tags))
    } catch (error) {
      console.warn('设置用户标签缓存失败:', error)
    }
  }

  /**
   * 获取思维导图标签映射
   * @returns {Object} 以思维导图ID为键，标签ID数组为值的对象
   */
  static getMindMapTagIds() {
    try {
      return JSON.parse(localStorage.getItem(this.CACHE_KEYS.MINDMAP_TAG_IDS)) || {}
    } catch (error) {
      console.warn('获取思维导图标签映射缓存失败:', error)
      return {}
    }
  }

  /**
   * 设置思维导图标签映射缓存
   * @param {Object} mappings - 以思维导图ID为键，标签ID数组为值的对象
   */
  static setMindMapTagIds(mappings) {
    try {
      localStorage.setItem(this.CACHE_KEYS.MINDMAP_TAG_IDS, JSON.stringify(mappings))
    } catch (error) {
      console.warn('设置思维导图标签映射缓存失败:', error)
    }
  }

  /**
   * 获取指定思维导图的完整标签信息
   * @param {string} mindMapId - 思维导图ID
   * @returns {Array} 完整的标签对象数组
   */
  static getMindMapTags(mindMapId) {
    const userTags = this.getUserTags()
    const mindMapTagIds = this.getMindMapTagIds()
    const tagIds = mindMapTagIds[mindMapId] || []
    
    return tagIds.map(tagId => ({
      id: tagId,
      ...userTags[tagId]
    })).filter(tag => tag && tag.name) // 过滤无效标签
  }

  /**
   * 获取用户所有可用标签（转换为数组格式）
   * @returns {Array} 标签对象数组
   */
  static getUserTagsArray() {
    const userTags = this.getUserTags()
    return Object.keys(userTags).map(tagId => ({
      id: tagId,
      ...userTags[tagId]
    }))
  }

  /**
   * 添加标签到思维导图
   * @param {string} mindMapId - 思维导图ID
   * @param {string} tagId - 标签ID
   */
  static addTagToMindMap(mindMapId, tagId) {
    const mappings = this.getMindMapTagIds()
    if (!mappings[mindMapId]) {
      mappings[mindMapId] = []
    }
    if (!mappings[mindMapId].includes(tagId)) {
      mappings[mindMapId].push(tagId)
      this.setMindMapTagIds(mappings)
    }
  }

  /**
   * 从思维导图移除标签
   * @param {string} mindMapId - 思维导图ID
   * @param {string} tagId - 标签ID
   */
  static removeTagFromMindMap(mindMapId, tagId) {
    const mappings = this.getMindMapTagIds()
    if (mappings[mindMapId]) {
      mappings[mindMapId] = mappings[mindMapId].filter(id => id !== tagId)
      if (mappings[mindMapId].length === 0) {
        delete mappings[mindMapId] // 清理空数组
      }
      this.setMindMapTagIds(mappings)
    }
  }

  /**
   * 添加新标签到缓存
   * @param {Object} tag - 标签对象（包含id）
   */
  static addUserTag(tag) {
    const userTags = this.getUserTags()
    const { id, ...tagData } = tag
    userTags[id] = tagData
    this.setUserTags(userTags)
  }

  /**
   * 更新用户标签
   * @param {string} tagId - 标签ID
   * @param {Object} updates - 更新的字段
   */
  static updateUserTag(tagId, updates) {
    const userTags = this.getUserTags()
    if (userTags[tagId]) {
      userTags[tagId] = { ...userTags[tagId], ...updates }
      this.setUserTags(userTags)
    }
  }

  /**
   * 删除标签（同时清理所有映射）
   * @param {string} tagId - 标签ID
   */
  static deleteTag(tagId) {
    // 删除标签数据
    const userTags = this.getUserTags()
    delete userTags[tagId]
    this.setUserTags(userTags)
    
    // 清理所有思维导图映射
    const mappings = this.getMindMapTagIds()
    Object.keys(mappings).forEach(mindMapId => {
      mappings[mindMapId] = mappings[mindMapId].filter(id => id !== tagId)
      if (mappings[mindMapId].length === 0) {
        delete mappings[mindMapId] // 清理空数组
      }
    })
    this.setMindMapTagIds(mappings)
  }

  /**
   * 清除所有缓存
   */
  static clearAllCache() {
    localStorage.removeItem(this.CACHE_KEYS.USER_TAGS)
    localStorage.removeItem(this.CACHE_KEYS.MINDMAP_TAG_IDS)
  }

  /**
   * 清除用户标签缓存（用于刷新）
   */
  static clearUserTagsCache() {
    localStorage.removeItem(this.CACHE_KEYS.USER_TAGS)
  }

  /**
   * 刷新缓存（强制重新加载）
   */
  static refreshCache() {
    // 这个方法用于强制刷新缓存，实际上在当前实现中
    // 所有方法都是直接从localStorage读取的，所以不需要特殊处理
    // 但是为了API的完整性，我们保留这个方法
  }

  /**
   * 创建新标签
   * @param {Object} tagData - 标签数据
   * @returns {string} 新标签的ID
   */
  static createTag(tagData) {
    const tagId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const userTags = this.getUserTags()
    userTags[tagId] = {
      name: tagData.name || '新标签',
      color: tagData.color || '#409EFF',
      createdAt: new Date().toISOString()
    }
    this.setUserTags(userTags)
    return tagId
  }

  /**
   * 更新标签
   * @param {string} tagId - 标签ID
   * @param {Object} tagData - 更新的标签数据
   */
  static updateTag(tagId, tagData) {
    const userTags = this.getUserTags()
    if (userTags[tagId]) {
      userTags[tagId] = {
        ...userTags[tagId],
        ...tagData,
        updatedAt: new Date().toISOString()
      }
      this.setUserTags(userTags)
    }
  }

  /**
   * 设置思维导图的标签
   * @param {string} mindMapId - 思维导图ID
   * @param {Array} tagIds - 标签ID数组
   */
  static setMindMapTags(mindMapId, tagIds) {
    const mappings = this.getMindMapTagIds()
    mappings[mindMapId] = tagIds
    this.setMindMapTagIds(mappings)
  }

  /**
   * 删除思维导图时清理其所有标签关联
   * @param {string} mindMapId - 思维导图ID
   */
  static removeMindMapFromAllTags(mindMapId) {
    const mappings = this.getMindMapTagIds()
    if (mappings[mindMapId]) {
      delete mappings[mindMapId]
      this.setMindMapTagIds(mappings)
    }
  }

  /**
   * 批量设置思维导图标签（用于初始化）
   * @param {string} mindMapId - 思维导图ID
   * @param {Array} tags - 标签对象数组
   */
  static setMindMapTagsFromArray(mindMapId, tags) {
    // 更新用户标签缓存
    const userTags = this.getUserTags()
    tags.forEach(tag => {
      const { id, ...tagData } = tag
      userTags[id] = tagData
    })
    this.setUserTags(userTags)

    // 更新映射关系
    const mappings = this.getMindMapTagIds()
    mappings[mindMapId] = tags.map(tag => tag.id)
    this.setMindMapTagIds(mappings)
  }
}

export default TagCacheManager