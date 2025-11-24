<template>
  <div class="tagFilterContainer" :class="{ isDark: isDark }">
    <!-- 标签筛选栏 -->
    <div class="filterHeader">
      <div class="filterTitle">
        <i class="el-icon-price-tag"></i>
        标签筛选
      </div>
      <div class="filterActions">
        <el-button
          size="mini"
          @click="clearAllFilters"
          v-if="selectedTagFilters.length > 0"
        >
          <i class="el-icon-refresh-left"></i>
          清除筛选
        </el-button>
        <el-button size="mini" type="primary" @click="showTagManager">
          <i class="el-icon-setting"></i>
          标签管理
        </el-button>
      </div>
    </div>

    <!-- 选中的筛选标签 -->
    <div class="selectedFilters" v-if="selectedTagFilters.length > 0">
      <div class="selectedTitle">
        <i class="el-icon-filter"></i>
        当前筛选 ({{ selectedTagFilters.length }})
      </div>
      <div class="selectedTags">
        <div
          v-for="tag in selectedTagFiltersData"
          :key="tag.id"
          class="filterTag selected"
          :style="{ backgroundColor: tag.color }"
        >
          <span class="tagText">{{ tag.name }}</span>
          <i
            class="el-icon-close removeFilter"
            @click="removeTagFilter(tag.id)"
            :title="'移除筛选: ' + tag.name"
          ></i>
        </div>
      </div>

      <!-- 筛选模式切换 -->
      <div class="filterMode">
        <el-radio-group v-model="filterMode" size="mini" @change="applyFilters">
          <el-radio-button label="any">包含任一标签</el-radio-button>
          <el-radio-button label="all">包含所有标签</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 可用标签列表 -->
    <div class="availableTags">
      <div class="tagsTitle">
        <i class="el-icon-collection-tag"></i>
        可用标签 ({{ availableTags.length }})
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标签..."
          size="mini"
          prefix-icon="el-icon-search"
          clearable
          @input="handleSearch"
          style="width: 150px; margin-left: 10px"
        />
      </div>

      <div v-if="filteredAvailableTags.length === 0" class="emptyState">
        <i class="el-icon-price-tag"></i>
        <p>{{ searchKeyword ? '没有找到匹配的标签' : '暂无标签' }}</p>
      </div>

      <div v-else class="tagsList">
        <div
          v-for="tag in filteredAvailableTags"
          :key="tag.id"
          class="filterTag"
          :class="{
            'is-selected': isTagSelected(tag.id),
            'has-results': tagResultCounts[tag.id] > 0
          }"
          :style="{ borderColor: tag.color }"
          @click="toggleTagFilter(tag)"
        >
          <div class="tagInfo">
            <div class="tagColor" :style="{ backgroundColor: tag.color }"></div>
            <span class="tagName">{{ tag.name }}</span>
            <div class="tagMeta">
              <span v-if="tag.is_public" class="publicBadge">公共</span>
              <span v-else class="privateBadge">私有</span>
            </div>
          </div>
          <div class="tagStats">
            <span class="resultCount">
              {{ tagResultCounts[tag.id] || 0 }} 个思维导图
            </span>
            <i
              v-if="isTagSelected(tag.id)"
              class="el-icon-check selectedIcon"
            ></i>
            <i v-else class="el-icon-plus addIcon"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选结果统计 -->
    <div class="filterResults" v-if="selectedTagFilters.length > 0">
      <div class="resultsHeader">
        <i class="el-icon-data-line"></i>
        筛选结果
      </div>
      <div class="resultsContent">
        <div class="resultStat">
          <span class="statLabel">符合条件的思维导图:</span>
          <span class="statValue">{{ filteredMindMapsCount }} 个</span>
        </div>
        <div class="resultStat" v-if="filteredMindMapsCount > 0">
          <span class="statLabel">最近更新:</span>
          <span class="statValue">{{ latestMindMapDate }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { tagApi } from '@/api/supabase-api'
  import { mapState } from 'vuex'

  export default {
    name: 'MindMapTagFilter',
    props: {
      mindMaps: {
        type: Array,
        default: () => []
      }
    },
    data() {
      return {
        availableTags: [],
        filteredAvailableTags: [],
        selectedTagFilters: [],
        filterMode: 'any', // 'any' 或 'all'
        searchKeyword: '',
        tagResultCounts: {},
        loading: false
      }
    },
    computed: {
      ...mapState({
        isDark: state => state.localConfig.isDark,
        currentUser: state => state.currentUser
      }),

      // 选中筛选标签的详细数据
      selectedTagFiltersData() {
        return this.selectedTagFilters
          .map(tagId => this.availableTags.find(tag => tag.id === tagId))
          .filter(Boolean)
      },

      // 筛选后的思维导图数量
      filteredMindMapsCount() {
        if (this.selectedTagFilters.length === 0) return this.mindMaps.length
        return this.getFilteredMindMaps().length
      },

      // 最新思维导图的更新时间
      latestMindMapDate() {
        const filtered = this.getFilteredMindMaps()
        if (filtered.length === 0) return '无'

        const latest = filtered.reduce((latest, current) => {
          return new Date(current.updated_at) > new Date(latest.updated_at)
            ? current
            : latest
        })

        return this.formatDate(latest.updated_at)
      }
    },
    watch: {
      mindMaps: {
        handler() {
          this.updateTagResultCounts()
        },
        immediate: true
      },

      currentUser: {
        handler(newUser) {
          if (newUser) {
            this.loadAvailableTags()
          } else {
            this.availableTags = []
            this.selectedTagFilters = []
          }
        },
        immediate: true
      }
    },
    created() {
      this.loadAvailableTags()
    },
    methods: {
      // 加载可用标签
      async loadAvailableTags() {
        if (!this.currentUser) return

        try {
          this.loading = true
          this.availableTags = await tagApi.getUserAvailableTags(
            this.currentUser.id
          )
          this.handleSearch()
          this.updateTagResultCounts()
        } catch (error) {
          console.error('加载标签失败:', error)
        } finally {
          this.loading = false
        }
      },

      // 搜索处理
      handleSearch() {
        if (!this.searchKeyword.trim()) {
          this.filteredAvailableTags = [...this.availableTags]
        } else {
          const keyword = this.searchKeyword.toLowerCase()
          this.filteredAvailableTags = this.availableTags.filter(tag =>
            tag.name.toLowerCase().includes(keyword)
          )
        }
      },

      // 检查标签是否被选中
      isTagSelected(tagId) {
        return this.selectedTagFilters.includes(tagId)
      },

      // 切换标签筛选
      toggleTagFilter(tag) {
        const index = this.selectedTagFilters.indexOf(tag.id)
        if (index > -1) {
          this.selectedTagFilters.splice(index, 1)
        } else {
          this.selectedTagFilters.push(tag.id)
        }
        this.applyFilters()
      },

      // 移除标签筛选
      removeTagFilter(tagId) {
        const index = this.selectedTagFilters.indexOf(tagId)
        if (index > -1) {
          this.selectedTagFilters.splice(index, 1)
          this.applyFilters()
        }
      },

      // 清除所有筛选
      clearAllFilters() {
        this.selectedTagFilters = []
        this.applyFilters()
      },

      // 应用筛选
      applyFilters() {
        const filteredMindMaps = this.getFilteredMindMaps()
        this.$emit('filter-change', {
          tags: this.selectedTagFilters,
          mode: this.filterMode,
          results: filteredMindMaps
        })
      },

      // 获取筛选后的思维导图
      getFilteredMindMaps() {
        if (this.selectedTagFilters.length === 0) {
          return this.mindMaps
        }

        return this.mindMaps.filter(mindMap => {
          const mindMapTags = mindMap.mindmap_tags || []
          const mindMapTagIds = mindMapTags.map(mt => mt.tag_id)

          if (this.filterMode === 'all') {
            // 包含所有选中的标签
            return this.selectedTagFilters.every(tagId =>
              mindMapTagIds.includes(tagId)
            )
          } else {
            // 包含任一选中的标签
            return this.selectedTagFilters.some(tagId =>
              mindMapTagIds.includes(tagId)
            )
          }
        })
      },

      // 更新标签结果计数
      updateTagResultCounts() {
        const counts = {}

        this.availableTags.forEach(tag => {
          const count = this.mindMaps.filter(mindMap => {
            const mindMapTags = mindMap.mindmap_tags || []
            return mindMapTags.some(mt => mt.tag_id === tag.id)
          }).length
          counts[tag.id] = count
        })

        this.tagResultCounts = counts
      },

      // 显示标签管理器
      showTagManager() {
        this.$bus.$emit('showTagManager')
      },

      // 格式化日期
      formatDate(dateString) {
        if (!dateString) return ''
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
          return '今天'
        } else if (diffDays === 1) {
          return '昨天'
        } else if (diffDays < 7) {
          return `${diffDays}天前`
        } else {
          return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
        }
      }
    }
  }
