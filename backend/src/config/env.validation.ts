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

  // Cloudinary Storage Configuration
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),
  CLOUDINARY_FOLDER: Joi.string().default('thc_datn/avatars'),
});

