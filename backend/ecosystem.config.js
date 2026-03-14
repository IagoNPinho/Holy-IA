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
        INBOX_LITE_MODE: "true"
      },
      error_file: "../logs/holy-ai-backend-error.log",
      out_file: "../logs/holy-ai-backend-out.log",
      merge_logs: true,
      max_memory_restart: "500M",
    },
  ],
};
