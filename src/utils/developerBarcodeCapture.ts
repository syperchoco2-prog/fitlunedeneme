import type {
  DeveloperBarcodeCaptureResponse,
  DeveloperBarcodeCaptureStatus,
  DeveloperBarcodeSubmission,
} from '../types';
import { sanitizeBarcode, isValidBarcode } from './barcodeShared';
import { supabase } from './supabaseClient';

type DeveloperCaptureRpcPayload = Partial<DeveloperBarcodeCaptureResponse> | null;
type DeveloperSubmissionRow = {
  id: string;
  barcode: string;
  product_name: string;
  status: DeveloperBarcodeSubmission['status'];
  review_note: string | null;
};
type DeveloperSubmissionApiPayload = {
  id?: string;
  barcode?: string;
  productName?: string;
  status?: DeveloperBarcodeSubmission['status'];
  reviewNote?: string;
  message?: string;
} | null;

const DEV_CAPTURE_TIMEOUT_MS = 5_000;
const DEV_SUBMISSION_TIMEOUT_MS = 4_500;
const BARCODE_EXISTS_IN_PRODUCTS_MESSAGE = 'Bu barkod zaten ürün listesinde kayıtlı.';
const BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE = 'Bu barkod zaten inceleme listesinde mevcut.';
const SUBMISSION_NOT_FOUND_MESSAGE = 'Bu kayit artik ana urun listesine aktarildigi icin duzenlenemiyor.';
const PRODUCT_NAME_REQUIRED_MESSAGE = 'Lutfen urun adini girin.';
const PRODUCT_NAME_TOO_LONG_MESSAGE = 'Urun adi cok uzun.';

function isValidCaptureStatus(value: unknown): value is DeveloperBarcodeCaptureStatus {
  return value === 'queued' || value === 'already_submitted' || value === 'already_exists';
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    }),
  ]);
}

function normalizeSubmissionError(error: unknown, fallbackMessage: string): Error {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('barcode_exists_in_products')) {
    return new Error(BARCODE_EXISTS_IN_PRODUCTS_MESSAGE);
  }

  if (
    normalized.includes('barcode_exists_in_submissions') ||
    normalized.includes('barcode_product_submissions_barcode_unique')
  ) {
    return new Error(BARCODE_EXISTS_IN_SUBMISSIONS_MESSAGE);
  }

  if (normalized.includes('submission_not_found')) {
    return new Error(SUBMISSION_NOT_FOUND_MESSAGE);
  }

  if (normalized.includes('product_name_too_short') || normalized.includes('invalid_product_name')) {
    return new Error(PRODUCT_NAME_REQUIRED_MESSAGE);
  }

  if (normalized.includes('product_name_too_long')) {
    return new Error(PRODUCT_NAME_TOO_LONG_MESSAGE);
  }

  return new Error(message || fallbackMessage);
}

async function fetchApiJsonWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEV_SUBMISSION_TIMEOUT_MS,
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

function parseDeveloperCaptureResponse(payload: DeveloperCaptureRpcPayload): DeveloperBarcodeCaptureResponse {
  if (
    !payload ||
    typeof payload.id !== 'string' ||
    typeof payload.duplicate !== 'boolean' ||
    !isValidCaptureStatus(payload.status)
  ) {
    throw new Error('Developer barkod yaniti gecersiz.');
  }

  return {
    id: payload.id,
    duplicate: payload.duplicate,
    status: payload.status,
  };
}

function parseDeveloperSubmissionRow(row: DeveloperSubmissionRow): DeveloperBarcodeSubmission {
  return {
    id: row.id,
    barcode: row.barcode,
    productName: row.product_name,
    status: row.status,
    reviewNote: row.review_note ?? undefined,
  };
}

function parseDeveloperSubmissionPayload(payload: DeveloperSubmissionApiPayload): DeveloperBarcodeSubmission {
  if (
    !payload ||
    typeof payload.id !== 'string' ||
    typeof payload.barcode !== 'string' ||
    typeof payload.productName !== 'string' ||
    (payload.status !== 'pending' && payload.status !== 'approved' && payload.status !== 'rejected')
  ) {
    throw new Error('Developer submission yaniti gecersiz.');
  }

  return {
    id: payload.id,
    barcode: payload.barcode,
    productName: payload.productName,
    status: payload.status,
    reviewNote: typeof payload.reviewNote === 'string' ? payload.reviewNote : undefined,
  };
}

