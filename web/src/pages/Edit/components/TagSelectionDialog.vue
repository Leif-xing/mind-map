<template>
  <el-dialog
    title="为思维导图添加标签"
    :visible.sync="dialogVisible"
    width="600px"
    :modal-append-to-body="false"
    :close-on-click-modal="false"
    custom-class="tagSelectionDialog"
    :class="{ isDark: isDark }"
    @close="handleClose"
  >
    <div class="dialogContent">
      <!-- 搜索框 -->
      <div class="searchSection">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索标签..."
          prefix-icon="el-icon-search"
          clearable
          @input="handleSearch"
        />
      </div>

      <!-- 已选择的标签 -->
      <div class="selectedSection" v-if="selectedTags.length > 0">
        <div class="sectionTitle">
          <i class="el-icon-check"></i>
          已选择 ({{ selectedTags.length }})
        </div>
        <div class="selectedTags">
          <div 
            v-for="tag in selectedTagsData" 
            :key="tag.id"
            class="tagChip selected"
            :style="{ backgroundColor: tag.color }"
          >
            <span class="tagText">{{ tag.name }}</span>
            <i 
              class="el-icon-close removeTag" 
              @click="removeSelectedTag(tag.id)"
            ></i>
          </div>
        </div>
      </div>

      <!-- 可用标签列表 -->
      <div class="availableSection">
        <div class="sectionTitle">
          <i class="el-icon-price-tag"></i>
          可用标签 ({{ filteredAvailableTags.length }})
        </div>
        
        <div v-if="filteredAvailableTags.length === 0" class="emptyState">
          <i class="el-icon-folder-remove"></i>
          <p>{{ searchKeyword ? '没有找到匹配的标签' : '暂无可用标签' }}</p>
          <el-button 
            type="primary" 
            size="small" 
            @click="createNewTag"
            v-if="searchKeyword"
          >
            创建标签 "{{ searchKeyword }}"
          </el-button>
        </div>

        <div v-else class="tagGrid">
          <div 
            v-for="tag in filteredAvailableTags" 
            :key="tag.id"
            class="tagItem"
            :class="{ 
              'is-used': isTagUsed(tag.id),
              'is-selected': isTagSelected(tag.id)
            }"
            @click="toggleTag(tag)"
          >
            <div class="tagInfo">
              <div 
                class="tagColor"
                :style="{ backgroundColor: tag.color }"
              ></div>
              <span class="tagName">{{ tag.name }}</span>
              <div class="tagMeta">
                <span v-if="tag.is_public" class="publicTag">
                  <i class="el-icon-view"></i>
                  公共
                </span>
                <span v-else class="privateTag">
                  <i class="el-icon-lock"></i>
                  私有
                </span>
              </div>
            </div>
            <div class="tagStatus">
              <i 
                v-if="isTagUsed(tag.id)" 
                class="el-icon-check statusIcon used"
                title="已在思维导图中"
              ></i>
              <i 
                v-else-if="isTagSelected(tag.id)" 
                class="el-icon-minus statusIcon selected"
                title="待添加"
              ></i>
              <i 
                v-else 
                class="el-icon-plus statusIcon available"
                title="点击添加"
              ></i>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速筛选 -->
      <div class="filterSection">
        <div class="sectionTitle">
          <i class="el-icon-filter"></i>
          快速筛选
        </div>
        <div class="filterButtons">
          <el-button 
            size="small" 
            :type="filterType === 'all' ? 'primary' : ''"
            @click="setFilter('all')"
          >
            全部 ({{ availableTags.length }})
          </el-button>
          <el-button 
            size="small" 
            :type="filterType === 'private' ? 'primary' : ''"
            @click="setFilter('private')"
          >
            我的标签 ({{ privateTagsCount }})
          </el-button>
          <el-button 
            size="small" 
            :type="filterType === 'public' ? 'primary' : ''"
            @click="setFilter('public')"
          >
            公共标签 ({{ publicTagsCount }})
          </el-button>
          <el-button 
            size="small" 
            :type="filterType === 'unused' ? 'primary' : ''"
            @click="setFilter('unused')"
          >
            未使用 ({{ unusedTagsCount }})
          </el-button>
        </div>
      </div>
    </div>

    <div slot="footer" class="dialogFooter">
      <div class="footerLeft">
        <el-button 
          size="small" 
          @click="selectAll"
          :disabled="filteredAvailableTags.length === 0"
        >
          <i class="el-icon-check"></i>
          全选
        </el-button>
        <el-button 
          size="small" 
          @click="clearSelection"
          :disabled="selectedTags.length === 0"
        >
          <i class="el-icon-close"></i>
          清空
        </el-button>
      </div>
      <div class="footerRight">
        <el-button @click="handleClose" size="small">
          取消
        </el-button>
        <el-button 
          type="primary" 
          @click="handleSubmit"
          :loading="submitting"
          :disabled="selectedTags.length === 0"
          size="small"
        >
          <i class="el-icon-check"></i>
          添加标签 ({{ selectedTags.length }})
        </el-button>
      </div>
    </div>

    <!-- 创建标签对话框 -->
    <TagCreateEditDialog
      :visible="showCreateDialog"
      @close="closeCreateDialog"
      @success="handleCreateSuccess"
    />
  </el-dialog>
