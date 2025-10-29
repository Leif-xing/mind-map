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
  content TEXT NOT NULL,  -- 存储思维导图的TEXT数据，使用lz-string的utf16加密字符串
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

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

-- 1. 标签表
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#cccccc',         -- 可选字段，用于前端展示
  is_public boolean DEFAULT false,      -- 是否公共标签
  owner_id uuid REFERENCES users(id), -- 私人标签归属用户
  created_at timestamptz DEFAULT now(),
  UNIQUE (name, owner_id)               -- 避免同一用户重复标签
);

-- 2. mind_maps 与标签的多对多关联表
CREATE TABLE mindmap_tags (
  mindmap_id uuid REFERENCES mind_maps(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (mindmap_id, tag_id)
);

-- 3. 开启 RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE mindmap_tags ENABLE ROW LEVEL SECURITY;

-- 插入常用思维导图标签
INSERT INTO tags (name, color, is_public, owner_id)
VALUES
  ('学习', '#4caf50', true, NULL),
  ('工作', '#2196f3', true, NULL),
  ('项目', '#ff9800', true, NULL),
  ('待办', '#9c27b0', true, NULL),
  ('灵感', '#e91e63', true, NULL),
  ('阅读', '#3f51b5', true, NULL),
  ('目标', '#009688', true, NULL),
  ('计划', '#795548', true, NULL),
  ('总结', '#607d8b', true, NULL),
  ('会议', '#f44336', true, NULL);