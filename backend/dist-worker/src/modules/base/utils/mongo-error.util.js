export function isDuplicateKeyError(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
//# sourceMappingURL=mongo-error.util.js.map