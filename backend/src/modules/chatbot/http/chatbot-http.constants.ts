export const CHATBOT_HTTP_RATE_LIMIT = 5;
export const CHATBOT_HTTP_RATE_TTL_MS = 60000;
export const CHATBOT_HTTP_TIMEOUT_MS = 40000;
export const CHATBOT_HTTP_RATE_STORAGE = Symbol('CHATBOT_HTTP_RATE_STORAGE');
export const CHATBOT_HTTP_EXPOSED_HEADERS = [
  'X-Request-Id',
  'Retry-After',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
];
