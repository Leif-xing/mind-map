# 思绪思维导图 - Cloudflare 部署指南

## 方法1：Cloudflare Pages（推荐）

### 选项A：通过Git仓库自动部署

1. **推送代码到Git仓库**

   ```bash
   git add .
   git commit -m "Add Cloudflare deployment files"
   git push origin main
   ```

2. **在Cloudflare Dashboard中设置**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 点击 "Pages" → "Create a project"
   - 选择 "Connect to Git"
   - 选择你的Git提供商（GitHub/GitLab等）
   - 选择这个仓库

3. **配置构建设置**

   ```
   Build command: cd web && npm install && npm run build && cd .. && node build-for-cloudflare.js
   Build output directory: cloudflare-build
   Root directory: /
   ```

4. **环境变量设置**（如果需要）
   ```
   NODE_VERSION: 18
   NPM_VERSION: 8
   ```

### 选项B：直接上传构建文件

1. **使用已生成的构建文件**
   - 构建文件已经在 `cloudflare-build` 目录中准备好

2. **在Cloudflare Dashboard中上传**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 点击 "Pages" → "Create a project"
   - 选择 "Upload assets"
   - 上传 `cloudflare-build` 目录中的所有文件

3. **配置自定义域名**（可选）
   - 在Pages项目设置中添加自定义域名
   - 配置DNS记录指向Cloudflare

## 方法2：Cloudflare Workers Sites

如果你想要更多的控制权，可以使用Cloudflare Workers：

1. **安装Wrangler CLI**

   ```bash
   npm install -g wrangler
   ```

2. **登录Cloudflare**

   ```bash
   wrangler login
   ```

3. **创建wrangler.toml配置文件**（已为你创建，见下文）

4. **部署**
   ```bash
   wrangler pages publish cloudflare-build
   ```

## 优化建议

### 1. 性能优化

- 已配置的 `_headers` 文件包含了缓存策略
- 静态资源将被缓存1年
- 启用了安全头部

### 2. SEO优化

- 考虑添加meta标签到index.html
- 配置sitemap.xml

### 3. 监控

- 使用Cloudflare Analytics监控访问情况
- 设置Web Vitals监控

## 故障排除

### 常见问题

1. **构建失败**
   - 确保Node.js版本兼容（推荐18+）
   - 检查依赖项是否正确安装

2. **静态资源404**
   - 检查路径配置是否正确
   - 确认\_redirects文件配置

3. **SPA路由问题**
   - \_redirects文件已配置SPA fallback
   - 确保上传了该文件

## 更新部署

### 自动部署

如果使用Git连接，每次推送代码都会自动触发部署。

### 手动部署

重新运行构建脚本并上传：

```bash
node build-for-cloudflare.js
# 然后在Cloudflare Dashboard中重新上传文件
```

## 成本

- Cloudflare Pages免费套餐包括：
  - 无限静态请求
  - 无限带宽
  - 全球CDN
  - 自动HTTPS
  - 每月500次构建
