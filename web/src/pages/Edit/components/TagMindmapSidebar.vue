<template>
  <Sidebar ref="sidebar" :title="'导图管理'" :width="420">
    <div class="tagMindmapContainer" :class="{ isDark: isDark }">
      <!-- 顶部统计卡片 -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="iconfont iconwenjian"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ totalMindMaps }}</div>
              <div class="stat-label">总导图</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <i class="iconfont iconbiaoqian"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ totalTags }}</div>
              <div class="stat-label">标签</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <i class="iconfont iconxin"></i>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ favoritesCount }}</div>
              <div class="stat-label">收藏</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 搜索和筛选区域 -->
      <div class="search-section">
        <div class="search-bar">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索思维导图..."
            prefix-icon="el-icon-search"
            clearable
            @input="handleSearch"
          ></el-input>
        </div>
        
        <!-- 多标签筛选器 -->
        <div class="tag-filter" v-if="Object.keys(userTags).length > 0">
          <div class="filter-header">
            <span class="filter-title">标签筛选</span>
            <el-button 
              type="text" 
              size="mini" 
              @click="clearTagFilter"
              v-if="selectedTagIds.length > 0"
            >
              清除
            </el-button>
          </div>
          <div class="tag-list">
            <el-tag
              v-for="(tag, tagId) in userTags"
              :key="tagId"
              :type="selectedTagIds.includes(tagId) ? 'primary' : 'info'"
              :effect="selectedTagIds.includes(tagId) ? 'dark' : 'plain'"
              size="small"
              @click="toggleTagFilter(tagId)"
              class="filter-tag"
            >
              {{ tag.name }}
              <span class="tag-count">({{ getTagMindMapCount(tagId) }})</span>
            </el-tag>
          </div>
          <div class="filter-mode" v-if="selectedTagIds.length > 1">
            <el-radio-group v-model="filterMode" size="mini">
              <el-radio-button label="AND">全部包含</el-radio-button>
              <el-radio-button label="OR">包含任一</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="content-section">
        <!-- 收藏夹 -->
        <div class="section-block" v-if="favoriteMindMaps.length > 0">
          <div class="section-header" @click="toggleSection('favorites')">
            <i class="iconfont iconxin section-icon"></i>
            <span class="section-title">收藏夹</span>
            <span class="section-count">({{ favoriteMindMaps.length }})</span>
            <i class="el-icon-arrow-right section-arrow" :class="{ 'expanded': expandedSections.favorites }"></i>
          </div>
          <div class="section-content" v-show="expandedSections.favorites">
            <div 
              v-for="mindMap in favoriteMindMaps" 
              :key="'fav-' + mindMap.id"
              class="mindmap-item"
              @click="loadMindMap(mindMap)"
            >
              <div class="mindmap-info">
                <div class="mindmap-title">{{ mindMap.title }}</div>
                <div class="mindmap-meta">
                  <span class="mindmap-date">{{ formatDate(mindMap.updated_at) }}</span>
                  <div class="mindmap-tags">
                    <el-tag
                      v-for="tagId in getMindMapTags(mindMap.id)"
                      :key="tagId"
                      size="mini"
                      :style="{ backgroundColor: userTags[tagId]?.color || '#409EFF' }"
                    >
                      {{ userTags[tagId]?.name }}
                    </el-tag>
                  </div>
                </div>
              </div>
              <div class="mindmap-actions">
                <el-button
                  type="text"
                  icon="el-icon-star-off"
                  @click.stop="toggleFavorite(mindMap.id)"
                  class="action-btn favorite-btn"
                ></el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近编辑 -->
        <div class="section-block">
          <div class="section-header" @click="toggleSection('recent')">
            <i class="iconfont iconshijian section-icon"></i>
            <span class="section-title">最近编辑</span>
            <span class="section-count">({{ recentMindMaps.length }})</span>
            <i class="el-icon-arrow-right section-arrow" :class="{ 'expanded': expandedSections.recent }"></i>
          </div>
          <div class="section-content" v-show="expandedSections.recent">
            <div 
              v-for="mindMap in recentMindMaps" 
              :key="'recent-' + mindMap.id"
              class="mindmap-item"
              @click="loadMindMap(mindMap)"
            >
              <div class="mindmap-info">
                <div class="mindmap-title">{{ mindMap.title }}</div>
                <div class="mindmap-meta">
                  <span class="mindmap-date">{{ formatDate(mindMap.updated_at) }}</span>
                  <div class="mindmap-tags">
                    <el-tag
                      v-for="tagId in getMindMapTags(mindMap.id)"
                      :key="tagId"
                      size="mini"
                      :style="{ backgroundColor: userTags[tagId]?.color || '#409EFF' }"
                    >
                      {{ userTags[tagId]?.name }}
                    </el-tag>
                  </div>
                </div>
              </div>
              <div class="mindmap-actions">
                <el-button
                  type="text"
                  :icon="isFavorite(mindMap.id) ? 'el-icon-star-on' : 'el-icon-star-off'"
                  @click.stop="toggleFavorite(mindMap.id)"
                  class="action-btn"
                  :class="{ 'favorite-active': isFavorite(mindMap.id) }"
                ></el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 标签分组 -->
        <div 
          v-for="(tagGroup, tagId) in tagTree" 
          :key="'tag-' + tagId"
          class="section-block"
        >
          <div class="section-header" @click="toggleSection('tag-' + tagId)">
            <div class="tag-icon" :style="{ backgroundColor: tagGroup.tag.color || '#409EFF' }"></div>
            <span class="section-title">{{ tagGroup.tag.name }}</span>
            <span class="section-count">({{ tagGroup.mindMaps.length }})</span>
            <i class="el-icon-arrow-right section-arrow" :class="{ 'expanded': expandedSections['tag-' + tagId] }"></i>
          </div>
          <div class="section-content" v-show="expandedSections['tag-' + tagId]">
            <div 
              v-for="mindMap in tagGroup.mindMaps" 
              :key="'tag-' + tagId + '-' + mindMap.id"
              class="mindmap-item"
              @click="loadMindMap(mindMap)"
            >
              <div class="mindmap-info">
                <div class="mindmap-title">{{ mindMap.title }}</div>
                <div class="mindmap-meta">
                  <span class="mindmap-date">{{ formatDate(mindMap.updated_at) }}</span>
                  <div class="mindmap-tags">
                    <el-tag
                      v-for="otherTagId in getMindMapTags(mindMap.id).filter(id => id !== tagId)"
                      :key="otherTagId"
                      size="mini"
                      :style="{ backgroundColor: userTags[otherTagId]?.color || '#409EFF' }"
                    >
                      {{ userTags[otherTagId]?.name }}
                    </el-tag>
                  </div>
                </div>
              </div>
              <div class="mindmap-actions">
                <el-button
                  type="text"
                  :icon="isFavorite(mindMap.id) ? 'el-icon-star-on' : 'el-icon-star-off'"
                  @click.stop="toggleFavorite(mindMap.id)"
                  class="action-btn"
                  :class="{ 'favorite-active': isFavorite(mindMap.id) }"
                ></el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 未分类 -->
        <div class="section-block" v-if="untaggedMindMaps.length > 0">
          <div class="section-header" @click="toggleSection('untagged')">
            <i class="iconfont iconwenhao section-icon"></i>
            <span class="section-title">未分类</span>
            <span class="section-count">({{ untaggedMindMaps.length }})</span>
            <i class="el-icon-arrow-right section-arrow" :class="{ 'expanded': expandedSections.untagged }"></i>
          </div>
          <div class="section-content" v-show="expandedSections.untagged">
            <div 
              v-for="mindMap in untaggedMindMaps" 
              :key="'untagged-' + mindMap.id"
              class="mindmap-item"
              @click="loadMindMap(mindMap)"
            >
              <div class="mindmap-info">
                <div class="mindmap-title">{{ mindMap.title }}</div>
                <div class="mindmap-meta">
                  <span class="mindmap-date">{{ formatDate(mindMap.updated_at) }}</span>
                </div>
              </div>
              <div class="mindmap-actions">
                <el-button
                  type="text"
                  :icon="isFavorite(mindMap.id) ? 'el-icon-star-on' : 'el-icon-star-off'"
                  @click.stop="toggleFavorite(mindMap.id)"
                  class="action-btn"
                  :class="{ 'favorite-active': isFavorite(mindMap.id) }"
                ></el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div class="empty-state" v-if="filteredMindMaps.length === 0">
          <div class="empty-icon">
            <i class="iconfont iconwenjian"></i>
          </div>
          <div class="empty-text">暂无思维导图</div>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<script>
