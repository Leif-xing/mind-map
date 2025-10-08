import { createClient } from '@supabase/supabase-js'

// 环境变量，这些应该在实际部署时通过环境变量提供
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VUE_APP_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VUE_APP_SUPABASE_ANON_KEY || 'your-anon-key'

// 调试信息
console.log('Supabase Config:', {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
});

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 添加连接状态检查
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase Auth State Change:', event, session);
});

export default supabase