// 思维导图压缩/解压缩工具
import LZString from 'lz-string'

/**
 * 压缩思维导图JSON数据
 * @param {Object} mindMapData - 思维导图数据对象
 * @returns {string} 压缩后的字符串
 */
export function compressMindMap(mindMapData) {
  try {
    // 将思维导图数据转换为JSON字符串
    const jsonString = JSON.stringify(mindMapData)
    
    // 使用LZString进行压缩
    const compressed = LZString.compressToUTF16(jsonString)
    
    // 返回压缩后的字符串
    return compressed
  } catch (error) {
    console.error('压缩思维导图失败:', error)
    throw new Error('压缩思维导图失败: ' + error.message)
  }
}

/**
 * 解压缩思维导图JSON数据
 * @param {string} compressedData - 压缩的字符串
 * @returns {Object} 解压后的思维导图数据对象
 */
export function decompressMindMap(compressedData) {
  try {
    if (!compressedData) {
      throw new Error('压缩数据不能为空')
    }
    
    // 使用LZString解压缩
    const decompressed = LZString.decompressFromUTF16(compressedData)
    
    if (!decompressed) {
      throw new Error('解压缩失败 - 无效的压缩数据')
    }
    
    // 将解压后的JSON字符串转换回对象
    const mindMapData = JSON.parse(decompressed)
    
    return mindMapData
  } catch (error) {
    console.error('解压缩思维导图失败:', error)
    throw new Error('解压缩思维导图失败: ' + error.message)
  }
}

/**
 * 计算压缩率
 * @param {Object} originalData - 原始数据
 * @returns {Object} 包含原始大小、压缩大小和压缩率的对象
 */
export function calculateCompressionRatio(originalData) {
  const originalString = JSON.stringify(originalData)
  const originalSize = new Blob([originalString]).size // 字节
  
  const compressed = LZString.compressToUTF16(originalString)
  const compressedSize = new Blob([compressed]).size // 字节
  
  const ratio = originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0
  
  return {
    originalSize,
    compressedSize,
    compressionRatio: ratio.toFixed(2),
    isCompressed: true
  }
}