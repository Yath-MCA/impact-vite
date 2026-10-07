/**
 * UAT Environment
 * Used for: User Acceptance Testing
 */

export default {
  // App Configuration
  APP_KEY: 'impact-uat-app',
  
  // API Configuration
  API_KEY: process.env.UAT_API_KEY || 'uat-api-key-placeholder',
  User_API_KEY: process.env.UAT_USER_API_KEY || 'uat-user-api-key',
  API_PATH: '/api/uat',
  
  // Domain Configuration
  DOMAIN: process.env.UAT_DOMAIN || 'uat.impact.com',
  DOMAIN_ROOT: process.env.UAT_DOMAIN_ROOT || 'uat.impact.com',
  BACKEND_DOMAIN: process.env.UAT_BACKEND_URL || 'https://uat-api.impact.com',
  BUCKET_URL: process.env.UAT_BUCKET_URL || 'https://uat-cdn.impact.com',
  
  // Feature Flags
  FEATURE_FLAGS: {
    DARK_MODE: true,
    BETA_FEATURES: true,
    ANALYTICS: true,
    CACHE_ENABLED: true,
    SERVICE_WORKER: true
  },
  
  // Debugging
  DEBUG: false,
  LOG_LEVEL: 'info',
  
  // Third-party Services
  SPELLCHECK_HOST: process.env.UAT_SPELLCHECK_HOST || 'https://uat-spell.impact.com',
  KIT_CLOSE_TASK_URL: process.env.UAT_KIT_URL || 'https://uat-kit.impact.com/close',
  KIT_CLOSE_TASK_TOKEN: process.env.UAT_KIT_TOKEN || 'uat-kit-token-placeholder',

  // Supabase Configuration
  VITE_SUPABASE_URL: 'https://ouluxdinlqcbvlmvncot.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'REPLACE_IN_SECRETS_FILE',
  
  // Security
  IS_LIVE_DOMAIN: false,
  IS_UAT_DOMAIN: true,
  IS_DEV_DOMAIN: false
};
