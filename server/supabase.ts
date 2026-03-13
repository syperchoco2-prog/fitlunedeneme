import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type {
  BarcodeProduct,
  DeveloperBarcodeCaptureResponse,
  DeveloperBarcodeSubmission,
  PendingBarcodeReviewInput,
} from '../src/types.js';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

type BarcodeProductRow = {
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
  nutriscore: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  ingredients: string | null;
  allergens: string[] | null;
  nutrition_basis: 'per100g';
};

type SubmissionIdRow = {
  id: string;
};

type BarcodeSubmissionRow = {
  id: string;
  barcode: string;
  product_name: string;
  status: DeveloperBarcodeSubmission['status'];
  review_note: string | null;
};

const BARCODE_EXISTS_IN_PRODUCTS_ERROR = 'barcode_exists_in_products';
const BARCODE_EXISTS_IN_SUBMISSIONS_ERROR = 'barcode_exists_in_submissions';
const SUBMISSION_NOT_FOUND_ERROR = 'submission_not_found';
const PRODUCT_NAME_TOO_SHORT_ERROR = 'product_name_too_short';
const PRODUCT_NAME_TOO_LONG_ERROR = 'product_name_too_long';
const BARCODE_EXISTS_IN_PRODUCTS_MESSAGE = 'Bu barkod zaten ürün listesinde kayıtlı.';
const BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE = 'Bu barkod zaten inceleme listesinde mevcut.';
const SUBMISSION_NOT_FOUND_MESSAGE = 'Bu kayit artik ana urun listesine aktarildigi icin duzenlenemiyor.';

function buildDeveloperCaptureSubmissionPayload(barcode: string) {
  return {
    barcode,
    product_name: `[DEV_CAPTURE] ${barcode}`,
    image_url: null,
    brand: null,
    product_category: null,
    scoring_category: null,
    processing_level: null,
    has_added_sugar: null,
    has_sweetener: null,
    data_quality: 'legacy' as const,
    energy_kcal: null,
    fat: null,
    saturated_fat: null,
    carbs: null,
    protein: null,
    sugar: null,
    salt: null,
    fiber: null,
    serving_size_g: null,
    ingredients: null,
    allergens: null,
    nutrition_basis: 'per100g' as const,
    review_note: 'developer_capture',
    status: 'pending' as const,
  };
}

