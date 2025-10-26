# Supabase 配置指南

本指南将帮助您在 Supabase 中创建所需的数据库表并配置项目。

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com/)
2. 创建一个新项目
3. 记下以下信息：
   - 项目 URL (例如: https://your-project.supabase.co)
   - 项目密钥 (anon key 和 service_role key)

## 2. 创建数据库表

### 方法一：使用 SQL 编辑器

1. 登录到 Supabase 控制台
2. 进入 "SQL 编辑器" 选项卡
3. 将以下 SQL 代码粘贴到编辑器中并执行：

```sql
-- 启用UUID扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  mind_map_permission INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 思维导图表
CREATE TABLE mind_maps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,  -- 存储思维导图的JSON数据
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE 'plpgsql';

-- 为表添加更新时间戳触发器
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mind_maps_updated_at 
  BEFORE UPDATE ON mind_maps 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_mind_maps_user_id ON mind_maps(user_id);
CREATE INDEX idx_mind_maps_created_at ON mind_maps(created_at);
```

### 方法二：使用 supabase-schema.sql 文件

您可以直接使用项目中的 `supabase-schema.sql` 文件中的内容。

## 3. 配置环境变量

创建 `.env` 文件（不要提交到版本控制）：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
VUE_APP_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
VUE_APP_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
VUE_APP_SUPABASE_ENABLED=true
```

替换 `your_supabase_project_url` 和 `your_supabase_anon_key` 为您的实际值。

注意：使用 `NEXT_PUBLIC_` 前缀是为了确保环境变量在客户端可用，这是 Supabase 推荐的格式。

## 4. 更新项目配置

1. 修改 `.env.example` 文件以反映实际的环境变量名称
2. 确保您的应用正确读取这些环境变量

## 5. 配置 RLS (行级安全性 - 可选)

为了安全性，您可以启用 RLS：

```sql
-- 为 users 表启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 为 mind_maps 表启用 RLS
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mind maps" ON mind_maps
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mind maps" ON mind_maps
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mind maps" ON mind_maps
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mind maps" ON mind_maps
  FOR DELETE USING (auth.uid() = user_id);
```

## 6. 测试连接

1. 确保环境变量设置正确
2. 启动应用并测试用户注册和登录功能
3. 验证思维导图的保存和加载功能是否正常

## 注意事项

1. 密码处理：在实际应用中，密码应在后端进行哈希处理
2. 安全性：确保 RLS 策略正确配置以保护数据隐私
3. 错误处理：确保前端正确处理 API 错误