/**
 * Staging Environment
 * Used for: Pre-production testing
 */

export default {
  // App Configuration
  APP_KEY: 'impact-stage-app',
  
  // API Configuration
  API_KEY: process.env.STAGE_API_KEY || 'stage-api-key-placeholder',
  User_API_KEY: process.env.STAGE_USER_API_KEY || 'stage-user-api-key',
  API_PATH: '/api/stage',
  
  // Domain Configuration
  DOMAIN: process.env.STAGE_DOMAIN || 'stage.impact.com',
  DOMAIN_ROOT: process.env.STAGE_DOMAIN_ROOT || 'stage.impact.com',
  BACKEND_DOMAIN: process.env.STAGE_BACKEND_URL || 'https://stage-api.impact.com',
  BUCKET_URL: process.env.STAGE_BUCKET_URL || 'https://stage-cdn.impact.com',
  
  // Feature Flags
  FEATURE_FLAGS: {
    DARK_MODE: true,
    BETA_FEATURES: false,
    ANALYTICS: true,
    CACHE_ENABLED: true,
    SERVICE_WORKER: true
  },
  
  // Debugging
  DEBUG: false,
  LOG_LEVEL: 'warn',
  
  // Third-party Services
  SPELLCHECK_HOST: process.env.STAGE_SPELLCHECK_HOST || 'https://stage-spell.impact.com',
  KIT_CLOSE_TASK_URL: process.env.STAGE_KIT_URL || 'https://stage-kit.impact.com/close',
  KIT_CLOSE_TASK_TOKEN: process.env.STAGE_KIT_TOKEN || 'stage-kit-token-placeholder',

  // Supabase Configuration
  VITE_SUPABASE_URL: 'https://ouluxdinlqcbvlmvncot.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'REPLACE_IN_SECRETS_FILE',
  
  // Security
  IS_LIVE_DOMAIN: false,
  IS_UAT_DOMAIN: false,
  IS_DEV_DOMAIN: false
};
