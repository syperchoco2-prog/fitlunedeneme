import type { BarcodeProduct, DeveloperBarcodeCaptureResponse, Meal } from '../types';
import { generateId } from './helpers';
import { isValidBarcode, sanitizeBarcode } from './barcodeShared';
import { resolveNutriScore } from './nutritionScoring';
import { supabase } from './supabaseClient';

export interface BarcodeMealOptions {
  date: string;
  mealType: string;
  /** Gram cinsinden porsiyon (besin değerleri bu sayı / 100 ile ölçeklenir) */
  grams: number;
  energyKcal?: number;
}

function roundNutrition(value: number): number {
  return Number(value.toFixed(value < 10 ? 1 : 0));
}

function toNullableNumber(value: number | null): number | null {
  return value == null ? null : Number(value);
}

function toMealNumber(value: number | null, multiplier: number): number {
  return roundNutrition((value ?? 0) * multiplier);
}

type BarcodeRow = {
  barcode: string;
  product_name: string;
  image_url: string | null;
  brand: string | null;
  product_category: string | null;
  scoring_category: BarcodeProduct['scoringCategory'] | null;
  processing_level: BarcodeProduct['processingLevel'] | null;
  has_added_sugar: boolean | null;
  has_sweetener: boolean | null;
  data_quality: BarcodeProduct['dataQuality'] | null;
  energy_kcal: number | null;
  fat: number | null;
  saturated_fat: number | null;
  carbs: number | null;
  protein: number | null;
  sugar: number | null;
  salt: number | null;
  fiber: number | null;
  serving_size_g: number | null;
  nutriscore: string | null;
  ingredients: string | null;
  allergens: string[] | null;
  nutrition_basis: string;
};

type SubmissionRow = {
  id: string;
};

type ApiErrorPayload = {
  message?: string;
};

type RequestError = Error & {
  statusCode?: number;
  fallbackAllowed?: boolean;
};

type DeveloperCaptureRpcResult = {
  id: string;
  duplicate: boolean;
  status: DeveloperBarcodeCaptureResponse['status'];
};

const DEV_CAPTURE_CACHE_PREFIX = 'fitlune:dev-capture:';
const BARCODE_EXISTS_IN_PRODUCTS_ERROR = 'barcode_exists_in_products';
const BARCODE_EXISTS_IN_SUBMISSIONS_ERROR = 'barcode_exists_in_submissions';
const BARCODE_EXISTS_IN_PRODUCTS_MESSAGE = 'Bu barkod zaten ürün listesinde kayıtlı.';
const BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE = 'Bu barkod zaten inceleme listesinde mevcut.';

function createRequestError(
  message: string,
  options: { statusCode?: number; fallbackAllowed?: boolean } = {},
): RequestError {
  const error = new Error(message) as RequestError;
  error.statusCode = options.statusCode;
  error.fallbackAllowed = options.fallbackAllowed;
  return error;
}

function isDuplicateSubmissionStatus(
  value: unknown,
): value is Extract<DeveloperBarcodeCaptureResponse['status'], 'already_submitted' | 'already_exists'> {
  return value === 'already_submitted' || value === 'already_exists';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return '';
}

function normalizeBarcodeSubmissionError(
  error: unknown,
  fallbackMessage: string,
): Error {
  const message = toErrorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes(BARCODE_EXISTS_IN_PRODUCTS_ERROR)) {
    return new Error(BARCODE_EXISTS_IN_PRODUCTS_MESSAGE);
  }

  if (
    normalized.includes(BARCODE_EXISTS_IN_SUBMISSIONS_ERROR) ||
    normalized.includes('barcode_product_submissions_barcode_unique') ||
    normalized.includes('duplicate key value')
  ) {
    return new Error(BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE);
  }

  return new Error(message || fallbackMessage);
}

function isApiNotFoundPayload(payload: ApiErrorPayload | null): boolean {
  if (!payload?.message) {
    return false;
  }

  const normalized = payload.message.toLowerCase();
  return normalized.includes('onaylı ürün bulunamadı') || normalized.includes('urun bulunamadi');
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  return await Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      window.setTimeout(
        () => reject(createRequestError(timeoutMessage, { fallbackAllowed: true })),
        timeoutMs,
      );
    }),
  ]);
}