import Sidebar from './Sidebar.vue'
import TagCacheManager from '@/utils/tagCacheManager'
import { mapState } from 'vuex'

export default {
  name: 'TagMindmapSidebar',
  components: {
    Sidebar
  },
  data() {
    return {
      searchKeyword: '',
      selectedTagIds: [],
      filterMode: 'AND',
      expandedSections: {
        favorites: true,
        recent: true,
        untagged: true
      },
      favorites: new Set(), // 收藏的思维导图ID集合
      refreshTimer: null
    }
  },
  computed: {
    ...mapState(['localMindMaps', 'currentUser']),
    
    isDark() {
      return this.$store.state.localConfig.isDark
    },
    
    activeSidebar() {
      return this.$store.state.activeSidebar
    },
    
    // 获取用户标签
    userTags() {
      return TagCacheManager.getUserTags()
    },
    
    // 获取思维导图标签映射
    mindMapTagMapping() {
      return TagCacheManager.getMindMapTagIds()
    },
    
    // 统计信息
    totalMindMaps() {
      return this.localMindMaps.length
    },
    
    totalTags() {
      return Object.keys(this.userTags).length
    },
    
    favoritesCount() {
      return this.favorites.size
    },
    
    // 构建标签树
    tagTree() {
      const tree = {}
      
      this.filteredMindMaps.forEach(mindMap => {
        const tagIds = this.mindMapTagMapping[mindMap.id] || []
        
        tagIds.forEach(tagId => {
          const tag = this.userTags[tagId]
          if (tag) {
            if (!tree[tagId]) {
              tree[tagId] = {
                tag: tag,
                mindMaps: []
              }
            }
            
            // 避免重复添加
            if (!tree[tagId].mindMaps.find(m => m.id === mindMap.id)) {
              tree[tagId].mindMaps.push(mindMap)
            }
          }
        })
      })
      
      return tree
    },
    
    // 未分类的思维导图
    untaggedMindMaps() {
      return this.filteredMindMaps.filter(mindMap => {
        const tagIds = this.mindMapTagMapping[mindMap.id] || []
        return tagIds.length === 0
      })
    },
    
    // 收藏的思维导图
    favoriteMindMaps() {
      return this.filteredMindMaps.filter(mindMap => this.favorites.has(mindMap.id))
    },
    
    // 最近编辑的思维导图（最近10个）
    recentMindMaps() {
      return [...this.filteredMindMaps]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 10)
    },
    
    // 筛选后的思维导图
    filteredMindMaps() {
      let filtered = [...this.localMindMaps]
      
      // 搜索关键词筛选
      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.trim().toLowerCase()
        filtered = filtered.filter(mindMap => 
          mindMap.title.toLowerCase().includes(keyword)
        )
      }
      
      // 标签筛选
      if (this.selectedTagIds.length > 0) {
        filtered = filtered.filter(mindMap => {
          const mindMapTags = this.mindMapTagMapping[mindMap.id] || []
          
          if (this.filterMode === 'AND') {
            return this.selectedTagIds.every(tagId => mindMapTags.includes(tagId))
          } else {
            return this.selectedTagIds.some(tagId => mindMapTags.includes(tagId))
          }
        })
      }
      
      return filtered
    }
  },
  watch: {
    activeSidebar(val) {
      if (val === 'tagMindmap') {
        this.$refs.sidebar && (this.$refs.sidebar.show = true)
        this.show()
      } else {
        this.$refs.sidebar && (this.$refs.sidebar.show = false)
      }
    }
  },
  created() {
    // 从localStorage加载收藏数据
    this.loadFavorites()
    
    // 定时刷新数据
    this.startRefreshTimer()
  },
  beforeDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
  },
  methods: {
    show() {
      this.$refs.sidebar && this.$refs.sidebar.show()
      
      // 展开默认分组
      this.$nextTick(() => {
        Object.keys(this.tagTree).forEach(tagId => {
          this.$set(this.expandedSections, 'tag-' + tagId, true)
        })
      })
    },
    
    // 搜索处理
    handleSearch() {
      // 搜索时自动展开所有分组
      if (this.searchKeyword.trim()) {
        Object.keys(this.expandedSections).forEach(key => {
          this.$set(this.expandedSections, key, true)
        })
        Object.keys(this.tagTree).forEach(tagId => {
          this.$set(this.expandedSections, 'tag-' + tagId, true)
        })
      }
    },
    
    // 切换标签筛选
    toggleTagFilter(tagId) {
      const index = this.selectedTagIds.indexOf(tagId)
      if (index > -1) {
        this.selectedTagIds.splice(index, 1)
      } else {
        this.selectedTagIds.push(tagId)
      }
    },
    
    // 清除标签筛选
    clearTagFilter() {
      this.selectedTagIds = []
    },
    
    // 切换分组展开/收起
    toggleSection(sectionKey) {
      this.$set(this.expandedSections, sectionKey, !this.expandedSections[sectionKey])
    },
    
    // 获取思维导图的标签
    getMindMapTags(mindMapId) {
      return this.mindMapTagMapping[mindMapId] || []
    },
    
    // 获取标签下的思维导图数量
    getTagMindMapCount(tagId) {
      return this.localMindMaps.filter(mindMap => {
        const tags = this.getMindMapTags(mindMap.id)
        return tags.includes(tagId)
      }).length
    },
    
    // 格式化日期
    formatDate(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) { // 1分钟内
        return '刚刚'
      } else if (diff < 3600000) { // 1小时内
        return Math.floor(diff / 60000) + '分钟前'
      } else if (diff < 86400000) { // 1天内
        return Math.floor(diff / 3600000) + '小时前'
      } else if (diff < 604800000) { // 1周内
        return Math.floor(diff / 86400000) + '天前'
      } else {
        return date.toLocaleDateString()
      }
    },
    
    // 加载思维导图
    loadMindMap(mindMap) {
      this.$bus.$emit('loadMindMap', mindMap.id)
      // 关闭侧边栏
      this.$refs.sidebar && this.$refs.sidebar.hide()
    },
    
    // 切换收藏状态
    toggleFavorite(mindMapId) {
      if (this.favorites.has(mindMapId)) {
        this.favorites.delete(mindMapId)
      } else {
        this.favorites.add(mindMapId)
      }
      this.saveFavorites()
    },
    
    // 检查是否收藏
    isFavorite(mindMapId) {
      return this.favorites.has(mindMapId)
    },
    
    // 保存收藏数据到localStorage
    saveFavorites() {
      try {
        const favoritesArray = Array.from(this.favorites)
        localStorage.setItem('mindmap_favorites', JSON.stringify(favoritesArray))
      } catch (error) {
        console.warn('保存收藏数据失败:', error)
      }
    },
    
    // 从localStorage加载收藏数据
    loadFavorites() {
      try {
        const favoritesData = localStorage.getItem('mindmap_favorites')
        if (favoritesData) {
          const favoritesArray = JSON.parse(favoritesData)
          this.favorites = new Set(favoritesArray)
        }
      } catch (error) {
        console.warn('加载收藏数据失败:', error)
        this.favorites = new Set()
      }
    },
    
    // 开始定时刷新
    startRefreshTimer() {
      // 每30秒刷新一次数据
      this.refreshTimer = setInterval(() => {
        // 静默刷新，不影响用户操作
        this.$forceUpdate()
      }, 30000)
    }
  }
}
</script>

