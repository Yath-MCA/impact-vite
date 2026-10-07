/**
 * Development Environment
 * Used for: dev server, development branch deployments
 */

export default {
  // App Configuration
  APP_KEY: 'impact-dev-app',
  
  // API Configuration
  API_KEY: process.env.DEV_API_KEY || 'dev-api-key-placeholder',
  User_API_KEY: process.env.DEV_USER_API_KEY || 'dev-user-api-key',
  API_PATH: '/api/dev',
  
  // Domain Configuration
  DOMAIN: process.env.DEV_DOMAIN || 'dev.impact.com',
  DOMAIN_ROOT: process.env.DEV_DOMAIN_ROOT || 'dev.impact.com',
  BACKEND_DOMAIN: process.env.DEV_BACKEND_URL || 'https://dev-api.impact.com',
  BUCKET_URL: process.env.DEV_BUCKET_URL || 'https://dev-cdn.impact.com',
  
  // Feature Flags
  FEATURE_FLAGS: {
    DARK_MODE: true,
    BETA_FEATURES: true,
    ANALYTICS: false,
    CACHE_ENABLED: true,
    SERVICE_WORKER: false
  },
  
  // Debugging
  DEBUG: true,
  LOG_LEVEL: 'debug',
  
  // Third-party Services
  SPELLCHECK_HOST: process.env.DEV_SPELLCHECK_HOST || 'https://dev-spell.impact.com',
  KIT_CLOSE_TASK_URL: process.env.DEV_KIT_URL || 'https://dev-kit.impact.com/close',
  KIT_CLOSE_TASK_TOKEN: process.env.DEV_KIT_TOKEN || 'dev-kit-token-placeholder',

  // Supabase Configuration
  VITE_SUPABASE_URL: 'https://ouluxdinlqcbvlmvncot.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'REPLACE_IN_SECRETS_FILE',
  
  // Security
  IS_LIVE_DOMAIN: false,
  IS_UAT_DOMAIN: false,
  IS_DEV_DOMAIN: true
};