</template>

<script>
import { tagApi } from '@/api/supabase-api'
import TagCreateEditDialog from './TagCreateEditDialog.vue'
import { mapState } from 'vuex'
import { getCurrentMindMapIdFromVueInstance } from '@/utils/vue-instance-helpers'

export default {
  name: 'TagSelectionDialog',
  components: {
    TagCreateEditDialog
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    availableTags: {
      type: Array,
      default: () => []
    },
    currentMindMapTags: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      dialogVisible: false,
      submitting: false,
      searchKeyword: '',
      selectedTags: [],
      filterType: 'all',
      showCreateDialog: false,
      filteredAvailableTags: []
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      currentUser: state => state.currentUser,
      currentMindMapId: state => state.currentMindMapId
    }),

    // 当前思维导图已使用的标签ID集合
    usedTagIds() {
      return new Set(this.currentMindMapTags.map(tag => tag.id))
    },

    // 已选择标签的详细数据
    selectedTagsData() {
      return this.selectedTags.map(tagId => 
        this.availableTags.find(tag => tag.id === tagId)
      ).filter(Boolean)
    },

    // 私有标签数量
    privateTagsCount() {
      return this.availableTags.filter(tag => !tag.is_public).length
    },

    // 公共标签数量
    publicTagsCount() {
      return this.availableTags.filter(tag => tag.is_public).length
    },

    // 未使用标签数量
    unusedTagsCount() {
      return this.availableTags.filter(tag => !this.usedTagIds.has(tag.id)).length
    }
  },
  watch: {
    visible(val) {
      this.dialogVisible = val
      if (val) {
        this.initDialog()
      }
    },
    
    dialogVisible(val) {
      if (!val) {
        this.$emit('close')
      }
    },

    availableTags: {
      handler() {
        this.handleSearch()
      },
      immediate: true
    }
  },
  methods: {
    // 初始化对话框
    initDialog() {
      this.selectedTags = []
      this.searchKeyword = ''
      this.filterType = 'all'
      this.handleSearch()
    },

    // 搜索处理
    handleSearch() {
      let filtered = [...this.availableTags]

      // 按类型筛选
      if (this.filterType === 'private') {
        filtered = filtered.filter(tag => !tag.is_public)
      } else if (this.filterType === 'public') {
        filtered = filtered.filter(tag => tag.is_public)
      } else if (this.filterType === 'unused') {
        filtered = filtered.filter(tag => !this.usedTagIds.has(tag.id))
      }

      // 按关键词搜索
      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.toLowerCase()
        filtered = filtered.filter(tag => 
          tag.name.toLowerCase().includes(keyword)
        )
      }

      this.filteredAvailableTags = filtered
    },

    // 设置筛选类型
    setFilter(type) {
      this.filterType = type
      this.handleSearch()
    },

    // 检查标签是否已在思维导图中使用
    isTagUsed(tagId) {
      return this.usedTagIds.has(tagId)
    },

    // 检查标签是否已选择
    isTagSelected(tagId) {
      return this.selectedTags.includes(tagId)
    },

    // 切换标签选择状态
    toggleTag(tag) {
      // 如果已在思维导图中使用，不允许操作
      if (this.isTagUsed(tag.id)) {
        this.$message.info(`标签 "${tag.name}" 已在当前思维导图中`)
        return
      }

      const index = this.selectedTags.indexOf(tag.id)
      if (index > -1) {
        this.selectedTags.splice(index, 1)
      } else {
        this.selectedTags.push(tag.id)
      }
    },

    // 移除已选择的标签
    removeSelectedTag(tagId) {
      const index = this.selectedTags.indexOf(tagId)
      if (index > -1) {
        this.selectedTags.splice(index, 1)
      }
    },

    // 全选
    selectAll() {
      const availableTagIds = this.filteredAvailableTags
        .filter(tag => !this.isTagUsed(tag.id))
        .map(tag => tag.id)
      
      // 合并已选择的和新选择的，去重
      this.selectedTags = [...new Set([...this.selectedTags, ...availableTagIds])]
    },

    // 清空选择
    clearSelection() {
      this.selectedTags = []
    },

    // 创建新标签
    createNewTag() {
      this.showCreateDialog = true
    },

    // 关闭创建对话框
    closeCreateDialog() {
      this.showCreateDialog = false
    },

    // 创建标签成功
    handleCreateSuccess() {
      this.closeCreateDialog()
      // 重新获取标签列表
      this.$emit('refresh-tags')
    },

    // 处理关闭
    handleClose() {
      this.dialogVisible = false
      this.selectedTags = []
      this.searchKeyword = ''
      this.filterType = 'all'
    },

    // 处理提交
    async handleSubmit() {
      if (this.selectedTags.length === 0) {
        this.$message.warning('请选择要添加的标签')
        return
      }

      try {
        this.submitting = true

        await tagApi.addTagsToMindMap(
          this.currentUser.id,
          this.currentMindMapId,
          this.selectedTags
        )

        this.$message.success(`成功添加 ${this.selectedTags.length} 个标签`)
        
        // 发出成功事件，传递添加的标签ID列表
        this.$emit('success', [...this.selectedTags])
        this.handleClose()
      } catch (error) {
        this.$message.error('添加标签失败: ' + error.message)
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.tagSelectionDialog {
  .dialogContent {
    max-height: 60vh;
    overflow-y: auto;

    .searchSection {
      margin-bottom: 20px;
    }

    .selectedSection,
    .availableSection,
    .filterSection {
      margin-bottom: 24px;

      .sectionTitle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
        margin-bottom: 12px;
        font-size: 14px;

        i {
          color: #409eff;
        }
      }
    }

    .selectedTags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px;
      background-color: #f0f9ff;
      border-radius: 8px;
      border: 1px dashed #409eff;
      min-height: 60px;
      align-items: center;

      .tagChip {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        color: #fff;
        gap: 6px;

        .tagText {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .removeTag {
          cursor: pointer;
          font-size: 12px;
          opacity: 0.8;
          transition: opacity 0.2s;

          &:hover {
            opacity: 1;
          }
        }
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
        margin: 0 0 15px 0;
      }
    }

    .tagGrid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
    }

    .tagItem {
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

      &.is-used {
        background-color: #e6e8eb;  /* 浅灰色背景，与标签文字颜色形成更好对比 */
        border-color: #c0c4cc;
        cursor: not-allowed;
        opacity: 0.8;

        .statusIcon.used {
          color: #67c23a;
        }
      }

      &.is-selected {
        background-color: #ecf5ff;
        border-color: #409eff;

        .statusIcon.selected {
          color: #e6a23c;
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
        color: #303133;  /* 设置深色文字，确保可读性 */
      }

      .tagMeta {
        font-size: 12px;
        color: #999;

        .publicTag {
          color: #67c23a;
        }

        .privateTag {
          color: #909399;
        }

        i {
          margin-right: 2px;
        }
      }

      .statusIcon {
        font-size: 16px;
        font-weight: bold;

        &.available {
          color: #c0c4cc;
        }

        &.selected {
          color: #e6a23c;
        }

        &.used {
          color: #67c23a;
        }
      }
    }

    .filterButtons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  }

  .dialogFooter {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .footerLeft,
    .footerRight {
      display: flex;
      gap: 12px;
    }
  }

  // 深色主题样式
  &.isDark {
    .dialogContent {
      .sectionTitle {
        color: #fff;
      }

      .selectedTags {
        background-color: #2d3748;
        border-color: #409eff;
      }

      .tagItem {
        background-color: #363a3f;
        border-color: hsla(0, 0%, 100%, 0.1);

        &:hover {
          background-color: #404449;
        }

        &.is-used {
          background-color: #4a4f55;  /* 深色模式下的浅灰色背景 */
        }

        &.is-selected {
          background-color: #2d3748;
        }
      }

      .emptyState {
        color: #999;
      }
    }
  }
}

// 全局对话框样式
:global(.tagSelectionDialog) {
  .el-dialog__header {
    border-bottom: 1px solid #ebeef5;
    padding: 20px 20px 15px;

    .el-dialog__title {
      font-weight: 600;
      font-size: 16px;
    }
  }

  .el-dialog__body {
    padding: 20px;
  }

  .el-dialog__footer {
    border-top: 1px solid #ebeef5;
    padding: 15px 20px 20px;
  }

  &.isDark {
    .el-dialog__header {
      border-bottom-color: hsla(0, 0%, 100%, 0.1);
    }

    .el-dialog__footer {
      border-top-color: hsla(0, 0%, 100%, 0.1);
    }
  }
}
</style>