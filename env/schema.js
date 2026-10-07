/**
 * Environment Configuration Schema
 * Defines validation rules for environment variables
 */

export const REQUIRED_FIELDS = [
  'APP_KEY',
  'API_KEY',
  'API_PATH'
];

export const OPTIONAL_FIELDS = [
  'User_API_KEY',
  'SPELLCHECK_HOST',
  'KIT_CLOSE_TASK_URL',
  'KIT_CLOSE_TASK_TOKEN',
  'DEBUG',
  'LOG_LEVEL',
  'BUCKET_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

export const FEATURE_FLAGS_SCHEMA = {
  DARK_MODE: { type: 'boolean', default: true },
  BETA_FEATURES: { type: 'boolean', default: false },
  ANALYTICS: { type: 'boolean', default: true },
  CACHE_ENABLED: { type: 'boolean', default: true },
  SERVICE_WORKER: { type: 'boolean', default: false }
};

export const ENVIRONMENTS = {
  LOCAL: 'local',
  DEV: 'dev',
  UAT: 'uat',
  STAGE: 'stage',
  PROD: 'prod'
};

export const DOMAIN_PATTERNS = {
  [ENVIRONMENTS.LOCAL]: ['localhost', '127.0.0.1', '.local'],
  [ENVIRONMENTS.DEV]: ['.dev.', 'dev.'],
  [ENVIRONMENTS.UAT]: ['.uat.', 'uat.'],
  [ENVIRONMENTS.STAGE]: ['.stage.', 'staging.'],
  [ENVIRONMENTS.PROD]: [] // Live domains don't have patterns
};

export function validateEnvConfig(config, envName) {
  const errors = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!config[field] || config[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate feature flags
  if (config.FEATURE_FLAGS) {
    for (const [key, schema] of Object.entries(FEATURE_FLAGS_SCHEMA)) {
      const value = config.FEATURE_FLAGS[key];
      if (value !== undefined && typeof value !== schema.type) {
        errors.push(`FEATURE_FLAGS.${key} must be of type ${schema.type}`);
      }
    }
  }

  // Validate environment name
  if (!Object.values(ENVIRONMENTS).includes(envName)) {
    errors.push(`Invalid environment: ${envName}. Must be one of: ${Object.values(ENVIRONMENTS).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
