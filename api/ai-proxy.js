import { createClient } from "@supabase/supabase-js";

// 初始化Supabase客户端
const supabaseUrl = process.env.VUE_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.VUE_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 简单的解密函数（需要根据实际加密方式调整）
function decryptApiKey(encryptedKey) {
  // TODO: 实现真正的解密逻辑
  // 目前假设密钥是base64编码的，实际项目中需要使用真正的加密/解密
  try {
    return Buffer.from(encryptedKey, "base64").toString("utf8");
  } catch (e) {
    console.warn("解密失败，返回原始值:", e);
    return encryptedKey;
  }
}

// 从数据库获取AI配置
async function getAiConfigById(configId) {
  try {
    console.log("正在查询AI配置:", { configId: "[HIDDEN]" });

    const { data, error } = await supabase
      .from("ai_provider_configs")
      .select("api_endpoint, model_name, api_key_encrypted")
      .eq("id", configId)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("数据库查询错误:", error);
      throw new Error(`获取AI配置失败: ${error.message}`);
    }

    if (!data) {
      throw new Error("未找到指定的AI配置");
    }

    console.log("成功获取AI配置:", {
      hasApiEndpoint: !!data.api_endpoint,
      hasModelName: !!data.model_name,
      hasApiKey: !!data.api_key_encrypted,
    });

    return data;
  } catch (error) {
    console.error("获取AI配置时出错:", error);
    throw error;
  }
}

