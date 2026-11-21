export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_FALLBACK = 'user';
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,28}[a-z0-9])?$/i;
function stripEdgeSeparators(value) {
    return value.replace(/^[-_.]+/, '').replace(/[-_.]+$/, '');
}
export function buildUsernameBase(email) {
    const localPart = (email || '').trim().split('@')[0] ?? '';
    const withoutPlusTag = localPart.split('+')[0] ?? '';
    const normalized = withoutPlusTag
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/[-_.]{2,}/g, '-');
    const truncated = stripEdgeSeparators(normalized.slice(0, USERNAME_MAX_LENGTH));
    return truncated || USERNAME_FALLBACK;
}
export function buildUsernameWithSuffix(base, suffix) {
    const suffixText = String(suffix);
    const maxBaseLength = Math.max(1, USERNAME_MAX_LENGTH - suffixText.length);
    const truncatedBase = stripEdgeSeparators(base.slice(0, maxBaseLength)) ||
        USERNAME_FALLBACK.slice(0, maxBaseLength);
    return `${truncatedBase}${suffixText}`;
}
export async function generateUsername(email, isTaken) {
    const base = buildUsernameBase(email);
    for (let index = 1; index <= 10000; index++) {
        const candidate = index === 1 ? base : buildUsernameWithSuffix(base, index);
        if (!(await isTaken(candidate)))
            return candidate;
    }
    throw new Error('Không thể tạo tên định danh duy nhất');
}
export function isUsernameDuplicateKeyError(error) {
    if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) {
        return false;
    }
    return ('keyPattern' in error &&
        typeof error.keyPattern === 'object' &&
        error.keyPattern !== null &&
        'username' in error.keyPattern);
}
//# sourceMappingURL=username.util.js.map