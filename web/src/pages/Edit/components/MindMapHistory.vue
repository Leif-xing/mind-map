<template>
  <div class="mind-map-history-container">
    <div class="header">
      <h3>思维导图历史</h3>
      <div class="actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索思维导图"
          prefix-icon="el-icon-search"
          size="small"
          style="width: 200px; margin-right: 10px;"
        />
        <el-checkbox 
          v-model="selectAll" 
          @change="toggleSelectAll"
          :disabled="!mindMaps || mindMaps.length === 0"
        >
          全选
        </el-checkbox>
        <el-button 
          type="danger" 
          size="small" 
          @click="batchDelete"
          :disabled="selectedMindMaps.length === 0"
        >
          批量删除
        </el-button>
        <el-button 
          type="info" 
          size="small" 
          @click="clearAll"
          :disabled="!mindMaps || mindMaps.length === 0"
        >
          清空全部
        </el-button>
      </div>
    </div>
    
    <div class="content">
      <el-table
        :data="filteredMindMaps"
        @selection-change="handleSelectionChange"
        v-loading="loading"
        style="width: 100%"
        ref="tableRef"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        <el-table-column prop="title" label="标题" width="300">
          <template slot-scope="scope">
            <el-input
              v-if="scope.row.editingTitle"
              v-model="scope.row.tempTitle"
              @blur="updateTitle(scope.row)"
              @keyup.enter.native="updateTitle(scope.row)"
              size="small"
            ></el-input>
            <span 
              v-else 
              @dblclick="startEditingTitle(scope.row)"
              class="title-span"
            >
              {{ scope.row.title }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template slot-scope="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template slot-scope="scope">
            {{ formatDate(scope.row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template slot-scope="scope">
            <el-button size="mini" type="primary" @click="loadMindMap(scope.row)">加载</el-button>
            <el-button size="mini" type="warning" @click="startEditingTitle(scope.row)">重命名</el-button>
            <el-button size="mini" type="danger" @click="deleteMindMap(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination" v-if="filteredMindMaps.length > 0">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage"
          :page-sizes="[5, 10, 20, 50]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredMindMaps.length"
        >
        </el-pagination>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'MindMapHistory',
  data() {
    return {
      mindMaps: [],
      loading: false,
      searchQuery: '',
      selectedMindMaps: [],
      selectAll: false,
      currentPage: 1,
      pageSize: 10,
      currentUser: null
    }
  },
  computed: {
    ...mapState({
      supabaseEnabled: state => state.supabaseEnabled
    }),
    
    filteredMindMaps() {
      let result = this.mindMaps || []
      
      // 搜索过滤
      if (this.searchQuery) {
        result = result.filter(mindMap => 
          mindMap.title.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
      }
      
      // 分页
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return result.slice(start, end)
    }
  },
  created() {
    this.loadCurrentUser()
    this.loadMindMaps()
  },
  methods: {
    loadCurrentUser() {
      this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
      if (!this.currentUser) {
        this.$message.error('请先登录')
        this.$router.push('/login')
      }
    },
    
    async loadMindMaps() {
      if (!this.currentUser) {
        return
      }
      
      this.loading = true
      try {
        const mindMaps = await this.$store.dispatch('getUserMindMaps', this.currentUser.id)
        // 添加editingTitle和tempTitle字段用于重命名功能
        this.mindMaps = mindMaps.map(mindMap => ({
          ...mindMap,
          editingTitle: false,
          tempTitle: mindMap.title
        }))
      } catch (error) {
        console.error('加载思维导图失败:', error)
        this.$message.error('加载思维导图失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },
    
    handleSelectionChange(selection) {
      this.selectedMindMaps = selection
      this.selectAll = selection.length === this.filteredMindMaps.length
    },
    
    toggleSelectAll() {
      if (this.selectAll) {
        this.$refs.tableRef?.clearSelection()
      } else {
        // 选择当前页所有项
        this.filteredMindMaps.forEach(row => {
          this.$refs.tableRef?.toggleRowSelection(row, true)
        })
      }
    },
    
    async deleteMindMap(mindMap) {
      try {
        await this.$confirm(`确定要删除思维导图 "${mindMap.title}" 吗？`, '删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        await this.$store.dispatch('deleteMindMap', {
          mindMapId: mindMap.id,
          userId: this.currentUser.id
        })
        
        this.$message.success('思维导图删除成功')
        this.loadMindMaps() // 重新加载列表
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除思维导图失败:', error)
          this.$message.error('删除思维导图失败: ' + error.message)
        }
      }
    },
    
    async batchDelete() {
      if (this.selectedMindMaps.length === 0) {
        this.$message.warning('请至少选择一个思维导图')
        return
      }
      
      try {
        await this.$confirm(`确定要删除选中的 ${this.selectedMindMaps.length} 个思维导图吗？`, '批量删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const deletePromises = this.selectedMindMaps.map(mindMap => 
          this.$store.dispatch('deleteMindMap', {
            mindMapId: mindMap.id,
            userId: this.currentUser.id
          })
        )
        
        await Promise.all(deletePromises)
        
        this.$message.success(`成功删除了 ${this.selectedMindMaps.length} 个思维导图`)
        this.selectedMindMaps = [] // 清空选择
        this.selectAll = false
        this.loadMindMaps() // 重新加载列表
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量删除思维导图失败:', error)
          this.$message.error('批量删除思维导图失败: ' + error.message)
        }
      }
    },
    
    async clearAll() {
      if (!(this.mindMaps && this.mindMaps.length > 0)) {
        this.$message.warning('没有可删除的思维导图')
        return
      }
      
      try {
        await this.$confirm('确定要清空所有思维导图吗？此操作不可恢复！', '清空确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const deletePromises = this.mindMaps.map(mindMap => 
          this.$store.dispatch('deleteMindMap', {
            mindMapId: mindMap.id,
            userId: this.currentUser.id
          })
        )
        
        await Promise.all(deletePromises)
        
        this.$message.success('所有思维导图已清空')
        this.selectedMindMaps = []
        this.selectAll = false
        this.loadMindMaps() // 重新加载列表
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清空思维导图失败:', error)
          this.$message.error('清空思维导图失败: ' + error.message)
        }
      }
    },
    
    async loadMindMap(mindMap) {
      // 首先检查当前思维导图是否被修改
      this.$bus.$emit('checkMindMapModified');
      
      // 监听修改状态响应
      const checkStatus = new Promise((resolve) => {
        const listener = (isModified) => {
          this.$bus.$off('mindMapModifiedStatus', listener);
          resolve(isModified);
        };
        this.$bus.$on('mindMapModifiedStatus', listener);
      });
      
      const isModified = await checkStatus;
      
      if (isModified) {
        // 当前思维导图被修改，询问用户是否保存
        try {
          const action = await this.$confirm(
            '当前思维导图有未保存的更改，是否保存后再加载新思维导图？',
            '思维导图已修改',
            {
              confirmButtonText: '保存并加载',
              cancelButtonText: '不保存，直接加载',
              type: 'warning',
              distinguishCancelAndClose: true
            }
          );
          
          // 如果用户选择"保存并加载"，先触发保存操作
          if (action === 'confirm') {
            // 触发保存操作
            this.$bus.$emit('saveCurrentMindMap');
            
            // 简单延时确保保存完成
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // 无论是否保存，都加载新思维导图
          this.$emit('load-mind-map', mindMap);
        } catch (cancelAction) {
          // 用户点击"取消"或关闭对话框，不执行任何操作
          if (cancelAction === 'cancel') {
            // console.log('用户取消加载思维导图'); // 仅调试时使用
          } else {
            // 用户选择"不保存，直接加载"
            this.$emit('load-mind-map', mindMap);
          }
        }
      } else {
        // 当前思维导图未被修改，直接加载新思维导图
        this.$emit('load-mind-map', mindMap);
      }
    },
    
    startEditingTitle(mindMap) {
      mindMap.editingTitle = true
      mindMap.tempTitle = mindMap.title
      this.$nextTick(() => {
        // 获取输入框并聚焦
        const input = this.$el.querySelector(`input[value="${mindMap.tempTitle}"]`)
        if (input) {
          input.focus()
        }
      })
    },
    
    async updateTitle(mindMap) {
      if (!mindMap.tempTitle.trim()) {
        this.$message.error('标题不能为空')
        mindMap.tempTitle = mindMap.title // 恢复原值
        mindMap.editingTitle = false
        return
      }
      
      if (mindMap.tempTitle === mindMap.title) {
        mindMap.editingTitle = false
        return
      }
      
      try {
        // 调用更新标题的API
        const updatedMindMap = await this.$store.dispatch('updateMindMapTitle', {
          mindMapId: mindMap.id,
          userId: this.currentUser.id,
          title: mindMap.tempTitle
        })
        
        mindMap.title = updatedMindMap.title
        mindMap.updated_at = updatedMindMap.updated_at
        this.$message.success('标题更新成功')
      } catch (error) {
        console.error('更新标题失败:', error)
        this.$message.error('标题更新失败: ' + error.message)
        mindMap.tempTitle = mindMap.title // 恢复原值
      } finally {
        mindMap.editingTitle = false
      }
    },
    
    handleSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1 // 重置到第一页
    },
    
    handleCurrentChange(val) {
      this.currentPage = val
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    }
  }
}
</script>

<style lang="less" scoped>
.mind-map-history-container {
  padding: 20px;
  height: 100%;
  overflow: auto;
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebeef5;
    
    h3 {
      margin: 0;
      color: #303133;
    }
    
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  }
  
  .content {
    .title-span {
      cursor: pointer;
      transition: color 0.3s;
      
      &:hover {
        color: #409eff;
      }
    }
    
    .pagination {
      margin-top: 20px;
      text-align: center;
    }
  }
}
</style>