function requireEnv(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} ortam değişkeni zorunludur.`);
  }
  return value;
}

// Timeout destekli fetch - her istek en fazla 10 saniye bekler
function fetchWithTimeout(url: string | URL | Request, options: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url as string, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

let supabase: SupabaseClient | null = null;
let cachedConfigError: Error | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabase) {
    return supabase;
  }

  if (cachedConfigError) {
    throw cachedConfigError;
  }

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL');
    const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: fetchWithTimeout,
        headers: { 'x-client-info': 'fitlune-server' },
      },
      db: {
        schema: 'public',
      },
    });

    return supabase;
  } catch {
    cachedConfigError = new Error('Sunucu Supabase yapilandirmasi eksik. SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
    throw cachedConfigError;
  }
}

export function isServerSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

// Retry wrapper - geçici ağ hatalarında otomatik yeniden dene
async function withRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === maxAttempts - 1;
      if (!isLastAttempt) {
        // Exponential backoff: 300ms, 600ms
        await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

function normalizeBarcodeSubmissionError(error: {
  message?: string;
  code?: string;
  details?: string | null;
} | null | undefined, fallbackMessage: string): Error {
  const message = error?.message ?? '';
  const normalized = `${message} ${error?.details ?? ''}`.toLowerCase();

  if (normalized.includes(BARCODE_EXISTS_IN_PRODUCTS_ERROR)) {
    return new Error(BARCODE_EXISTS_IN_PRODUCTS_MESSAGE);
  }

  if (
    normalized.includes(BARCODE_EXISTS_IN_SUBMISSIONS_ERROR) ||
    error?.code === '23505' ||
    normalized.includes('barcode_product_submissions_barcode_unique')
  ) {
    return new Error(BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE);
  }

  return new Error(message || fallbackMessage);
}

function normalizeSubmissionNameUpdateError(error: {
  message?: string;
  code?: string;
  details?: string | null;
} | null | undefined, fallbackMessage: string): Error {
  const message = error?.message ?? '';
  const normalized = `${message} ${error?.details ?? ''}`.toLowerCase();

  if (normalized.includes(SUBMISSION_NOT_FOUND_ERROR)) {
    return new Error(SUBMISSION_NOT_FOUND_MESSAGE);
  }

  if (normalized.includes(PRODUCT_NAME_TOO_SHORT_ERROR)) {
    return new Error('Urun adi bos birakilamaz.');
  }

  if (normalized.includes(PRODUCT_NAME_TOO_LONG_ERROR)) {
    return new Error('Urun adi 200 karakterden uzun olamaz.');
  }

  if (normalized.includes(BARCODE_EXISTS_IN_PRODUCTS_ERROR)) {
    return new Error(SUBMISSION_NOT_FOUND_MESSAGE);
  }

  return new Error(message || fallbackMessage);
}

function mapNullableNumber(value: number | null): number | null {
  return value == null ? null : Number(value);
}

function mapBarcodeRow(row: BarcodeProductRow): BarcodeProduct {
  return {
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
    energyKcal: mapNullableNumber(row.energy_kcal),
    fat: mapNullableNumber(row.fat),
    saturatedFat: mapNullableNumber(row.saturated_fat),
    carbs: mapNullableNumber(row.carbs),
    protein: mapNullableNumber(row.protein),
    sugar: mapNullableNumber(row.sugar),
    salt: mapNullableNumber(row.salt),
    fiber: mapNullableNumber(row.fiber),
    servingSizeG: row.serving_size_g ?? undefined,
    nutriscore: row.nutriscore ?? undefined,
    ingredients: row.ingredients ?? undefined,
    allergens: row.allergens ?? undefined,
    nutritionBasis: row.nutrition_basis,
  };
}

function mapSubmissionRow(row: BarcodeSubmissionRow): DeveloperBarcodeSubmission {
  return {
    id: row.id,
    barcode: row.barcode,
    productName: row.product_name,
    status: row.status,
    reviewNote: row.review_note ?? undefined,
  };
}

export async function getBarcodeProduct(barcode: string): Promise<BarcodeProduct | null> {
  return withRetry(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('barcode_products')
      .select('barcode, product_name, image_url, brand, product_category, scoring_category, processing_level, has_added_sugar, has_sweetener, data_quality, energy_kcal, fat, saturated_fat, carbs, protein, sugar, salt, fiber, serving_size_g, nutriscore, ingredients, allergens, nutrition_basis')
      .eq('barcode', barcode)
      .maybeSingle<BarcodeProductRow>();

    if (error) {
      console.error('[fitlune:supabase] getBarcodeProduct error:', error.message, error.code);
      throw new Error('Barkod verisi okunamadı.');
    }

    return data ? mapBarcodeRow(data) : null;
  });
}

async function findExistingSubmissionId(barcode: string): Promise<string | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('barcode_product_submissions')
    .select('id')
    .eq('barcode', barcode)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[fitlune:supabase] findExistingSubmissionId error:', error.message, error.code);
    throw new Error('Barkod submission listesi okunamadi.');
  }

  const rows = (data ?? []) as SubmissionIdRow[];
  return rows[0]?.id ?? null;
}

export async function getBarcodeSubmissionForEdit(
  submissionId: string,
): Promise<DeveloperBarcodeSubmission | null> {
  return withRetry(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('barcode_product_submissions')
      .select('id, barcode, product_name, status, review_note')
      .eq('id', submissionId)
      .maybeSingle<BarcodeSubmissionRow>();

    if (error) {
      console.error('[fitlune:supabase] getBarcodeSubmissionForEdit error:', error.message, error.code);
      throw new Error('Inceleme kaydi okunamadi.');
    }

    return data ? mapSubmissionRow(data) : null;
  });
}

export async function updateBarcodeSubmissionName(
  submissionId: string,
  productName: string,
): Promise<{ id: string }> {
  return withRetry(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('update_barcode_submission_name', {
      p_submission_id: submissionId,
      p_product_name: productName.trim(),
    });

    if (error) {
      console.error('[fitlune:supabase] updateBarcodeSubmissionName error:', error.message, error.code);
      throw normalizeSubmissionNameUpdateError(error, 'Inceleme urun adi guncellenemedi.');
    }

    if (typeof data !== 'string' || !data) {
      throw new Error('Inceleme urun adi guncelleme yaniti gecersiz.');
    }

    return { id: data };
  });
}

export async function createBarcodeSubmission(input: PendingBarcodeReviewInput): Promise<{ id: string }> {
  return withRetry(async () => {
    const existingProduct = await getBarcodeProduct(input.barcode);
    if (existingProduct) {
      throw new Error(BARCODE_EXISTS_IN_PRODUCTS_MESSAGE);
    }

    const existingSubmissionId = await findExistingSubmissionId(input.barcode);
    if (existingSubmissionId) {
      throw new Error(BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('barcode_product_submissions')
      .insert({
        barcode: input.barcode,
        product_name: input.productName,
        image_url: input.imageUrl ?? null,
        brand: input.brand ?? null,
        product_category: input.productCategory ?? null,
        scoring_category: input.scoringCategory ?? null,
        processing_level: input.processingLevel ?? null,
        has_added_sugar: input.hasAddedSugar ?? null,
        has_sweetener: input.hasSweetener ?? null,
        data_quality: input.dataQuality ?? 'estimated',
        energy_kcal: input.energyKcal,
        fat: input.fat,
        saturated_fat: input.saturatedFat,
        carbs: input.carbs,
        protein: input.protein,
        sugar: input.sugar,
        salt: input.salt,
        fiber: input.fiber,
        nutrition_basis: 'per100g',
        status: 'pending',
      })
      .select('id')
      .single<{ id: string }>();

    if (error) {
      console.error('[fitlune:supabase] createBarcodeSubmission error:', error.message, error.code);
      throw normalizeBarcodeSubmissionError(error, 'Urun onerisi kaydedilemedi.');
    }

    return { id: data.id };
  });
}

async function findPendingDeveloperCaptureId(barcode: string): Promise<string | null> {
  return findExistingSubmissionId(barcode);
}

export async function queueDeveloperBarcodeCapture(barcode: string): Promise<DeveloperBarcodeCaptureResponse> {
  return withRetry(async () => {
    const existingProduct = await getBarcodeProduct(barcode);
    if (existingProduct) {
      return {
        id: barcode,
        duplicate: true,
        status: 'already_exists',
      };
    }

    const pendingId = await findPendingDeveloperCaptureId(barcode);
    if (pendingId) {
      return {
        id: pendingId,
        duplicate: true,
        status: 'already_submitted',
      };
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('barcode_product_submissions')
      .insert(buildDeveloperCaptureSubmissionPayload(barcode))
      .select('id')
      .single<SubmissionIdRow>();

    if (error) {
      const normalizedError = normalizeBarcodeSubmissionError(
        error,
        'Developer barkod kuyruğa eklenemedi.',
      );

      if (
        error.code === '23505' ||
        normalizedError.message === BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE
      ) {
        const duplicateId = await findPendingDeveloperCaptureId(barcode);
        if (duplicateId) {
          return {
            id: duplicateId,
            duplicate: true,
            status: 'already_submitted',
          };
        }
      }

      if (normalizedError.message === BARCODE_EXISTS_IN_PRODUCTS_MESSAGE) {
        return {
          id: barcode,
          duplicate: true,
          status: 'already_exists',
        };
      }

      console.error('[fitlune:supabase] queueDeveloperBarcodeCapture error:', error.message, error.code);
      throw normalizedError;
    }

    return {
      id: data.id,
      duplicate: false,
      status: 'queued',
    };
  });
}


