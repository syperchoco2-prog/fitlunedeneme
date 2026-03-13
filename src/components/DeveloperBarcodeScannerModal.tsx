import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Barcode,
  CheckCircle,
  Keyboard,
  LoaderCircle,
  ScanLine,
  X,
  Zap,
} from 'lucide-react';

import type { DeveloperBarcodeCaptureResponse } from '../types';
import { useApp } from '../context/AppContext';
import { useBarcodeScannerEngine } from '../hooks/useBarcodeScannerEngine';
import { isValidBarcode, sanitizeBarcode } from '../utils/barcodeShared';
import {
  fetchDeveloperBarcodeSubmission,
  normalizeDeveloperSubmissionName,
  queueDeveloperBarcodeCapture,
  updateDeveloperBarcodeSubmissionName,
} from '../utils/developerBarcodeCapture';

const HOLD_MS = 900;
const UI_WATCHDOG_TIMEOUT_MS = 6_500;

type DeveloperQueuePhase = 'scan' | 'queueing' | 'result' | 'error';
type DeveloperQueueStage = 'idle' | 'rpc_call' | 'rpc_success' | 'rpc_timeout' | 'rpc_error';

interface DeveloperBarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
}

interface DeveloperResultState {
  barcode: string;
  payload: DeveloperBarcodeCaptureResponse;
}

interface SubmissionEditorState {
  submissionId: string | null;
  value: string;
  loading: boolean;
  saving: boolean;
  message: string | null;
  available: boolean;
}

const INITIAL_SUBMISSION_EDITOR_STATE: SubmissionEditorState = {
  submissionId: null,
  value: '',
  loading: false,
  saving: false,
  message: null,
  available: false,
};