<style scoped>
.tagMindmapContainer {
  padding: 16px;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.isDark {
  color: #e4e7ed;
}

/* 统计卡片区域 */
.stats-section {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--bg-color-1);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-color);
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-color-2);
  margin-top: 2px;
}

/* 搜索区域 */
.search-section {
  margin-bottom: 16px;
}

.search-bar {
  margin-bottom: 12px;
}

.tag-filter {
  background: var(--bg-color-1);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.filter-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.filter-tag {
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tag:hover {
  transform: scale(1.05);
}

.tag-count {
  margin-left: 4px;
  opacity: 0.7;
}

.filter-mode {
  text-align: center;
}

/* 内容区域 */
.content-section {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
}

.section-block {
  margin-bottom: 16px;
  background: var(--bg-color-1);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  padding: 12px 16px;
  background: var(--bg-color-2);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.section-header:hover {
  background: var(--bg-color-3);
}

.section-icon {
  margin-right: 8px;
  font-size: 16px;
  color: var(--primary-color);
}

.tag-icon {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  flex: 1;
}

.section-count {
  font-size: 12px;
  color: var(--text-color-2);
  margin-right: 8px;
}

.section-arrow {
  transition: transform 0.2s ease;
  color: var(--text-color-2);
}

.section-arrow.expanded {
  transform: rotate(90deg);
}

.section-content {
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 1000px;
  }
}

/* 思维导图项目 */
.mindmap-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mindmap-item:hover {
  background: var(--bg-color-3);
  transform: translateX(4px);
}

.mindmap-item:last-child {
  border-bottom: none;
}

.mindmap-info {
  flex: 1;
  min-width: 0;
}

.mindmap-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mindmap-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mindmap-date {
  font-size: 11px;
  color: var(--text-color-2);
  white-space: nowrap;
}

.mindmap-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.mindmap-actions {
  margin-left: 8px;
}

.action-btn {
  padding: 4px;
  color: var(--text-color-2);
  transition: color 0.2s ease;
}

.action-btn:hover {
  color: var(--primary-color);
}

.favorite-active {
  color: #f56c6c;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-color-2);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
}

/* 深色主题适配 */
.isDark .stat-card {
  background: #2a2a2a;
  border-color: #404040;
}

.isDark .section-block {
  background: #2a2a2a;
  border-color: #404040;
}

.isDark .section-header {
  background: #333333;
  border-color: #404040;
}

.isDark .section-header:hover {
  background: #383838;
}

.isDark .mindmap-item:hover {
  background: #333333;
}

.isDark .tag-filter {
  background: #2a2a2a;
  border-color: #404040;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-card {
    padding: 8px;
  }
  
  .stat-icon {
    width: 24px;
    height: 24px;
    margin-right: 6px;
  }
  
  .stat-number {
    font-size: 16px;
  }
}
</style>