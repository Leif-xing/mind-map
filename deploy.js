const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 开始部署到Cloudflare...');

try {
  // 1. 构建项目
  console.log('📦 构建项目...');
  execSync('cd web && npm run build', { stdio: 'inherit' });
  
  // 2. 准备Cloudflare文件
  console.log('🔧 准备Cloudflare部署文件...');
  execSync('node build-for-cloudflare.js', { stdio: 'inherit' });
  
  // 3. 检查是否安装了wrangler
  try {
    execSync('wrangler --version', { stdio: 'pipe' });
    console.log('✅ Wrangler已安装');
    
    // 尝试使用wrangler部署
    console.log('🌍 部署到Cloudflare Pages...');
    execSync('wrangler pages publish cloudflare-build --project-name mind-map', { stdio: 'inherit' });
    console.log('🎉 部署成功！');
    
  } catch (error) {
    console.log('⚠️  Wrangler未安装或未登录');
    console.log('请选择以下选项之一：');
    console.log('');
    console.log('选项1 - 安装Wrangler CLI并部署：');
    console.log('  npm install -g wrangler');
    console.log('  wrangler login');
    console.log('  wrangler pages publish cloudflare-build --project-name mind-map');
    console.log('');
    console.log('选项2 - 手动上传到Cloudflare Pages：');
    console.log('  1. 访问 https://dash.cloudflare.com/');
    console.log('  2. 点击 Pages → Create a project → Upload assets');
    console.log('  3. 上传 cloudflare-build 目录中的所有文件');
    console.log('');
    console.log('✅ 构建文件已准备完成，位于 cloudflare-build 目录');
  }
  
} catch (error) {
  console.error('❌ 部署失败:', error.message);
  process.exit(1);
}