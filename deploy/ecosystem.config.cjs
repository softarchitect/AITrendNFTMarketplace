module.exports = {
  apps: [
    {
      name: "trendmint-backend",
      cwd: "/var/www/trendmint/backend",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "4000"
      }
    },
    {
      name: "trendmint-frontend",
      cwd: "/var/www/trendmint/frontend",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      }
    }
  ]
};
