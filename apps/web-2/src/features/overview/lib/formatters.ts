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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatWholeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(value);
}