function mapBarcodeRowToProduct(row: BarcodeRow): BarcodeProduct {
  const product: BarcodeProduct = {
    barcode: row.barcode,
    productName: row.product_name,
    imageUrl: row.image_url ?? undefined,
    brand: row.brand ?? undefined,
    productCategory: row.product_category ?? undefined,
    scoringCategory: row.scoring_category ?? undefined,
    processingLevel: row.processing_level ?? undefined,
    hasAddedSugar: row.has_added_sugar,
    hasSweetener: row.has_sweetener,
    dataQuality: row.data_quality ?? undefined,
    energyKcal: toNullableNumber(row.energy_kcal),
    fat: toNullableNumber(row.fat),
    saturatedFat: toNullableNumber(row.saturated_fat),
    carbs: toNullableNumber(row.carbs),
    protein: toNullableNumber(row.protein),
    sugar: toNullableNumber(row.sugar),
    salt: toNullableNumber(row.salt),
    fiber: toNullableNumber(row.fiber),
    servingSizeG: row.serving_size_g != null ? Number(row.serving_size_g) : undefined,
    nutriscore: (row.nutriscore as BarcodeProduct['nutriscore']) ?? undefined,
    ingredients: row.ingredients ?? undefined,
    allergens: row.allergens ?? undefined,
    nutritionBasis: 'per100g',
  };

  const resolvedNutriScore = resolveNutriScore(product);
  if (!product.nutriscore && resolvedNutriScore.grade) {
    return { ...product, nutriscore: resolvedNutriScore.grade };
  }

  return product;
}

function isNullableNutritionNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isBarcodeProductPayload(value: unknown): value is BarcodeProduct {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BarcodeProduct>;
  return (
    typeof candidate.barcode === 'string' &&
    typeof candidate.productName === 'string' &&
    isNullableNutritionNumber(candidate.energyKcal) &&
    isNullableNutritionNumber(candidate.fat) &&
    isNullableNutritionNumber(candidate.saturatedFat) &&
    isNullableNutritionNumber(candidate.carbs) &&
    isNullableNutritionNumber(candidate.protein) &&
    isNullableNutritionNumber(candidate.sugar) &&
    isNullableNutritionNumber(candidate.salt) &&
    isNullableNutritionNumber(candidate.fiber) &&
    candidate.nutritionBasis === 'per100g'
  );
}

async function fetchApiJsonWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 3_500,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
      keepalive: true,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

function writeDeveloperCaptureCache(barcode: string, id: string) {
  try {
    window.localStorage.setItem(`${DEV_CAPTURE_CACHE_PREFIX}${barcode}`, id);
  } catch {
    // Sessiz geç
  }
}

async function fetchBarcodeProductFromTable(barcode: string): Promise<BarcodeProduct> {
  const { data, error } = await withTimeout(
    supabase
      .from('barcode_products')
      .select(`
        barcode,
        product_name,
        image_url,
        brand,
        product_category,
        scoring_category,
        processing_level,
        has_added_sugar,
        has_sweetener,
        data_quality,
        energy_kcal,
        fat,
        saturated_fat,
        carbs,
        protein,
        sugar,
        salt,
        fiber,
        serving_size_g,
        nutriscore,
        ingredients,
        allergens,
        nutrition_basis
      `)
      .eq('barcode', barcode)
      .maybeSingle<BarcodeRow>(),
    3_500,
    'Supabase tablo sorgusu zaman asimina ugradi.',
  );

  if (error) {
    throw new Error('Barkod verisi okunamadi.');
  }

  if (!data) {
    throw new Error('not_found');
  }

  return mapBarcodeRowToProduct(data);
}

