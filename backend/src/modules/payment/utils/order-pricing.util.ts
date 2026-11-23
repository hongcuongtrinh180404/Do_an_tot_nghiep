/** The same VND snapshot calculation is used by checkout and historical imports. */
export function calculateOrderFinancials(price: number, original: number | null | undefined, platformRate: number) {
  if (!Number.isSafeInteger(price) || price <= 0) throw new Error('Paid course price must be a positive safe integer VND');
  if (!Number.isFinite(platformRate) || platformRate < 0 || platformRate > 100) throw new Error('Invalid platform commission rate');
  const originalPrice = Number.isSafeInteger(original) && (original ?? 0) > price ? original! : price;
  const platformEarnings = Math.round(price * platformRate / 100);
  return {
    amount: price, originalPrice, discountAmount: originalPrice - price,
    platformCommissionRate: platformRate, platformEarnings,
    instructorCommissionRate: Number((1 - platformRate / 100).toFixed(4)),
    instructorEarnings: price - platformEarnings,
  };
}
