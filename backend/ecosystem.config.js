module.exports = {
  apps: [
    {
      name: "holy-ai-backend",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      error_file: "../logs/holy-ai-backend-error.log",
      out_file: "../logs/holy-ai-backend-out.log",
      merge_logs: true,
    },
  ],
};
