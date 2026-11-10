// VULN-4 : secrets codés en dur dans le code (valeurs de TEST, pas de secret réel).
module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: 'super-secret-jwt-key-2026',
  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    user: 'jobboard',
    password: 'jobboard_pass_123',
    database: 'jobboard'
  }
};