export default async function handler(req, res) {
  // 设置CORS头部
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // 处理预检请求
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 检测部署环境（通过环境变量手动设置）
  const IS_VERCEL_DEPLOYED = process.env.VUE_APP_IS_VERCEL_DEPLOYED !== "false"; // 默认true，只有明确设置为'false'才是本地

  console.log("环境检测:", {
    IS_VERCEL_DEPLOYED,
    VUE_APP_IS_VERCEL_DEPLOYED: process.env.VUE_APP_IS_VERCEL_DEPLOYED,
    isLocalEnv: process.env.VUE_APP_IS_VERCEL_DEPLOYED === "false",
  });

  try {
    const { api, headers, data, providerType, userId, configId, aiPayload } =
      req.body;

    console.log("收到AI代理请求:", {
      api,
      providerType,
      userId: userId ? "[HIDDEN]" : "undefined",
      configId: configId ? "[HIDDEN]" : "undefined",
      headers: headers
        ? Object.keys(headers).map(
            (key) =>
              `${key}: ${headers[key] ? (key.toLowerCase().includes("authorization") ? "[HIDDEN]" : "[PRESENT]") : "[MISSING]"}`,
          )
        : "undefined",
      hasData: !!data,
      hasAiPayload: !!aiPayload,
    });

    // 支持两种调用方式：
    // 1. 旧方式：直接提供 api, headers, data
    // 2. 新方式：提供 configId, userId, aiPayload（从数据库获取配置）

    let finalApi = api;
    let finalHeaders = headers;
    let finalData = data;

    // 根据环境决定使用哪种方式
    if (!api && !data && configId && aiPayload && userId) {
      if (IS_VERCEL_DEPLOYED) {
        // 🚀 Vercel部署环境：使用新方式（数据库配置）
        console.log("Vercel环境：使用新方式从数据库获取AI配置...", {
          configId: "[HIDDEN]",
        });

        try {
          // 1. 根据configId查询数据库获取完整AI配置
          const config = await getAiConfigById(configId);

          // 2. 解密API密钥
          const decryptedApiKey = decryptApiKey(config.api_key_encrypted);

          // 3. 构建完整的请求参数
          finalApi = config.api_endpoint;
          finalHeaders = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${decryptedApiKey}`,
          };
          finalData = {
            model: config.model_name,
            ...aiPayload,
          };

          console.log("Vercel环境：成功使用数据库配置:", {
            api: finalApi,
            model: config.model_name,
            hasHeaders: !!finalHeaders,
            hasData: !!finalData,
            messagesCount: finalData.messages?.length,
          });
        } catch (dbError) {
          console.error("Vercel环境：从数据库获取AI配置失败:", dbError);
          return res.status(500).json({
            error: "获取AI配置失败",
            details: dbError.message,
          });
        }
      } else {
        // 💻 本地开发环境：拒绝新方式调用，强制使用旧方式
        console.log("本地环境：拒绝新方式调用，请使用旧方式 (ai.js)");
        return res.status(400).json({
          error: "本地开发环境请使用旧方式调用",
          details: "本地调试应该使用 ai.js 的直接调用方式，而不是通过代理",
          suggestion:
            "请确保前端检测到本地环境时使用 ai.js 而不是 supabase-api.js",
        });
      }
    }

    // 验证最终参数
    if (!finalApi || !finalData) {
      return res.status(400).json({
        error: "缺少必要参数: (api, data) 或 (configId, userId, aiPayload)",
        received: {
          api: !!finalApi,
          headers: !!finalHeaders,
          data: !!finalData,
          configId: !!configId,
          userId: !!userId,
          aiPayload: !!aiPayload,
        },
      });
    }

    // 验证用户认证（通过请求头获取）
    const requestUserId = req.headers["x-user-id"] || userId;
    const requestConfigId = req.headers["x-config-id"] || configId;

    if (!requestUserId) {
      return res.status(401).json({
        error: "未提供用户身份认证",
        details: "请求必须包含有效的用户ID",
      });
    }

    console.log("用户认证信息:", {
      userId: requestUserId,
      configId: requestConfigId,
      hasAuthHeader: !!headers?.Authorization,
    });

    // 确保使用HTTPS
    const secureApi = finalApi.replace(/^http:\/\//, "https://");
    console.log("使用安全API地址:", secureApi);

    // 处理API密钥认证
    finalHeaders = { ...finalHeaders };

    // 检查Authorization头是否存在
    if (!finalHeaders["Authorization"]) {
      return res.status(401).json({
        error: "认证失败：缺少Authorization头",
        details: "请求必须包含有效的API密钥",
      });
    }

    // 如果检测到占位符密钥，尝试从环境变量获取真实密钥
    if (finalHeaders["Authorization"].includes("PLACEHOLDER_KEY")) {
      console.log("检测到占位符密钥，尝试从环境变量获取真实密钥...");

      // 根据提供商类型获取真实的API密钥
      let realApiKey = null;

      if (providerType) {
        // 尝试从环境变量获取特定提供商的API密钥
        const envKey = `AI_API_KEY_${providerType.toUpperCase()}`;
        realApiKey = process.env[envKey];

        if (!realApiKey) {
          // 尝试使用通用的密钥环境变量
          realApiKey = process.env[`AI_${providerType.toUpperCase()}_KEY`];
        }
      }

      // 如果仍未找到密钥但有configId，尝试使用configId相关的环境变量
      if (!realApiKey && requestConfigId) {
        const envKey = `AI_CONFIG_${requestConfigId.toUpperCase()}_KEY`;
        realApiKey = process.env[envKey];
      }

      // 如果找到了真正的API密钥，用它替换占位符
      if (realApiKey) {
        finalHeaders["Authorization"] = `Bearer ${realApiKey}`;
        console.log("成功使用环境变量中的API密钥");
      } else {
        // 检查是否有一个默认的API密钥
        if (process.env.DEFAULT_AI_API_KEY) {
          finalHeaders["Authorization"] =
            `Bearer ${process.env.DEFAULT_AI_API_KEY}`;
          console.log("使用默认API密钥");
        } else {
          console.error("无法获取有效的API密钥，请求失败");
          return res.status(401).json({
            error: "认证失败：无法获取有效的API密钥",
            details: "请检查环境变量配置或联系管理员",
          });
        }
      }
    } else {
      // 如果不是占位符密钥，验证密钥格式
      if (!finalHeaders["Authorization"].startsWith("Bearer ")) {
        return res.status(401).json({
          error: "认证失败：无效的Authorization格式",
          details: 'Authorization头必须以"Bearer "开头',
        });
      }
      console.log("使用前端提供的API密钥");
    }

    const response = await fetch(secureApi, {
      method: "POST",
      headers: {
        ...finalHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finalData),
    });

    console.log("AI API响应状态:", response.status);

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Could not read error response");
      console.error(
        "AI API错误响应:",
        response.status,
        response.statusText,
        errorText.substring(0, 500),
      );
      return res.status(response.status).json({
        error: `AI API请求失败: ${response.status} ${response.statusText}`,
        details: errorText,
      });
    }

    // 检查内容类型
    const contentType = response.headers.get("content-type") || "";
    console.log("响应内容类型:", contentType);

    if (
      contentType.includes("text/plain") ||
      contentType.includes("text/event-stream")
    ) {
      // 流式响应
      console.log("处理流式响应...");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("流式响应完成");
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
        res.end();
      } catch (streamError) {
        console.error("流式响应处理错误:", streamError);
        if (!res.headersSent) {
          res
            .status(500)
            .json({ error: "流式响应处理失败: " + streamError.message });
        }
      }
    } else {
      // 普通JSON响应
      console.log("处理JSON响应...");
      const result = await response.json();
      res.json(result);
    }
  } catch (error) {
    console.error("AI代理服务器错误:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: `代理服务器错误: ${error.message}`,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
}
