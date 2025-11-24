import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Edit',
    component: () => import(`./pages/Edit/Index.vue`),
    meta: { requiresAuth: true } // 需要登录才能访问
  },
  {
    path: '/index',
    redirect: '/',
    meta: { requiresAuth: true } // 需要登录才能访问
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import(`./pages/auth/Login.vue`)
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import(`./pages/auth/Register.vue`)
  },
  {
    path: '/user-management',
    name: 'UserManagement',
    component: () => import(`./pages/UserManagement.vue`),
    meta: { requiresAuth: true, requiresAdmin: true } // 需要管理员权限
  },
  {
    path: '/doc/zh',
    component: () => import(`./pages/Doc.vue`)
  }
]

const router = new VueRouter({
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')

  // 检查是否需要认证
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!currentUser) {
      // 没有登录，重定向到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    } else if (
      to.path === '/' &&
      !currentUser.isAdmin &&
      currentUser.mindMapPermission !== 1
    ) {
      // 普通用户没有导图权限，不能访问思维导图页面
      alert('您没有导图权限，请联系管理员开通')
      next('/login')
    } else if (
      to.matched.some(record => record.meta.requiresAdmin) &&
      !currentUser.isAdmin
    ) {
      // 需要管理员权限但用户不是管理员
      next('/')
    } else {
      // 已登录且权限足够
      next()
    }
  } else {
    // 不需要认证的路由
    next()
  }
})

export default router
