# 🚀 上传到你的GitHub仓库指南

## 📋 操作步骤

### 1. 在GitHub上创建新仓库

请访问：https://github.com/Leif-xing

1. 点击 **"New"** 或 **"+"** 按钮创建新仓库
2. 输入仓库名称：`mind-map`
3. 添加描述：`一个功能强大的在线思维导图工具`
4. 选择 **Public**（推荐）或 **Private**
5. **不要**勾选"Add a README file"、".gitignore"或"license"（因为我们已经有了）
6. 点击 **"Create repository"**

### 2. 推送代码到你的仓库

仓库创建完成后，在本地执行以下命令：

```bash
# 确认远程仓库已更改
git remote -v

# 推送所有分支和标签到你的仓库
git push -u origin main

# 如果有其他分支，也推送过去
git push origin --all
git push origin --tags
```

### 3. 验证上传成功

上传完成后，访问：https://github.com/Leif-xing/mind-map

你应该能看到：

- ✅ 完整的项目文件结构
- ✅ 提交历史记录
- ✅ README.md 显示项目介绍
- ✅ 所有优化后的文件和配置

## 🎯 接下来的操作

### 设置仓库属性

1. 在仓库页面点击 **Settings**
2. 在 **About** 部分添加：
   - 描述：`一个功能强大的在线思维导图工具，支持多种布局和主题`
   - 网站：部署后的URL
   - 主题：`mind-map`, `vue`, `javascript`, `visualization`

### 设置GitHub Pages（可选）

1. 在 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 或者直接使用 Cloudflare Pages 部署

### 保护主分支（推荐）

1. 在 Settings → Branches
2. 添加分支保护规则
3. 要求Pull Request审查

## 🔄 如果需要保持与原仓库同步

如果你想要从原仓库获取更新：

```bash
# 添加原仓库为upstream
git remote add upstream https://github.com/wanglin2/mind-map.git

# 获取原仓库更新
git fetch upstream

# 合并更新到你的main分支
git checkout main
git merge upstream/main

# 推送更新到你的仓库
git push origin main
```

## 📝 注意事项

1. **许可证合规**：原项目使用MIT许可证，允许fork和修改，请保留LICENSE文件
2. **致谢原作者**：建议在README中添加对原作者的致谢
3. **版本管理**：建议使用语义化版本号管理你的修改版本

## 🎨 自定义你的版本

你可以：

- 修改应用标题和描述
- 更换logo和favicon
- 添加你的联系方式
- 自定义主题和样式
- 添加新功能

所有这些修改都不会影响原项目，因为这是你的独立仓库。
