/**
 * Production Environment
 * Used for: Live production deployment
 * 
 * SECURITY NOTE:
 * - Never commit real API keys to this file
 * - Use environment variables injected by CI/CD
 * - All sensitive values should be passed via process.env
 */

export default {
  // App Configuration
  APP_KEY: 'impact-prod-app',
  
  // API Configuration
  // These MUST be provided via environment variables in production
  API_KEY: process.env.PROD_API_KEY || '',
  User_API_KEY: process.env.PROD_USER_API_KEY || '',
  API_PATH: '/api/prod',
  
  // Domain Configuration
  DOMAIN: process.env.PROD_DOMAIN || 'impact.com',
  DOMAIN_ROOT: process.env.PROD_DOMAIN_ROOT || 'impact.com',
  BACKEND_DOMAIN: process.env.PROD_BACKEND_URL || 'https://api.impact.com',
  BUCKET_URL: process.env.PROD_BUCKET_URL || 'https://cdn.impact.com',
  
  // Feature Flags - Optimized for production
  FEATURE_FLAGS: {
    DARK_MODE: true,
    BETA_FEATURES: false,
    ANALYTICS: true,
    CACHE_ENABLED: true,
    SERVICE_WORKER: true
  },
  
  // Debugging - Disabled in production
  DEBUG: false,
  LOG_LEVEL: 'error',
  
  // Third-party Services
  SPELLCHECK_HOST: process.env.PROD_SPELLCHECK_HOST || 'https://spell.impact.com',
  KIT_CLOSE_TASK_URL: process.env.PROD_KIT_URL || 'https://kit.impact.com/close',
  // SECURITY: Token must be provided via environment variable
  KIT_CLOSE_TASK_TOKEN: process.env.PROD_KIT_TOKEN || '',

  // Supabase Configuration
  VITE_SUPABASE_URL: 'https://ouluxdinlqcbvlmvncot.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
  
  // Security
  IS_LIVE_DOMAIN: true,
  IS_UAT_DOMAIN: false,
  IS_DEV_DOMAIN: false
};
