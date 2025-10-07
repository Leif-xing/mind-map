<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'App',
  created() {
    // 检查用户是否已登录，如果是，则验证其权限
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    
    if (currentUser) {
      // 验证用户是否仍然存在于系统中
      const userExists = this.$store.state.users.find(u => 
        u.id === currentUser.id && u.username === currentUser.username
      )
      
      if (!userExists) {
        // 用户不存在了，清除登录状态
        localStorage.removeItem('currentUser')
      }
    }
  }
}
</script>

<style lang="less">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
}

.customScrollbar {
  &::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 7px;
    background-color: rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  &::-webkit-scrollbar-track {
    box-shadow: none;
    background: transparent;
    display: none;
  }
}

.el-dialog{
  border-radius: 10px;
}
</style>
