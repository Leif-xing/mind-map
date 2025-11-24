import { createClient } from '@supabase/supabase-js'

// 环境变量，这些应该在实际部署时通过环境变量提供
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VUE_APP_SUPABASE_URL ||
  'https://your-project.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VUE_APP_SUPABASE_ANON_KEY ||
  'your-anon-key'

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 添加连接状态检查
supabase.auth.onAuthStateChange((event, session) => {
  // 可以在开发阶段启用，但在生产环境中应移除或使用更安全的日志
  // console.log('Supabase Auth State Change:', event, session && { event, user_id: session.user?.id });
})

export default supabase
