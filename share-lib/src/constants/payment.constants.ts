export const PAYMENT_CONSTANTS = {
  ORDER_PREFIX: 'MD',
  ORDER_SUFFIX_LENGTH: 10,
  ORDER_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  ORDER_CODE_PATTERN: /^MD[A-Z0-9]{10}$/,
  // Read-only compatibility for orders issued before the format change.
  LEGACY_ORDER_CODE_PATTERN: /^MD\d{5}$/,
} as const;