async function fetchBarcodeProductFromApi(barcode: string): Promise<BarcodeProduct> {
  let response: Response;
  try {
    response = await fetchApiJsonWithTimeout(`/api/barcodes/${encodeURIComponent(barcode)}`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createRequestError('API istegi zaman asimina ugradi.', { fallbackAllowed: true });
    }

    throw createRequestError('API istegi basarisiz oldu.', { fallbackAllowed: true });
  }

  const payload = (await response.json().catch(() => null)) as
    | (BarcodeProduct & ApiErrorPayload)
    | ApiErrorPayload
    | null;

  if (response.status === 404) {
    if (isApiNotFoundPayload(payload)) {
      throw new Error('not_found');
    }

    throw createRequestError(payload?.message || 'Barkod lookup API bulunamadi.', {
      statusCode: response.status,
      fallbackAllowed: true,
    });
  }

  if (!response.ok) {
    throw createRequestError(payload?.message || 'Barkod verisi okunamadi.', {
      statusCode: response.status,
      fallbackAllowed: response.status >= 500 || response.status === 404,
    });
  }

  if (!isBarcodeProductPayload(payload)) {
    throw createRequestError('Barkod yaniti gecersiz.', { fallbackAllowed: true });
  }

  const resolvedNutriScore = resolveNutriScore(payload);
  if (!payload.nutriscore && resolvedNutriScore.grade) {
    return { ...payload, nutriscore: resolvedNutriScore.grade };
  }

  return payload;
}

async function fetchBarcodeProductFromRpc(barcode: string): Promise<BarcodeProduct> {
  const { data, error } = await withTimeout(
    supabase.rpc('get_barcode_product', { p_barcode: barcode }),
    3_500,
    'Supabase RPC barkod sorgusu zaman asimina ugradi.',
  );

  if (error) {
    throw new Error('Barkod verisi okunamadi.');
  }

  const rows = data as BarcodeRow[] | null;
  if (!rows || rows.length === 0) {
    throw new Error('not_found');
  }

  return mapBarcodeRowToProduct(rows[0]);
}

export async function fetchBarcodeProduct(input: string): Promise<BarcodeProduct> {
  const barcode = sanitizeBarcode(input);

  if (!isValidBarcode(barcode)) {
    throw new Error('Gecerli bir barkod numarasi girin.');
  }

  let lastError: Error | null = null;

  try {
    return await fetchBarcodeProductFromTable(barcode);
  } catch (error) {
    if (error instanceof Error && error.message === 'not_found') {
      throw error;
    }

    lastError = error instanceof Error ? error : new Error('Barkod verisi okunamadi.');
  }

  try {
    return await fetchBarcodeProductFromApi(barcode);
  } catch (error) {
    if (error instanceof Error && error.message === 'not_found') {
      throw error;
    }

    lastError = error instanceof Error ? error : lastError;
  }

  try {
    return await fetchBarcodeProductFromRpc(barcode);
  } catch (error) {
    if (error instanceof Error && error.message === 'not_found') {
      throw error;
    }

    throw lastError ?? (error instanceof Error ? error : new Error('Barkod verisi okunamadi.'));
  }
}

async function barcodeProductExistsDirect(barcode: string): Promise<boolean> {
  const { data, error } = await withTimeout(
    supabase
      .from('barcode_products')
      .select('barcode')
      .eq('barcode', barcode)
      .limit(1),
    3_500,
    'Barkod urun kontrolu zaman asimina ugradi.',
  );

  if (error) {
    throw new Error('Barkod urun kontrolu yapilamadi.');
  }

  const rows = (data ?? []) as Array<{ barcode: string }>;
  return Boolean(rows[0]?.barcode);
}

async function findExistingSubmissionIdDirect(barcode: string): Promise<string | null> {
  const { data, error } = await withTimeout(
    supabase
      .from('barcode_product_submissions')
      .select('id')
      .eq('barcode', barcode)
      .order('created_at', { ascending: false })
      .limit(1),
    3_500,
    'Barkod submission kontrolu zaman asimina ugradi.',
  );

  if (error) {
    throw new Error('Barkod submission kontrolu yapilamadi.');
  }

  const rows = (data ?? []) as SubmissionRow[];
  return rows[0]?.id ?? null;
}

async function insertMissingBarcodeSubmissionDirect(
  barcode: string,
  productName: string,
  reviewNote?: string,
): Promise<string> {
  const { data, error } = await withTimeout(
    supabase
      .from('barcode_product_submissions')
      .insert({
        barcode,
        product_name: productName.trim(),
        nutrition_basis: 'per100g',
        status: 'pending',
        review_note: reviewNote ?? null,
      })
      .select('id')
      .single<SubmissionRow>(),
    4_000,
    'Supabase bildirim istegi zaman asimina ugradi.',
  );

  if (error) {
    throw normalizeBarcodeSubmissionError(error, 'Bildirim gonderilemedi.');
  }

  if (!data?.id) {
    throw new Error('Bildirim yaniti gecersiz.');
  }

  return data.id;
}

