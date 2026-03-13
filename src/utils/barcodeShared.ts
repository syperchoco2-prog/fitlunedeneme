const SUPPORTED_GTIN_LENGTHS = new Set([8, 12, 13, 14]);

export function sanitizeBarcode(input: string): string {
  return input.replace(/[^\d]/g, '');
}

export function isSupportedBarcodeLength(barcode: string): boolean {
  return SUPPORTED_GTIN_LENGTHS.has(barcode.length);
}

export function calculateGtinCheckDigit(body: string): number {
  const digits = body.replace(/[^\d]/g, '').split('').reverse();
  const sum = digits.reduce((total, digit, index) => {
    const weight = index % 2 === 0 ? 3 : 1;
    return total + Number(digit) * weight;
  }, 0);

  return (10 - (sum % 10)) % 10;
}

export function isValidBarcode(input: string): boolean {
  const barcode = sanitizeBarcode(input);
  if (!isSupportedBarcodeLength(barcode)) {
    return false;
  }

  const body = barcode.slice(0, -1);
  const checkDigit = Number(barcode.slice(-1));
  return Number.isInteger(checkDigit) && calculateGtinCheckDigit(body) === checkDigit;
}

export function normalizeLooseText(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim();
}

export function tokenizeLooseText(input: string): string[] {
  return normalizeLooseText(input)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
}

export function measureNameSimilarity(left: string, right: string): number {
  const leftTokens = new Set(tokenizeLooseText(left));
  const rightTokens = new Set(tokenizeLooseText(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : overlap / union;
}

export function normalizeBrand(input?: string | null): string {
  return normalizeLooseText(input ?? '').replace(/\s+/g, '');
}

export function parseQuantityValue(input?: string | null): { value: number; unit: 'g' | 'ml' } | null {
  if (!input) {
    return null;
  }

  const normalized = input.toLocaleLowerCase('tr-TR').replace(',', '.');
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|lt|l|ml|cl)\b/);
  if (!match) {
    return null;
  }

  let value = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (unit === 'kg') value *= 1000;
  if (unit === 'l' || unit === 'lt') value *= 1000;
  if (unit === 'cl') value *= 10;

  return {
    value,
    unit: unit === 'ml' || unit === 'l' || unit === 'lt' || unit === 'cl' ? 'ml' : 'g',
  };
}

export function quantitiesAreClose(left?: string | null, right?: string | null, toleranceRatio = 0.1): boolean {
  const leftValue = parseQuantityValue(left);
  const rightValue = parseQuantityValue(right);

  if (!leftValue || !rightValue) {
    return false;
  }

  if (leftValue.unit !== rightValue.unit) {
    return false;
  }

  const maxValue = Math.max(leftValue.value, rightValue.value);
  const diffRatio = Math.abs(leftValue.value - rightValue.value) / maxValue;
  return diffRatio <= toleranceRatio;
}
