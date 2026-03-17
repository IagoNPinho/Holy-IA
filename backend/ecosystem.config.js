module.exports = {
  apps: [
    {
      name: "holy-ai-backend",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        INBOX_LITE_MODE: "true",
        WHATSAPP_PROVIDER: "waha",
        WAHA_BASE_URL: "http://127.0.0.1:3000",
        WAHA_API_KEY: "8bf936bf39444f8fa5ca30ebeb97f166",
        WAHA_SESSION: "default",
        WAHA_MESSAGES_ENDPOINT: "/api/messages",
        WAHA_MESSAGES_METHOD: "POST"
      },
      error_file: "../logs/holy-ai-backend-error.log",
      out_file: "../logs/holy-ai-backend-out.log",
      merge_logs: true,
      max_memory_restart: "500M",
    },
  ],
};