export async function reportMissingBarcode(barcode: string, productName: string): Promise<string> {
  const clean = sanitizeBarcode(barcode);

  if (!isValidBarcode(clean)) {
    throw new Error('Gecerli bir barkod numarasi girin.');
  }

  try {
    if (await barcodeProductExistsDirect(clean)) {
      throw new Error(BARCODE_EXISTS_IN_PRODUCTS_MESSAGE);
    }

    if (await findExistingSubmissionIdDirect(clean)) {
      throw new Error(BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE);
    }
  } catch (error) {
    const normalizedError = normalizeBarcodeSubmissionError(error, 'Bildirim gonderilemedi.');
    if (
      normalizedError.message === BARCODE_EXISTS_IN_PRODUCTS_MESSAGE ||
      normalizedError.message === BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE
    ) {
      throw normalizedError;
    }
  }

  try {
    return await insertMissingBarcodeSubmissionDirect(clean, productName);
  } catch (error) {
    const normalizedError = normalizeBarcodeSubmissionError(error, 'Bildirim gonderilemedi.');
    if (
      normalizedError.message === BARCODE_EXISTS_IN_PRODUCTS_MESSAGE ||
      normalizedError.message === BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE
    ) {
      throw normalizedError;
    }

    const { data, error: rpcError } = await withTimeout(
      supabase.rpc('report_missing_barcode', {
        p_barcode: clean,
        p_product_name: productName.trim(),
      }),
      4_000,
      'Supabase bildirim istegi zaman asimina ugradi.',
    );

    if (rpcError) {
      throw normalizeBarcodeSubmissionError(rpcError, 'Bildirim gonderilemedi.');
    }

    if (typeof data !== 'string' || !data) {
      throw new Error('Bildirim yaniti gecersiz.');
    }

    return data;
  }
}

async function queueDeveloperBarcodeCaptureDirect(
  barcode: string,
): Promise<DeveloperBarcodeCaptureResponse> {
  const existingProduct = await fetchBarcodeProductFromTable(barcode).catch((error) => {
    if (error instanceof Error && error.message === 'not_found') {
      return null;
    }

    throw error;
  });

  if (existingProduct) {
    return {
      id: barcode,
      duplicate: true,
      status: 'already_exists',
    };
  }

  const submissionId = await findExistingSubmissionIdDirect(barcode);
  if (submissionId) {
    writeDeveloperCaptureCache(barcode, submissionId);
    return {
      id: submissionId,
      duplicate: true,
      status: 'already_submitted',
    };
  }

  try {
    const id = await insertMissingBarcodeSubmissionDirect(
      barcode,
      `[DEV_CAPTURE] ${barcode}`,
      'developer_capture',
    );
    writeDeveloperCaptureCache(barcode, id);

    return {
      id,
      duplicate: false,
      status: 'queued',
    };
  } catch (error) {
    const normalizedError = normalizeBarcodeSubmissionError(
      error,
      'Developer barkod kuyruguna eklenemedi.',
    );

    if (normalizedError.message === BARCODE_EXISTS_IN_PRODUCTS_MESSAGE) {
      return {
        id: barcode,
        duplicate: true,
        status: 'already_exists',
      };
    }

    if (normalizedError.message === BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE) {
      const duplicateId = await findExistingSubmissionIdDirect(barcode);
      if (duplicateId) {
        writeDeveloperCaptureCache(barcode, duplicateId);
        return {
          id: duplicateId,
          duplicate: true,
          status: 'already_submitted',
        };
      }
    }

    throw normalizedError;
  }
}

