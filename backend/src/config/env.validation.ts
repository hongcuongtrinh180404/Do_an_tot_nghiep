import Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(8000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_NAME: Joi.string().default('THC_DATN_API'),
  API_PREFIX: Joi.string().default('api/v1'),

  // MongoDB Configuration
  MONGODB_URI: Joi.string().required().messages({
    'any.required': 'MONGODB_URI is required to connect to MongoDB',
  }),
  MONGODB_DB_NAME: Joi.string().default('thc_datn'),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_SECRET is required for security',
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_REFRESH_SECRET is required for refresh token security',
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),

  // Gmail SMTP / Email Verification
  SMTP_HOST: Joi.string().allow('').default('smtp.gmail.com'),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  GMAIL_USER: Joi.string().allow('').default(''),
  GMAIL_APP_PASSWORD: Joi.string().allow('').default(''),
  MAIL_FROM_NAME: Joi.string().allow('').default('Mindly - Map Your Mind'),
  MAIL_FROM_EMAIL: Joi.string().allow('').default(''),
  FRONTEND_URL: Joi.string().default('http://localhost:3000'),

  // CORS & Rate Limiting
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),

  // MinIO Storage Configuration
  MINIO_ENDPOINT: Joi.string().default('localhost'),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_USE_SSL: Joi.boolean().default(false),
  MINIO_ROOT_USER: Joi.string().default('minioadmin'),
  MINIO_ROOT_PASSWORD: Joi.string().default('minioadmin123'),
  MINIO_BUCKET_NAME: Joi.string().default('thc-datn-media'),
  MINIO_PUBLIC_URL: Joi.string().default('http://localhost:9000'),

  // AssemblyAI Configuration
  ASSEMBLYAI_API_KEY: Joi.string().allow('').default(''),

  // FFmpeg Configuration
  FFMPEG_PATH: Joi.string().allow('').default(''),

  // Gemini AI Configuration
  GEMINI_MODEL: Joi.string().default('gemini-3.8-flash'),
  GEMINI_FALLBACK_MODEL: Joi.string().default('gemini-3.5-flash-lite'),
  GEMINI_API_KEY: Joi.string().allow('').default(''),
  GEMINI_API_KEY_1: Joi.string().allow('').default(''),
  GEMINI_API_KEY_2: Joi.string().allow('').default(''),
  GEMINI_API_KEY_3: Joi.string().allow('').default(''),
  GEMINI_API_KEY_4: Joi.string().allow('').default(''),
  GEMINI_API_KEY_5: Joi.string().allow('').default(''),
  GEMINI_API_KEY_6: Joi.string().allow('').default(''),

  // River AI Configuration (OpenAI Compatible)
  AI_PRIMARY_PROVIDER: Joi.string().valid('RIVER', 'GEMINI').default('RIVER'),
  RIVER_BASE_URL: Joi.string().default('https://api.river.ai/v1'),
  RIVER_TIMEOUT_MS: Joi.number().default(60000),
  RIVER_MODEL_1: Joi.string().default('deepseek-ai/DeepSeek-V4.1-Flash'),
  RIVER_MODEL_2: Joi.string().allow('').default('deepseek-ai/DeepSeek-V3'),
  RIVER_MODEL: Joi.string().allow('').default('deepseek-ai/DeepSeek-V4.1-Flash'),
  RIVER_API_KEY: Joi.string().allow('').default(''),
  RIVER_API_KEY_1: Joi.string().allow('').default(''),
  RIVER_API_KEY_2: Joi.string().allow('').default(''),
  RIVER_API_KEY_3: Joi.string().allow('').default(''),

  // SePay Payment Configuration
  SEPAY_BANK_ACCOUNT: Joi.string().trim().pattern(/^[A-Z0-9]{1,64}$/i).when('NODE_ENV', {
    is: 'production', then: Joi.required(), otherwise: Joi.allow('').default(''),
  }),
  SEPAY_BANK_CODE: Joi.string().trim().uppercase().pattern(/^[A-Z0-9]{2,20}$/).when('NODE_ENV', {
    is: 'production', then: Joi.required(), otherwise: Joi.allow('').default(''),
  }),
  SEPAY_ACCOUNT_NAME: Joi.string().trim().when('NODE_ENV', {
    is: 'production', then: Joi.required(), otherwise: Joi.allow('').default(''),
  }),
  SEPAY_WEBHOOK_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production', then: Joi.required(), otherwise: Joi.allow('').default(''),
  }),
  SEPAY_PAYMENT_PREFIX: Joi.string().trim().uppercase().valid('MD').default('MD'),
  SEPAY_PAYMENT_EXPIRE_MINUTES: Joi.number().integer().min(1).max(1440).default(15),
});

