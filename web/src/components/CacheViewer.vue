<template>
  <div class="cache-viewer" :class="{ isDark: isDark }">
    <div class="viewer-header">
      <h2>Vue缓存数据查看器</h2>
      <div class="header-actions">
        <el-button size="small" @click="refreshAll">刷新</el-button>
        <el-button size="small" type="primary" @click="exportData">
          导出数据
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="viewer-tabs">
      <!-- LocalStorage 标签页 -->
      <el-tab-pane label="LocalStorage" name="localStorage">
        <div class="storage-section">
          <el-input
            v-model="localStorageSearch"
            placeholder="搜索键名..."
            prefix-icon="el-icon-search"
            clearable
            size="small"
            class="search-input"
          />

          <div class="storage-list">
            <div
              v-for="item in filteredLocalStorage"
              :key="item.key"
              class="storage-item"
            >
              <div class="item-header" @click="toggleItem(item.key)">
                <span class="item-key">{{ item.key }}</span>
                <span class="item-size">{{ item.size }}</span>
                <i
                  :class="
                    expandedItems[item.key]
                      ? 'el-icon-arrow-up'
                      : 'el-icon-arrow-down'
                  "
                ></i>
              </div>

              <div v-if="expandedItems[item.key]" class="item-content">
                <pre class="json-viewer">{{ formatJson(item.value) }}</pre>
              </div>
            </div>

            <div v-if="localStorageData.length === 0" class="empty-state">
              <i class="el-icon-document"></i>
              <p>LocalStorage 为空</p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- SessionStorage 标签页 -->
      <el-tab-pane label="SessionStorage" name="sessionStorage">
        <div class="storage-section">
          <el-input
            v-model="sessionStorageSearch"
            placeholder="搜索键名..."
            prefix-icon="el-icon-search"
            clearable
            size="small"
            class="search-input"
          />

          <div class="storage-list">
            <div
              v-for="item in filteredSessionStorage"
              :key="item.key"
              class="storage-item"
            >
              <div
                class="item-header"
                @click="toggleItem(item.key + '_session')"
              >
                <span class="item-key">{{ item.key }}</span>
                <span class="item-size">{{ item.size }}</span>
                <i
                  :class="
                    expandedItems[item.key + '_session']
                      ? 'el-icon-arrow-up'
                      : 'el-icon-arrow-down'
                  "
                ></i>
              </div>

              <div
                v-if="expandedItems[item.key + '_session']]"
                class="item-content"
              >
                <pre class="json-viewer">{{ formatJson(item.value) }}</pre>
              </div>
            </div>

            <div v-if="sessionStorageData.length === 0" class="empty-state">
              <i class="el-icon-document"></i>
              <p>SessionStorage 为空</p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- Vuex Store 标签页 -->
      <el-tab-pane label="Vuex Store" name="vuex">
        <div class="storage-section">
          <el-input
            v-model="vuexSearch"
            placeholder="搜索state..."
            prefix-icon="el-icon-search"
            clearable
            size="small"
            class="search-input"
          />

          <div class="vuex-info">
            <el-alert
              title="Vuex State"
              :description="`总大小: ${getVuexSize()}`"
              type="info"
              :closable="false"
              show-icon
            />
          </div>

          <div class="storage-list">
            <div
              v-for="(value, key) in filteredVuex"
              :key="key"
              class="storage-item"
            >
              <div class="item-header" @click="toggleItem(key + '_vuex')">
                <span class="item-key">{{ key }}</span>
                <span class="item-size">{{ getDataSize(value) }}</span>
                <i
                  :class="
                    expandedItems[key + '_vuex']
                      ? 'el-icon-arrow-up'
                      : 'el-icon-arrow-down'
                  "
                ></i>
              </div>

              <div v-if="expandedItems[key + '_vuex']]" class="item-content">
                <pre class="json-viewer">{{ formatJson(value) }}</pre>
              </div>
            </div>

            <div
              v-if="!vuexStore || Object.keys(vuexStore).length === 0"
              class="empty-state"
            >
              <i class="el-icon-warning"></i>
              <p>无法访问 Vuex Store</p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 数据汇总 标签页 -->
      <el-tab-pane label="数据汇总" name="summary">
        <div class="summary-section">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-card class="summary-card">
                <div slot="header">
                  <span>LocalStorage</span>
                </div>
                <div class="card-content">
                  <div class="stat-item">
                    <span class="stat-label">项目数:</span>
                    <span class="stat-value">
                      {{ localStorageData.length }}
                    </span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">总大小:</span>
                    <span class="stat-value">
                      {{ getTotalLocalStorageSize() }}
                    </span>
                  </div>
                </div>
              </el-card>
            </el-col>

            <el-col :span="8">
              <el-card class="summary-card">
                <div slot="header">
                  <span>SessionStorage</span>
                </div>
                <div class="card-content">
                  <div class="stat-item">
                    <span class="stat-label">项目数:</span>
                    <span class="stat-value">
                      {{ sessionStorageData.length }}
                    </span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">总大小:</span>
                    <span class="stat-value">
                      {{ getTotalSessionStorageSize() }}
                    </span>
                  </div>
                </div>
              </el-card>
            </el-col>

            <el-col :span="8">
              <el-card class="summary-card">
                <div slot="header">
                  <span>Vuex Store</span>
                </div>
                <div class="card-content">
                  <div class="stat-item">
                    <span class="stat-label">State数:</span>
                    <span class="stat-value">
                      {{ vuexStore ? Object.keys(vuexStore).length : 0 }}
                    </span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">总大小:</span>
                    <span class="stat-value">{{ getVuexSize() }}</span>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
  export default {
    name: 'CacheViewer',
    data() {
      return {
        activeTab: 'localStorage',
        localStorageSearch: '',
        sessionStorageSearch: '',
        vuexSearch: '',
        expandedItems: {},
        localStorageData: [],
        sessionStorageData: [],
        vuexStore: null
      }
    },
    computed: {
      isDark() {
        return this.$store?.state?.localConfig?.isDark || false
      },
      filteredLocalStorage() {
        if (!this.localStorageSearch) return this.localStorageData
        return this.localStorageData.filter(item =>
          item.key.toLowerCase().includes(this.localStorageSearch.toLowerCase())
        )
      },
      filteredSessionStorage() {
        if (!this.sessionStorageSearch) return this.sessionStorageData
        return this.sessionStorageData.filter(item =>
          item.key
            .toLowerCase()
            .includes(this.sessionStorageSearch.toLowerCase())
        )
      },
      filteredVuex() {
        if (!this.vuexSearch || !this.vuexStore) return this.vuexStore || {}
        const filtered = {}
        Object.keys(this.vuexStore).forEach(key => {
          if (key.toLowerCase().includes(this.vuexSearch.toLowerCase())) {
            filtered[key] = this.vuexStore[key]
          }
        })
        return filtered
      }
    },
    mounted() {
      this.loadData()
    },
    methods: {
      loadData() {
        this.loadLocalStorage()
        this.loadSessionStorage()
        this.loadVuex()
      },
      loadLocalStorage() {
        const data = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          const value = localStorage.getItem(key)
          data.push({
            key,
            value,
            size: this.getDataSize(value)
          })
        }
        this.localStorageData = data.sort((a, b) => a.key.localeCompare(b.key))
      },
      loadSessionStorage() {
        const data = []
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          const value = sessionStorage.getItem(key)
          data.push({
            key,
            value,
            size: this.getDataSize(value)
          })
        }
        this.sessionStorageData = data.sort((a, b) =>
          a.key.localeCompare(b.key)
        )
      },
      loadVuex() {
        try {
          this.vuexStore = this.$store.state
        } catch (error) {
          console.error('无法访问Vuex store:', error)
          this.vuexStore = null
        }
      },
      refreshAll() {
        this.loadData()
        this.$message.success('数据已刷新')
      },
      toggleItem(key) {
        this.$set(this.expandedItems, key, !this.expandedItems[key])
      },
      formatJson(data) {
        try {
          return JSON.stringify(
            typeof data === 'object' ? data : JSON.parse(data),
            null,
            2
          )
        } catch (e) {
          return data
        }
      },
      getDataSize(data) {
        try {
          const size = new Blob([JSON.stringify(data)]).size
          if (size < 1024) return `${size} B`
          if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
          return `${(size / (1024 * 1024)).toFixed(2)} MB`
        } catch (e) {
          return '未知'
        }
      },
      getTotalLocalStorageSize() {
        let total = 0
        this.localStorageData.forEach(item => {
          try {
            total += new Blob([item.value]).size
          } catch (e) {}
        })
        return `${(total / 1024).toFixed(2)} KB`
      },
      getTotalSessionStorageSize() {
        let total = 0
        this.sessionStorageData.forEach(item => {
          try {
            total += new Blob([item.value]).size
          } catch (e) {}
        })
        return `${(total / 1024).toFixed(2)} KB`
      },
      getVuexSize() {
        if (!this.vuexStore) return '未知'
        return this.getDataSize(this.vuexStore)
      },
      exportData() {
        const exportData = {
          timestamp: new Date().toISOString(),
          localStorage: {},
          sessionStorage: {},
          vuex: this.vuexStore
        }

        // 导出localStorage
        this.localStorageData.forEach(item => {
          exportData.localStorage[item.key] = item.value
        })

        // 导出sessionStorage
        this.sessionStorageData.forEach(item => {
          exportData.sessionStorage[item.key] = item.value
        })

        // 创建下载链接
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `cache-data-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        this.$message.success('数据已导出')
      }
    }
  }
</script>

<style scoped>
  .cache-viewer {
    height: 100%;
    background: var(--bg-color);
    color: var(--text-color);
  }

  .viewer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
  }

  .viewer-header h2 {
    margin: 0;
    color: var(--text-color);
  }

  .storage-section {
    padding: 20px;
  }

  .search-input {
    margin-bottom: 20px;
    width: 300px;
  }

  .storage-list {
    max-height: 600px;
    overflow-y: auto;
  }

  .storage-item {
    margin-bottom: 15px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    overflow: hidden;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background: var(--bg-color-1);
    cursor: pointer;
    transition: background 0.3s;
  }

  .item-header:hover {
    background: var(--bg-color-2);
  }

  .item-key {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-weight: 500;
    flex: 1;
  }

  .item-size {
    color: var(--text-color-2);
    font-size: 12px;
    margin-right: 10px;
  }

  .item-content {
    border-top: 1px solid var(--border-color);
  }

  .json-viewer {
    padding: 15px;
    margin: 0;
    background: var(--bg-color);
    color: var(--text-color);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: var(--text-color-2);
  }

  .empty-state i {
    font-size: 48px;
    margin-bottom: 15px;
    display: block;
  }

  .vuex-info {
    margin-bottom: 20px;
  }

  .summary-section {
    padding: 20px;
  }

  .summary-card {
    margin-bottom: 20px;
  }

  .card-content {
    padding: 10px 0;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .stat-label {
    color: var(--text-color-2);
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-color);
  }

  /* 深色主题适配 */
  .isDark .storage-item {
    border-color: #404040;
  }

  .isDark .item-header {
    background: #252525;
  }

  .isDark .item-header:hover {
    background: #2d2d2d;
  }

  .isDark .item-content {
    border-top-color: #404040;
  }

  .isDark .json-viewer {
    background: #1e1e1e;
    color: #d4d4d4;
  }
</style>