function CornerDecor({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const classes = {
    tl: 'left-0 top-0 rounded-tl-3xl border-l-[3px] border-t-[3px]',
    tr: 'right-0 top-0 rounded-tr-3xl border-r-[3px] border-t-[3px]',
    bl: 'bottom-0 left-0 rounded-bl-3xl border-b-[3px] border-l-[3px]',
    br: 'bottom-0 right-0 rounded-br-3xl border-b-[3px] border-r-[3px]',
  };

  return (
    <motion.div
      className={`absolute h-12 w-12 border-white/90 ${classes[position]}`}
      animate={{ opacity: [0.55, 1, 0.55] }}
      transition={{ duration: 1.8, repeat: Infinity }}
    />
  );
}

function ScannerProgress() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-[1.75rem] bg-black/40 backdrop-blur-sm"
    >
      <div className="rounded-full bg-white/20 px-4 py-1.5 text-[11px] font-black tracking-widest text-white">
        OKUNUYOR...
      </div>
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/20">
        <motion.div
          className="h-full bg-white"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: HOLD_MS / 1000, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

function DebugPanel({
  host,
  stage,
  barcode,
  message,
}: {
  host: string;
  stage: DeveloperQueueStage;
  barcode: string | null;
  message: string | null;
}) {
  return (
    <div className="w-full max-w-[320px] rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-left backdrop-blur-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Dev Debug</p>
      <div className="mt-2 space-y-1 text-[12px] text-white/70">
        <p>
          <span className="text-white/45">Host:</span> {host}
        </p>
        <p>
          <span className="text-white/45">Aşama:</span> {stage}
        </p>
        <p>
          <span className="text-white/45">Barkod:</span> {barcode ?? '-'}
        </p>
        <p className="break-words">
          <span className="text-white/45">Hata:</span> {message ?? '-'}
        </p>
      </div>
    </div>
  );
}

function getResultCopy(status: DeveloperBarcodeCaptureResponse['status']) {
  if (status === 'queued') {
    return {
      eyebrow: 'Kuyruğa Eklendi',
      title: 'Barkod developer kuyruğuna yazıldı',
      description: 'Bu barkod daha sonra panelden doldurulabilir.',
      accent: 'text-emerald-400',
      surface: 'bg-emerald-500/20',
    };
  }

  if (status === 'already_submitted') {
    return {
      eyebrow: 'Zaten Bekliyor',
      title: 'Bu barkod zaten inceleme listesinde var',
      description: 'Aynı barkod ikinci kez developer kuyruğuna eklenmedi.',
      accent: 'text-amber-300',
      surface: 'bg-amber-500/20',
    };
  }

  return {
    eyebrow: 'Zaten Mevcut',
    title: 'Bu barkod zaten ürün olarak kayıtlı',
    description: 'Yeni bir developer kaydı açılmadı.',
    accent: 'text-sky-300',
    surface: 'bg-sky-500/20',
  };
}

export default function DeveloperBarcodeScannerModal({
  open,
  onClose,
}: DeveloperBarcodeScannerModalProps) {
  const { showToast } = useApp();
  const requestIdRef = useRef(0);
  const transitionLockRef = useRef(false);
  const scanEnabledRef = useRef(true);

  const [queuePhase, setQueuePhase] = useState<DeveloperQueuePhase>('scan');
  const [debugStage, setDebugStage] = useState<DeveloperQueueStage>('idle');
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [activeRequestBarcode, setActiveRequestBarcode] = useState<string | null>(null);
  const [result, setResult] = useState<DeveloperResultState | null>(null);
  const [submissionEditor, setSubmissionEditor] = useState<SubmissionEditorState>(
    INITIAL_SUBMISSION_EDITOR_STATE,
  );

  const supabaseHost = useMemo(() => {
    const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!rawUrl) {
      return 'ayarlanmadi';
    }

    try {
      return new URL(rawUrl).host;
    } catch {
      return 'gecersiz_url';
    }
  }, []);

  const {
    activeBarcode,
    applyTorch,
    applyZoom,
    cameraError,
    clearDetectedBarcodeDraft,
    detectedBarcodeDraft,
    manualEntryOpen,
    resetTracking,
    setManualEntryOpen,
    startCamera,
    stopScanner,
    torchAvailable,
    torchOn,
    videoRef,
    zoomAvailable,
    zoomLevel,
    zoomMax,
    zoomMin,
  } = useBarcodeScannerEngine({
    scanEnabledRef,
    onBarcodeConfirmed: (barcode) => {
      void handleDeveloperCapture(barcode);
    },
    showToast,
  });

  useEffect(() => {
    scanEnabledRef.current = open && queuePhase === 'scan';
  }, [open, queuePhase]);

  const resetState = () => {
    requestIdRef.current = Date.now();
    transitionLockRef.current = false;
    scanEnabledRef.current = true;
    setQueuePhase('scan');
    setDebugStage('idle');
    setDebugMessage(null);
    setManualBarcode('');
    setActiveRequestBarcode(null);
    setResult(null);
    setSubmissionEditor(INITIAL_SUBMISSION_EDITOR_STATE);
    clearDetectedBarcodeDraft();
    setManualEntryOpen(false);
    resetTracking();
  };

  const closeModal = () => {
    stopScanner();
    resetState();
    onClose();
  };

  const resetToScan = () => {
    stopScanner();
    resetState();
    void startCamera();
  };

  const openManualEditor = (seed?: string) => {
    const nextBarcode = sanitizeBarcode(seed ?? detectedBarcodeDraft ?? manualBarcode);
    if (nextBarcode) {
      setManualBarcode(nextBarcode);
    }

    clearDetectedBarcodeDraft();
    setManualEntryOpen(true);
  };

  const loadSubmissionEditor = async (
    submissionId: string,
    barcode: string,
    requestId: number,
  ) => {
    setSubmissionEditor({
      submissionId,
      value: '',
      loading: true,
      saving: false,
      message: null,
      available: false,
    });

    try {
      const submission = await fetchDeveloperBarcodeSubmission(submissionId);
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (!submission) {
        setSubmissionEditor({
          submissionId: null,
          value: '',
          loading: false,
          saving: false,
          message: 'Bu kayit artik ana urun listesine aktarilmis olabilir.',
          available: false,
        });
        return;
      }

      const initialValue = normalizeDeveloperSubmissionName(submission);
      setSubmissionEditor({
        submissionId: submission.id,
        value: initialValue,
        loading: false,
        saving: false,
        message: null,
        available: true,
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Inceleme kaydi okunamadi.';
      setSubmissionEditor({
        submissionId,
        value: '',
        loading: false,
        saving: false,
        message,
        available: false,
      });
    }
  };

  const handleSubmissionNameSave = async () => {
    if (!submissionEditor.submissionId || submissionEditor.loading || submissionEditor.saving) {
      return;
    }

    const trimmedValue = submissionEditor.value.trim();
    if (!trimmedValue) {
      showToast('Lutfen urun adi veya kisa not girin.', 'error');
      return;
    }

    if (trimmedValue.length > 200) {
      showToast('Urun adi 200 karakterden uzun olamaz.', 'error');
      return;
    }

    setSubmissionEditor((current) => ({
      ...current,
      saving: true,
      message: null,
    }));

    try {
      await updateDeveloperBarcodeSubmissionName(submissionEditor.submissionId, trimmedValue);
      setSubmissionEditor((current) => ({
        ...current,
        value: trimmedValue,
        saving: false,
        message: null,
        available: true,
      }));
      showToast('Inceleme urun adi kaydedildi.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Inceleme urun adi kaydedilemedi.';
      setSubmissionEditor((current) => ({
        ...current,
        submissionId: message.includes('ana urun listesine') ? null : current.submissionId,
        saving: false,
        message,
        available: !message.includes('ana urun listesine') && current.available,
      }));
      showToast(message, 'error');
    }
  };

  const handleDeveloperCapture = async (rawInput: string) => {
    const barcode = sanitizeBarcode(rawInput);
    if (!isValidBarcode(barcode)) {
      showToast('Geçerli bir barkod girin.', 'error');
      return;
    }

    if (transitionLockRef.current) {
      return;
    }

    transitionLockRef.current = true;
    scanEnabledRef.current = false;
    const requestId = Date.now();
    requestIdRef.current = requestId;
    setActiveRequestBarcode(barcode);
    setResult(null);
    setSubmissionEditor(INITIAL_SUBMISSION_EDITOR_STATE);
    clearDetectedBarcodeDraft();
    setDebugMessage(null);
    setDebugStage('rpc_call');
    setQueuePhase('queueing');
    stopScanner();
    navigator.vibrate?.(30);

    try {
      const nextResult = await Promise.race([
        queueDeveloperBarcodeCapture(barcode),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('ui_timeout')), UI_WATCHDOG_TIMEOUT_MS);
        }),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setDebugStage('rpc_success');
      setResult({ barcode, payload: nextResult });
      setQueuePhase('result');
      if (nextResult.status === 'already_exists') {
        setSubmissionEditor(INITIAL_SUBMISSION_EDITOR_STATE);
      } else {
        void loadSubmissionEditor(nextResult.id, barcode, requestId);
      }

      if (nextResult.status === 'queued') {
        showToast('Developer kuyruğuna eklendi', 'success');
      } else if (nextResult.status === 'already_submitted') {
        showToast('Bu barkod zaten inceleme listesinde var', 'info');
      } else {
        showToast('Bu barkod zaten kayıtlı', 'info');
      }

      navigator.vibrate?.(nextResult.duplicate ? [30, 60, 30] : [35, 40, 35]);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Developer kuyruğuna eklenemedi.';
      const isTimeout = message === 'ui_timeout' || message === 'Developer RPC zaman asimina ugradi.';

      setDebugStage(isTimeout ? 'rpc_timeout' : 'rpc_error');
      setDebugMessage(isTimeout ? 'RPC zaman aşımı veya askıda kalan istek' : message);
      setQueuePhase('error');
      showToast(
        isTimeout ? 'İstek takıldı, tekrar deneyin.' : message || 'Developer kuyruğuna eklenemedi.',
        'error',
      );
      navigator.vibrate?.([40, 60, 40]);
    } finally {
      if (requestIdRef.current === requestId) {
        transitionLockRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (!open) {
      stopScanner();
      resetState();
      return;
    }

    resetState();
    void startCamera();

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const resultCopy = result ? getResultCopy(result.payload.status) : null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          queuePhase === 'scan' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {queuePhase === 'scan' && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      )}

      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-5 pb-4 pt-[max(env(safe-area-inset-top),20px)]">
        <div className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-2 backdrop-blur-lg">
          <Barcode size={15} className="text-white" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white">Fitlune Barkod Dev</span>
        </div>

        <div className="flex items-center gap-2">
          {zoomAvailable && queuePhase === 'scan' && (
            <div className="flex items-center gap-1 rounded-full bg-black/35 px-1 backdrop-blur-lg">
              <button
                onClick={() => void applyZoom(Number((zoomLevel - 0.5).toFixed(1)))}
                disabled={zoomLevel <= zoomMin}
                className="flex h-8 w-8 items-center justify-center text-xl font-bold text-white disabled:opacity-30"
              >
                -
              </button>
              <span className="min-w-[28px] text-center text-[11px] font-black text-white">
                {zoomLevel.toFixed(1)}x
              </span>
              <button
                onClick={() => void applyZoom(Number((zoomLevel + 0.5).toFixed(1)))}
                disabled={zoomLevel >= zoomMax}
                className="flex h-8 w-8 items-center justify-center text-xl font-bold text-white disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}

          {torchAvailable && queuePhase === 'scan' && (
            <button
              onClick={() => void applyTorch()}
              className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-lg ${
                torchOn ? 'bg-amber-300 text-amber-900' : 'bg-black/35 text-white'
              }`}
            >
              <Zap size={18} />
            </button>
          )}

          <button
            onClick={closeModal}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-lg"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {queuePhase === 'scan' && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-5 pb-8 pt-20">
          <AnimatePresence>
            {cameraError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-[320px] rounded-2xl border border-amber-300/25 bg-amber-300/14 px-4 py-3 text-white backdrop-blur-2xl"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-200" />
                  <div>
                    <p className="text-sm font-bold">Kamera açılamadı</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/80">{cameraError}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative w-full max-w-[320px]">
            <div
              className={`relative h-[160px] w-full overflow-hidden rounded-[1.75rem] border ${
                activeBarcode ? 'scale-[1.02] border-white/90' : 'border-white/40'
              } transition-all`}
            >
              <CornerDecor position="tl" />
              <CornerDecor position="tr" />
              <CornerDecor position="bl" />
              <CornerDecor position="br" />
              {!activeBarcode && (
                <motion.div
                  className="absolute left-4 right-4 h-0.5 rounded-full bg-violet-400/70"
                  animate={{ top: ['20%', '75%', '20%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              {activeBarcode && <ScannerProgress />}
            </div>
          </div>

          <p className="w-full max-w-[320px] text-center text-sm text-white/65">
            Barkod okunduğunda yalnızca developer kuyruğuna yazılır.
          </p>

          {detectedBarcodeDraft && !isValidBarcode(detectedBarcodeDraft) && (
            <button
              onClick={() => openManualEditor(detectedBarcodeDraft)}
              className="w-full max-w-[320px] rounded-2xl border border-amber-300/25 bg-amber-300/12 px-4 py-3 text-left text-white backdrop-blur-2xl"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
                Eksik okuma algılandı
              </p>
              <p className="mt-1 font-mono text-sm text-white">{detectedBarcodeDraft}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                Kamera eksik okuduysa dokunup kalan rakamları elle tamamlayabilirsiniz.
              </p>
            </button>
          )}

          <div className="w-full max-w-[320px]">
            <AnimatePresence mode="wait">
              {!manualEntryOpen ? (
                <motion.button
                  key="btn"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => openManualEditor()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-sm font-bold text-white backdrop-blur-xl"
                >
                  <Keyboard size={17} />
                  Barkodu elle yaz
                </motion.button>
              ) : (
                <motion.div
                  key="panel"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 14 }}
                  className="rounded-2xl border border-white/15 bg-black/55 p-4 backdrop-blur-2xl"
                >
                  <div className="mb-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <Keyboard size={14} />
                      <p className="text-sm font-bold">Barkodu elle yaz</p>
                    </div>
                    <button
                      onClick={() => setManualEntryOpen(false)}
                      className="rounded-full bg-white/10 p-1.5 text-white/60"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <p className="mb-3 text-xs leading-relaxed text-white/65">
                    Eksik veya yanlış okunan barkodu buradan düzelterek gönderebilirsiniz.
                  </p>

                  <div className="flex gap-2">
                    <input
                      value={manualBarcode}
                      onChange={(event) => setManualBarcode(event.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      placeholder="8690504001234"
                      autoFocus
                      className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm font-semibold text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <button
                      onClick={() => void handleDeveloperCapture(manualBarcode)}
                      className="shrink-0 rounded-xl bg-white px-4 text-sm font-black text-zinc-900"
                    >
                      Yaz
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DebugPanel
            host={supabaseHost}
            stage={debugStage}
            barcode={activeRequestBarcode}
            message={debugMessage}
          />
        </div>
      )}

      {queuePhase === 'queueing' && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-white/15 border-t-white"
            />
            <LoaderCircle size={26} className="animate-spin text-white" />
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-white">{activeRequestBarcode}</p>
            <p className="mt-2 text-sm text-white/60">Developer kuyruğuna ekleniyor...</p>
          </div>
          <DebugPanel
            host={supabaseHost}
            stage={debugStage}
            barcode={activeRequestBarcode}
            message={debugMessage}
          />
        </div>
      )}

      {queuePhase === 'result' && result && resultCopy && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6"
        >
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${resultCopy.surface}`}>
            <CheckCircle size={40} className={resultCopy.accent} />
          </div>

          <div className="text-center">
            <p className={`mb-2 text-xs font-black uppercase tracking-widest ${resultCopy.accent}`}>
              {resultCopy.eyebrow}
            </p>
            <p className="text-xl font-black leading-snug text-white">{resultCopy.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{resultCopy.description}</p>
            <p className="mt-3 font-mono text-sm text-white/45">{result.barcode}</p>
          </div>

          {result.payload.status !== 'already_exists' && (
            <div className="w-full max-w-[320px] rounded-2xl border border-white/12 bg-white/10 p-4 text-left text-white backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">
                    Gecici urun adi
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">
                    Bu alan sadece `barcode_product_submissions.product_name` icin guncellenir.
                  </p>
                </div>
                {(submissionEditor.loading || submissionEditor.saving) && (
                  <LoaderCircle size={16} className="shrink-0 animate-spin text-white/70" />
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={submissionEditor.value}
                  onChange={(event) =>
                    setSubmissionEditor((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  disabled={!submissionEditor.available || submissionEditor.loading || submissionEditor.saving}
                  placeholder="Urun adi veya kisa not"
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-sm font-semibold text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  onClick={() => void handleSubmissionNameSave()}
                  disabled={!submissionEditor.available || submissionEditor.loading || submissionEditor.saving}
                  className="shrink-0 rounded-xl bg-white px-4 text-sm font-black text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Kaydet
                </button>
              </div>

              {submissionEditor.message && (
                <p className="mt-3 text-xs leading-relaxed text-amber-200">{submissionEditor.message}</p>
              )}
            </div>
          )}

          <DebugPanel
            host={supabaseHost}
            stage={debugStage}
            barcode={result.barcode}
            message={debugMessage}
          />

          <div className="flex w-full max-w-[320px] gap-3">
            <button
              onClick={resetToScan}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-lg"
            >
              <ScanLine size={15} />
              Tekrar Tara
            </button>
            <button
              onClick={closeModal}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-zinc-900"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      )}

      {queuePhase === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/20">
            <AlertCircle size={40} className="text-rose-300" />
          </div>

          <div className="text-center">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-rose-300">İstek Tamamlanmadı</p>
            <p className="text-xl font-black leading-snug text-white">Developer kuyruğuna yazılamadı</p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              İstek takıldıysa veya hata aldıysa buradan çıkmadan tekrar deneyebilirsin.
            </p>
            <p className="mt-3 font-mono text-sm text-white/45">{activeRequestBarcode}</p>
          </div>

          <DebugPanel
            host={supabaseHost}
            stage={debugStage}
            barcode={activeRequestBarcode}
            message={debugMessage}
          />

          <div className="flex w-full max-w-[320px] gap-3">
            <button
              onClick={resetToScan}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-lg"
            >
              <ScanLine size={15} />
              Tekrar Tara
            </button>
            <button
              onClick={closeModal}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-zinc-900"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
