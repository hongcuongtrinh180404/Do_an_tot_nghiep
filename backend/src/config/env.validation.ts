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
});

