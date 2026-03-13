import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PendingBarcodeReviewInput } from '../src/types.js';
import { isValidBarcode, sanitizeBarcode } from '../src/utils/barcodeShared.js';
import {
  createBarcodeSubmission,
  getBarcodeSubmissionForEdit,
  getBarcodeProduct,
  isServerSupabaseConfigured,
  queueDeveloperBarcodeCapture,
  updateBarcodeSubmissionName,
} from './supabase.js';

class RequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'RequestError';
    this.statusCode = statusCode;
  }
}

function parseRequiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new RequestError(400, `${label} zorunludur.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new RequestError(400, `${label} zorunludur.`);
  }

  if (trimmed.length > maxLength) {
    throw new RequestError(400, `${label} çok uzun.`);
  }

  return trimmed;
}

function parseOptionalText(value: unknown, maxLength: number): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new RequestError(400, 'Geçersiz metin alanı gönderildi.');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new RequestError(400, 'Metin alanı çok uzun.');
  }

  return trimmed;
}

function parseOptionalHttpsUrl(value: unknown): string | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new RequestError(400, 'Görsel bağlantısı metin olmalıdır.');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > 2048) {
    throw new RequestError(400, 'Görsel bağlantısı çok uzun.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new RequestError(400, 'Geçerli bir görsel bağlantısı girin.');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new RequestError(400, 'Görsel bağlantısı https ile başlamalıdır.');
  }

  return parsedUrl.toString();
}

function parseNonNegativeNumber(value: unknown, label: string): number {
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.replace(',', '.'))
      : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new RequestError(400, `${label} 0 veya daha büyük bir sayı olmalıdır.`);
  }

  return Number(numericValue.toFixed(2));
}

function parseOptionalNonNegativeNumber(value: unknown, label: string): number | null {
  if (value == null || value === '') {
    return null;
  }

  return parseNonNegativeNumber(value, label);
}

function parseOptionalBoolean(value: unknown): boolean | null | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new RequestError(400, 'Mantıksal alan true veya false olmalıdır.');
  }

  return value;
}

function parseOptionalEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T | undefined {
  if (value == null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new RequestError(400, `${label} geçersiz.`);
  }

  return value as T;
}

function normalizeSubmissionPayload(payload: Partial<PendingBarcodeReviewInput>): PendingBarcodeReviewInput {
  const barcode = sanitizeBarcode(payload.barcode ?? '');
  if (!isValidBarcode(barcode)) {
    throw new RequestError(400, 'Geçerli bir barkod numarası girin.');
  }

  return {
    barcode,
    productName: parseRequiredText(payload.productName, 'Ürün adı', 200),
    imageUrl: parseOptionalHttpsUrl(payload.imageUrl),
    brand: parseOptionalText(payload.brand, 120),
    productCategory: parseOptionalText(payload.productCategory, 120),
    scoringCategory: parseOptionalEnum(
      payload.scoringCategory,
      ['water', 'plain_dairy', 'sweetened_dairy', 'cheese', 'fat_nuts_seeds', 'beverage', 'general_food'] as const,
      'Skor kategorisi',
    ),
    processingLevel: parseOptionalEnum(
      payload.processingLevel,
      ['minimally_processed', 'processed', 'ultra_processed'] as const,
      'İşlenme seviyesi',
    ),
    hasAddedSugar: parseOptionalBoolean(payload.hasAddedSugar),
    hasSweetener: parseOptionalBoolean(payload.hasSweetener),
    dataQuality: parseOptionalEnum(
      payload.dataQuality,
      ['verified_label', 'partial_label', 'estimated', 'legacy'] as const,
      'Veri kalitesi',
    ),
    energyKcal: parseOptionalNonNegativeNumber(payload.energyKcal, 'Enerji'),
    fat: parseOptionalNonNegativeNumber(payload.fat, 'Yağ'),
    saturatedFat: parseOptionalNonNegativeNumber(payload.saturatedFat, 'Doymuş yağ'),
    carbs: parseOptionalNonNegativeNumber(payload.carbs, 'Karbonhidrat'),
    protein: parseOptionalNonNegativeNumber(payload.protein, 'Protein'),
    sugar: parseOptionalNonNegativeNumber(payload.sugar, 'Şeker'),
    salt: parseOptionalNonNegativeNumber(payload.salt, 'Tuz'),
    fiber: parseOptionalNonNegativeNumber(payload.fiber, 'Lif'),
  };
}

function parseBarcodeInput(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RequestError(400, 'Geçerli bir barkod numarası girin.');
  }

  const barcode = sanitizeBarcode(value);
  if (!isValidBarcode(barcode)) {
    throw new RequestError(400, 'Geçerli bir barkod numarası girin.');
  }

  return barcode;
}

function parseUuidInput(value: unknown): string {
  if (typeof value !== 'string') {
    throw new RequestError(400, 'Geçerli bir kayıt kimliği girin.');
  }

  const trimmed = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    throw new RequestError(400, 'Geçerli bir kayıt kimliği girin.');
  }

  return trimmed;
}

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const shouldServeDist = process.argv.includes('--serve-dist');
const portArgIndex = process.argv.findIndex((arg) => arg === '--port');
const port = portArgIndex >= 0 ? Number(process.argv[portArgIndex + 1]) || 3001 : 3001;
const devBarcodePageEnabled = process.env.VITE_ENABLE_DEV_BARCODE_PAGE === 'true';

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    supabaseConfigured: isServerSupabaseConfigured(),
    devBarcodePageEnabled,
  });
});

app.post('/api/barcodes/pending-review', async (request, response, next) => {
  try {
    const payload = normalizeSubmissionPayload(request.body as Partial<PendingBarcodeReviewInput>);
    const submission = await createBarcodeSubmission(payload);

    response.status(201).json({
      id: submission.id,
      message: 'Ürün önerisi inceleme kuyruğuna eklendi.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/dev/barcodes/captures', async (request, response, next) => {
  if (!devBarcodePageEnabled) {
    response.status(404).json({ message: 'İstenen API adresi bulunamadı.' });
    return;
  }

  try {
    const barcode = parseBarcodeInput((request.body as { barcode?: unknown } | undefined)?.barcode);
    const result = await queueDeveloperBarcodeCapture(barcode);
    response.status(result.status === 'queued' ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/dev/barcodes/submissions/:id', async (request, response, next) => {
  if (!devBarcodePageEnabled) {
    response.status(404).json({ message: 'İstenen API adresi bulunamadı.' });
    return;
  }

  try {
    const submissionId = parseUuidInput(request.params.id);
    const submission = await getBarcodeSubmissionForEdit(submissionId);

    if (!submission) {
      response.status(404).json({ message: 'İnceleme kaydı bulunamadı.' });
      return;
    }

    response.json(submission);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/dev/barcodes/submissions/:id', async (request, response, next) => {
  if (!devBarcodePageEnabled) {
    response.status(404).json({ message: 'İstenen API adresi bulunamadı.' });
    return;
  }

  try {
    const submissionId = parseUuidInput(request.params.id);
    const productName = parseRequiredText(
      (request.body as { productName?: unknown } | undefined)?.productName,
      'Ürün adı',
      200,
    );
    const updated = await updateBarcodeSubmissionName(submissionId, productName);

    response.json({
      id: updated.id,
      message: 'İnceleme ürün adı güncellendi.',
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/barcodes/:gtin', async (request, response, next) => {
  try {
    const barcode = sanitizeBarcode(request.params.gtin ?? '');
    if (!isValidBarcode(barcode)) {
      throw new RequestError(400, 'Geçerli bir barkod numarası girin.');
    }

    const product = await getBarcodeProduct(barcode);
    if (!product) {
      response.status(404).json({
        message: 'Bu barkod için onaylı ürün bulunamadı. İstersen ürün önerisi gönderebilirsin.',
      });
      return;
    }

    response.json(product);
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_request, response) => {
  response.status(404).json({ message: 'İstenen API adresi bulunamadı.' });
});

if (shouldServeDist) {
  app.use(express.static(distDir));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const statusCode = error instanceof RequestError ? error.statusCode : 500;

  if (!(error instanceof RequestError)) {
    console.error('[fitlune:api]', error);
  }

  response.status(statusCode).json({
    message: error instanceof Error ? error.message : 'Sunucuda beklenmeyen bir hata oluştu.',
  });
});

app.listen(port, () => {
  const modeLabel = shouldServeDist ? 'preview' : 'api';
  console.log(`[fitlune:${modeLabel}] http://localhost:${port}`);
});
