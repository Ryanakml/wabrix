export function formatSignedPercent(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  const prefix = normalized > 0 ? '+' : '';
  return `${prefix}${normalized.toFixed(1)}%`;
}

export function getTrendDirection(value: number) {
  if (value > 0) return 'up' as const;
  if (value < 0) return 'down' as const;
  return 'neutral' as const;
}

export function formatCurrency(amount: number, currency: 'USD' | 'IDR' = 'USD') {
  const absoluteAmount = Math.abs(amount);
  const maximumFractionDigits =
    absoluteAmount > 0 && absoluteAmount < 0.01
      ? 6
      : absoluteAmount > 0 && absoluteAmount < 1
        ? 4
        : 2;
  const minimumFractionDigits =
    absoluteAmount > 0 && absoluteAmount < 1 ? Math.min(4, maximumFractionDigits) : 2;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount);
}

export function formatWholeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value);
}
