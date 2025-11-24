/**
 * 思维导图缓存管理器
 * 统一管理思维导图内容缓存，避免localStorage中存在过多键值对
 */

const CACHE_KEY = 'mindmap_cache'

// 默认缓存配置
const DEFAULT_CACHE_CONFIG = {
  maxSize: 50, // 最大缓存数量
  cleanupThreshold: 60 // 清理阈值（分钟）
}

class MindMapCacheManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.cache = this.loadCache()
    this.cleanupTimer = null
  }

  // 从localStorage加载缓存数据
  loadCache() {
    try {
      const cacheData = localStorage.getItem(CACHE_KEY)
      if (cacheData) {
        return JSON.parse(cacheData)
      }
    } catch (error) {
      console.warn('加载思维导图缓存失败:', error.message)
    }
    return {}
  }

  // 保存缓存到localStorage
  saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache))
    } catch (error) {
      console.error('保存思维导图缓存失败:', error.message)
    }
  }

  // 获取指定思维导图的缓存数据
  get(mindMapId) {
    if (!mindMapId) {
      return null
    }
    return this.cache[mindMapId] || null
  }

  // 设置指定思维导图的缓存数据
  set(mindMapId, data) {
    if (!mindMapId || data === undefined || data === null) {
      return false
    }

    try {
      // 检查缓存大小，如果超过限制则清理旧数据
      if (Object.keys(this.cache).length >= this.config.maxSize) {
        this.cleanupOldest()
      }

      // 设置数据和时间戳
      this.cache[mindMapId] = data
      this.saveCache()
      return true
    } catch (error) {
      console.error('设置思维导图缓存失败:', error.message)
      return false
    }
  }

  // 删除指定思维导图的缓存数据
  delete(mindMapId) {
    if (!mindMapId) {
      return false
    }

    if (this.cache[mindMapId]) {
      delete this.cache[mindMapId]
      this.saveCache()
      return true
    }
    return false
  }

  // 批量删除思维导图缓存
  deleteMultiple(mindMapIds) {
    let deletedCount = 0
    for (const id of mindMapIds) {
      if (this.delete(id)) {
        deletedCount++
      }
    }
    return deletedCount
  }

  // 清空所有缓存
  clear() {
    this.cache = {}
    localStorage.removeItem(CACHE_KEY)
  }

  // 检查缓存是否存在
  has(mindMapId) {
    return mindMapId && this.cache[mindMapId] !== undefined
  }

  // 获取所有缓存的思维导图ID列表
  getAllIds() {
    return Object.keys(this.cache)
  }

  // 获取缓存大小
  size() {
    return Object.keys(this.cache).length
  }

  // 清理最旧的缓存项
  cleanupOldest() {
    const keys = Object.keys(this.cache)
    if (keys.length === 0) return

    // 简单地删除最早的一半（如果超过最大限制）
    const deleteCount = Math.min(
      Math.floor(keys.length / 2),
      keys.length - Math.floor(this.config.maxSize * 0.7) // 保留最多70%的容量
    )

    for (let i = 0; i < deleteCount; i++) {
      const idToDelete = keys[i]
      delete this.cache[idToDelete]
    }
  }

  // 迁移旧的缓存格式（mindmap_cache_${id} 到 mindmap_cache）
  migrateOldCache() {
    try {
      // 获取所有旧格式的缓存键
      const oldCacheKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('mindmap_cache_')) {
          oldCacheKeys.push(key)
        }
      }

      // 迁移旧缓存到新格式
      let migratedCount = 0
      for (const oldKey of oldCacheKeys) {
        const mindMapId = oldKey.replace('mindmap_cache_', '')
        const data = localStorage.getItem(oldKey)

        if (data) {
          try {
            const parsedData = JSON.parse(data)
            this.set(mindMapId, parsedData)
            migratedCount++
          } catch (parseError) {
            console.warn(`解析旧缓存数据失败 ${oldKey}:`, parseError.message)
          }
        }

        // 删除旧格式的缓存
        localStorage.removeItem(oldKey)
      }

      if (migratedCount > 0) {
        console.log(`迁移了 ${migratedCount} 个思维导图缓存到新格式`)
      }

      return migratedCount
    } catch (error) {
      console.error('迁移旧缓存失败:', error.message)
      return 0
    }
  }

  // 初始化缓存管理器，包括迁移旧缓存
  init() {
    this.migrateOldCache()
  }
}

// 创建全局单例
const mindMapCacheManager = new MindMapCacheManager()

// 导出单例和类定义
export { mindMapCacheManager, MindMapCacheManager }

// 提供便捷的全局访问方法
export const getMindMapCache = mindMapId => mindMapCacheManager.get(mindMapId)
export const setMindMapCache = (mindMapId, data) =>
  mindMapCacheManager.set(mindMapId, data)
export const removeMindMapCache = mindMapId =>
  mindMapCacheManager.delete(mindMapId)
export const hasMindMapCache = mindMapId => mindMapCacheManager.has(mindMapId)