async function queueDeveloperBarcodeCaptureFromApi(
  barcode: string,
): Promise<DeveloperBarcodeCaptureResponse> {
  let response: Response;
  try {
    response = await fetchApiJsonWithTimeout(
      '/api/dev/barcodes/captures',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode }),
      },
      4_500,
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createRequestError('Developer API zaman asimina ugradi.', { fallbackAllowed: true });
    }

    throw createRequestError('Developer API erisilemedi.', { fallbackAllowed: true });
  }

  const payload = (await response.json().catch(() => null)) as
    | (Partial<DeveloperBarcodeCaptureResponse> & { message?: string })
    | null;

  if (!response.ok) {
    throw createRequestError(payload?.message || 'Developer barkod kuyruguna eklenemedi.', {
      statusCode: response.status,
      fallbackAllowed: response.status >= 500 || response.status === 404,
    });
  }

  if (
    !payload ||
    typeof payload.id !== 'string' ||
    typeof payload.duplicate !== 'boolean' ||
    (payload.status !== 'queued' &&
      payload.status !== 'already_submitted' &&
      payload.status !== 'already_exists')
  ) {
    throw createRequestError('Developer barkod yaniti gecersiz.', { fallbackAllowed: true });
  }

  return {
    id: payload.id,
    duplicate: payload.duplicate,
    status: payload.status,
  };
}

async function queueDeveloperBarcodeCaptureViaRpcFallback(
  barcode: string,
): Promise<DeveloperBarcodeCaptureResponse> {
  const { data, error } = await withTimeout(
    supabase.rpc('queue_developer_barcode', {
      p_barcode: barcode,
    }),
    4_000,
    'Developer RPC zaman asimina ugradi.',
  );

  if (error) {
    throw new Error(error.message || 'Developer barkod kuyruguna eklenemedi.');
  }

  const result = data as Partial<DeveloperCaptureRpcResult> | null;
  if (
    !result ||
    typeof result.id !== 'string' ||
    typeof result.duplicate !== 'boolean' ||
    (result.status !== 'queued' &&
      result.status !== 'already_submitted' &&
      result.status !== 'already_exists')
  ) {
    throw new Error('Developer barkod yaniti gecersiz.');
  }

  if (result.status === 'queued' || result.status === 'already_submitted') {
    writeDeveloperCaptureCache(barcode, result.id);
  }

  return {
    id: result.id,
    duplicate: result.duplicate,
    status: result.status,
  };
}

export async function queueDeveloperBarcodeCapture(
  barcode: string,
): Promise<DeveloperBarcodeCaptureResponse> {
  const clean = sanitizeBarcode(barcode);

  if (!isValidBarcode(clean)) {
    throw new Error('Gecerli bir barkod numarasi girin.');
  }

  let lastError: Error | null = null;

  try {
    return await queueDeveloperBarcodeCaptureDirect(clean);
  } catch (error) {
    lastError = error instanceof Error ? error : new Error('Developer barkod kuyruguna eklenemedi.');
  }

  try {
    return await queueDeveloperBarcodeCaptureFromApi(clean);
  } catch (error) {
    const requestError = error as RequestError;
    if (requestError.fallbackAllowed === false) {
      throw requestError;
    }

    lastError = requestError?.message ? requestError : lastError;
  }

  try {
    return await queueDeveloperBarcodeCaptureViaRpcFallback(clean);
  } catch (error) {
    throw lastError ?? (error instanceof Error ? error : new Error('Developer barkod kuyruguna eklenemedi.'));
  }
}

const mealEmojiMap: Record<string, string> = {
  Kahvaltı: '🍳',
  'Öğle Yemeği': '🥗',
  'Akşam Yemeği': '🍽️',
  Atıştırmalık: '🥨',
};

export function gramsLabel(grams: number): string {
  return `${grams} g / ml`;
}

export { isValidBarcode };

export function barcodeProductToMeal(product: BarcodeProduct, options: BarcodeMealOptions): Meal {
  const multiplier = options.grams / 100;
  const finalCalories = options.energyKcal ?? toMealNumber(product.energyKcal, multiplier);

  return {
    id: generateId(),
    name: options.mealType,
    calories: roundNutrition(finalCalories),
    protein: toMealNumber(product.protein, multiplier),
    carbs: toMealNumber(product.carbs, multiplier),
    fat: toMealNumber(product.fat, multiplier),
    items: `${product.productName} (${gramsLabel(options.grams)})`,
    time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    emoji: mealEmojiMap[options.mealType] || '📦',
    date: options.date,
    source: 'barcode',
    barcode: product.barcode,
    imageUrl: product.imageUrl,
    servingLabel: gramsLabel(options.grams),
  };
}



