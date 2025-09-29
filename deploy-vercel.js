const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 开始部署到Vercel...');

try {
  // 1. 构建项目
  console.log('📦 构建项目...');
  execSync('cd web && npm run vercel-build', { stdio: 'inherit' });
  
  // 2. 检查是否安装了Vercel CLI
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    console.log('✅ Vercel CLI已安装');
    
    // 尝试使用Vercel CLI部署
    console.log('🌍 部署到Vercel...');
    execSync('vercel --prod', { stdio: 'inherit' });
    console.log('🎉 部署成功！');
    
  } catch (error) {
    console.log('⚠️  Vercel CLI未安装或未登录');
    console.log('请选择以下选项之一：');
    console.log('');
    console.log('选项1 - 安装Vercel CLI并部署：');
    console.log('  npm install -g vercel');
    console.log('  vercel login');
    console.log('  vercel --prod');
    console.log('');
    console.log('选项2 - 通过GitHub自动部署：');
    console.log('  1. 推送代码到GitHub: git push origin main');
    console.log('  2. 访问 https://vercel.com/');
    console.log('  3. 点击 "Add New..." → "Project"');
    console.log('  4. 导入你的GitHub仓库: Leif-xing/mind-map');
    console.log('  5. Vercel会自动检测项目配置并部署');
    console.log('');
    console.log('✅ 构建文件已准备完成，位于 vercel-build 目录');
  }
  
} catch (error) {
  console.error('❌ 部署失败:', error.message);
  process.exit(1);
}