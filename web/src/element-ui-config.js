import { Message } from 'element-ui';

// 动态创建CSS样式来设置消息提示的位置和对齐方式
const addCustomMessageStyles = () => {
  const styleId = 'custom-message-styles';
  if (document.getElementById(styleId)) return; // 避免重复添加

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    .custom-message {
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
      margin-left: 0 !important;
      top: 100px !important; /* 距离顶部一定距离，但居中显示 */
    }
    
    .el-message {
      z-index: 2000 !important;
    }
  `;
  document.head.appendChild(style);
};

// 添加自定义样式
addCustomMessageStyles();

// 创建自定义的消息处理函数，只允许特定的消息通过
const createCustomMessageHandler = (originalMethod) => {
  return (options) => {
    const messageText = typeof options === 'string' ? options : (options && options.message) || '';
    
    // 只有包含"思维导图保存成功"的消息才显示
    if (messageText.includes('思维导图保存成功')) {
      // 添加自定义类和位置参数
      if (typeof options === 'string') {
        options = {
          message: options,
          customClass: 'custom-message',
          offset: 100, // 设置偏移量到页面上方一定距离
          showClose: false,
          duration: 3000
        };
      } else {
        options = {
          ...options,
          customClass: 'custom-message',
          offset: 100, // 设置偏移量到页面上方一定距离
        };
      }
      
      // 调用原始方法显示消息
      return originalMethod(options);
    } else {
      // 对于其他消息，记录到控制台但不显示
      console.log('消息提示已被过滤:', messageText);
      return null;
    }
  };
};

// 保存原始方法
const originalSuccess = Message.success;
const originalError = Message.error;
const originalWarning = Message.warning;
const originalInfo = Message.info;

// 重写 Message 方法以只显示特定消息
Message.success = createCustomMessageHandler(originalSuccess);
Message.error = createCustomMessageHandler(originalError);
Message.warning = createCustomMessageHandler(originalWarning);
Message.info = createCustomMessageHandler(originalInfo);

export default Message;