</script>

<style lang="less" scoped>
  .tagFilterContainer {
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    background-color: #fff;
    margin-bottom: 20px;
    overflow: hidden;

    &.isDark {
      background-color: #262a2e;
      border-color: hsla(0, 0%, 100%, 0.1);
      color: #fff;

      .filterHeader {
        border-bottom-color: hsla(0, 0%, 100%, 0.1);
      }

      .selectedFilters {
        background-color: #363a3f;
        border-bottom-color: hsla(0, 0%, 100%, 0.1);
      }

      .filterTag {
        background-color: #363a3f;
        border-color: hsla(0, 0%, 100%, 0.1);

        &:hover {
          background-color: #404449;
        }

        &.is-selected {
          background-color: #2d3748;
        }
      }

      .emptyState {
        color: #999;
      }

      .filterResults {
        background-color: #363a3f;
        border-top-color: hsla(0, 0%, 100%, 0.1);
      }
    }

    .filterHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e8e8e8;
      background-color: #fafafa;

      .filterTitle {
        font-weight: 600;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;

        i {
          color: #409eff;
        }
      }

      .filterActions {
        display: flex;
        gap: 10px;
      }
    }

    .selectedFilters {
      padding: 16px 20px;
      background-color: #f0f9ff;
      border-bottom: 1px solid #e8e8e8;

      .selectedTitle {
        font-weight: 500;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;

        i {
          color: #409eff;
        }
      }

      .selectedTags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }

      .filterMode {
        margin-top: 12px;
      }
    }

    .availableTags {
      padding: 20px;

      .tagsTitle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        font-weight: 500;

        i {
          color: #409eff;
          margin-right: 6px;
        }
      }

      .emptyState {
        text-align: center;
        padding: 40px 20px;
        color: #999;

        i {
          font-size: 48px;
          margin-bottom: 15px;
          display: block;
        }

        p {
          font-size: 14px;
          margin: 0;
        }
      }

      .tagsList {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
      }
    }

    .filterTag {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      background-color: #fff;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background-color: #f5f7fa;
        border-color: #409eff;
      }

      &.is-selected {
        background-color: #ecf5ff;
        border-color: #409eff;
      }

      &.has-results .resultCount {
        color: #67c23a;
        font-weight: 500;
      }

      &.selected {
        padding: 6px 12px;
        border-radius: 16px;
        color: #fff;
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;

        .tagText {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .removeFilter {
          font-size: 12px;
          opacity: 0.8;
          cursor: pointer;

          &:hover {
            opacity: 1;
          }
        }
      }

      .tagInfo {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      }

      .tagColor {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .tagName {
        font-weight: 500;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .tagMeta {
        font-size: 12px;

        .publicBadge {
          color: #67c23a;
        }

        .privateBadge {
          color: #909399;
        }
      }

      .tagStats {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;

        .resultCount {
          font-size: 12px;
          color: #999;
        }

        .selectedIcon {
          color: #67c23a;
          font-weight: bold;
        }

        .addIcon {
          color: #c0c4cc;
        }
      }
    }

    .filterResults {
      padding: 16px 20px;
      background-color: #f9f9f9;
      border-top: 1px solid #e8e8e8;

      .resultsHeader {
        font-weight: 500;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;

        i {
          color: #409eff;
        }
      }

      .resultsContent {
        .resultStat {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;

          &:last-child {
            margin-bottom: 0;
          }

          .statLabel {
            color: #666;
          }

          .statValue {
            font-weight: 500;
            color: #333;
          }
        }
      }
    }
  }
</style>
