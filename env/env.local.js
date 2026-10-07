/**
 * Local Development Environment
 * Used for: localhost development
 *
 * ⚠️  SECRETS go in env.local.secrets.js  (git-ignored, never committed)
 *    Copy env.secrets.example.js → env.local.secrets.js and fill in real values.
 */

export default {
  // App Configuration
  APP_KEY: 'xmleditor',

  // API Configuration — real keys live in env.local.secrets.js
  API_KEY: 'REPLACE_IN_SECRETS_FILE',
  User_API_KEY: 'REPLACE_IN_SECRETS_FILE',
  API_PATH: 'http://localhost:8080/impactapinew/',

  // Domain Configuration
  DOMAIN: 'localhost',
  DOMAIN_ROOT: 'localhost:3000',
  BACKEND_DOMAIN: 'http://localhost:8080',
  BUCKET_URL: '/xmleditor/',

  // Feature Flags
  FEATURE_FLAGS: {
    DARK_MODE: true,
    BETA_FEATURES: true,
    ANALYTICS: false,
    CACHE_ENABLED: false,
    SERVICE_WORKER: false
  },

  // Debugging
  DEBUG: true,
  LOG_LEVEL: 'debug',

  // Third-party Services
  SPELLCHECK_HOST: 'http://localhost:5000',
  KIT_CLOSE_TASK_URL: 'http://localhost:7000/close',
  KIT_CLOSE_TASK_TOKEN: 'REPLACE_IN_SECRETS_FILE',

  // Supabase Configuration
  VITE_SUPABASE_URL: 'https://ouluxdinlqcbvlmvncot.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'REPLACE_IN_SECRETS_FILE',

  // Security (relaxed for local)
  IS_LIVE_DOMAIN: false,
  IS_UAT_DOMAIN: false,
  IS_DEV_DOMAIN: false,
  IS_LOCAL_DOMAIN: true,


  DEV_EMAIL: 'yasar.mohideen@newgen.co',
  DEV_PASSWORD: 'Impact@123'
};