export function normalizeDeveloperSubmissionName(submission: DeveloperBarcodeSubmission): string {
  const rawName = submission.productName.trim();
  const placeholderName = `[DEV_CAPTURE] ${submission.barcode}`;
  return rawName === placeholderName ? '' : rawName;
}

export async function queueDeveloperBarcodeCapture(barcode: string): Promise<DeveloperBarcodeCaptureResponse> {
  const cleanBarcode = sanitizeBarcode(barcode);

  if (!isValidBarcode(cleanBarcode)) {
    throw new Error('Gecerli bir barkod numarasi girin.');
  }

  try {
    const { data, error } = await withTimeout(
      supabase.rpc('queue_developer_barcode', { p_barcode: cleanBarcode }),
      DEV_CAPTURE_TIMEOUT_MS,
    );

    if (error) {
      throw normalizeSubmissionError(error, 'Developer barkod kuyruguna eklenemedi.');
    }

    return parseDeveloperCaptureResponse(data as DeveloperCaptureRpcPayload);
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      throw new Error('Developer RPC zaman asimina ugradi.');
    }

    throw error instanceof Error
      ? error
      : new Error('Developer barkod kuyruguna eklenemedi.');
  }
}

export async function fetchDeveloperBarcodeSubmission(
  submissionId: string,
): Promise<DeveloperBarcodeSubmission | null> {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('barcode_product_submissions')
        .select('id, barcode, product_name, status, review_note')
        .eq('id', submissionId)
        .maybeSingle<DeveloperSubmissionRow>(),
      DEV_SUBMISSION_TIMEOUT_MS,
    );

    if (error) {
      throw error;
    }

    return data ? parseDeveloperSubmissionRow(data) : null;
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      throw new Error('Developer submission sorgusu zaman asimina ugradi.');
    }

    let response: Response;
    try {
      response = await fetchApiJsonWithTimeout(`/api/dev/barcodes/submissions/${encodeURIComponent(submissionId)}`);
    } catch (apiError) {
      if (apiError instanceof DOMException && apiError.name === 'AbortError') {
        throw new Error('Developer submission API zaman asimina ugradi.');
      }

      throw normalizeSubmissionError(error, 'Developer submission kaydi okunamadi.');
    }

    const payload = (await response.json().catch(() => null)) as DeveloperSubmissionApiPayload;
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw normalizeSubmissionError(
        new Error(payload?.message || 'Developer submission kaydi okunamadi.'),
        'Developer submission kaydi okunamadi.',
      );
    }

    return parseDeveloperSubmissionPayload(payload);
  }
}

export async function updateDeveloperBarcodeSubmissionName(
  submissionId: string,
  productName: string,
): Promise<string> {
  const trimmedName = productName.trim();

  if (!trimmedName) {
    throw new Error(PRODUCT_NAME_REQUIRED_MESSAGE);
  }

  if (trimmedName.length > 200) {
    throw new Error(PRODUCT_NAME_TOO_LONG_MESSAGE);
  }

  try {
    const { data, error } = await withTimeout(
      supabase.rpc('update_barcode_submission_name', {
        p_submission_id: submissionId,
        p_product_name: trimmedName,
      }),
      DEV_SUBMISSION_TIMEOUT_MS,
    );

    if (error) {
      throw normalizeSubmissionError(error, 'Developer submission adi guncellenemedi.');
    }

    if (typeof data !== 'string' || !data) {
      throw new Error('Developer submission guncelleme yaniti gecersiz.');
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message === 'timeout') {
      throw new Error('Developer submission guncelleme istegi zaman asimina ugradi.');
    }

    let response: Response;
    try {
      response = await fetchApiJsonWithTimeout(
        `/api/dev/barcodes/submissions/${encodeURIComponent(submissionId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productName: trimmedName }),
        },
      );
    } catch (apiError) {
      if (apiError instanceof DOMException && apiError.name === 'AbortError') {
        throw new Error('Developer submission guncelleme API zaman asimina ugradi.');
      }

      throw normalizeSubmissionError(error, 'Developer submission adi guncellenemedi.');
    }

    const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!response.ok) {
      throw normalizeSubmissionError(
        new Error(payload?.message || 'Developer submission adi guncellenemedi.'),
        'Developer submission adi guncellenemedi.',
      );
    }

    if (typeof payload?.id !== 'string' || !payload.id) {
      throw new Error('Developer submission guncelleme yaniti gecersiz.');
    }

    return payload.id;
  }
}
