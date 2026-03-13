import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, LoaderCircle, X } from 'lucide-react';

import { reportMissingBarcode } from '../utils/barcodeService';
import { isValidBarcode, sanitizeBarcode } from '../utils/barcodeShared';

interface ProductSuggestionSheetProps {
  open: boolean;
  barcode: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ProductSuggestionSheet({
  open,
  barcode,
  onClose,
  onSuccess,
}: ProductSuggestionSheetProps) {
  const [barcodeValue, setBarcodeValue] = useState('');
  const [productName, setProductName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanBarcode = sanitizeBarcode(barcodeValue || barcode);

  useEffect(() => {
    if (open) {
      setBarcodeValue(sanitizeBarcode(barcode));
      return;
    }

    setBarcodeValue('');
    setProductName('');
    setSubmitting(false);
    setDone(false);
    setError(null);
  }, [barcode, open]);

  const handleSubmit = async () => {
    if (!isValidBarcode(cleanBarcode)) {
      setError('Lütfen geçerli bir barkod girin.');
      return;
    }

    if (!productName.trim()) {
      setError('Lütfen ürün adını girin.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await reportMissingBarcode(cleanBarcode, productName.trim());
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirim gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 z-[210] mx-auto max-w-[440px] rounded-t-[2rem] bg-white px-6 pb-10 pt-4 shadow-2xl"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-200" />

            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-base font-black text-zinc-900">Ürün Bildir</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">{cleanBarcode}</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
              >
                <X size={16} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-4 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle size={32} className="text-emerald-600" />
                  </div>
                  <p className="text-lg font-black text-zinc-900">Teşekkürler!</p>
                  <p className="text-sm leading-relaxed text-zinc-500">
                    Bildirimin alındı. Ürün <strong className="text-zinc-700">48 saat içinde</strong>{' '}
                    veritabanına eklenecektir.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-black text-white"
                  >
                    Tamam
                  </button>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-4">
                  <p className="text-sm text-zinc-500">
                    Barkod eksik okunduysa önce barkodu düzeltin, sonra ürün adını yazın.
                  </p>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                      Barkod
                    </label>
                    <input
                      value={barcodeValue}
                      onChange={(event) => setBarcodeValue(event.target.value.replace(/[^\d]/g, ''))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void handleSubmit();
                        }
                      }}
                      inputMode="numeric"
                      placeholder="8690504001234"
                      autoFocus
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm font-semibold text-zinc-800 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                    <p className="text-xs text-zinc-400">
                      Kamera yanlış okuduysa kalan rakamları buradan tamamlayabilirsiniz.
                    </p>
                  </div>

                  <input
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleSubmit();
                      }
                    }}
                    placeholder="Örn: Ülker Çikolatalı Gofret 36g"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm font-medium text-zinc-800 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />

                  {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

                  <button
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3.5 text-sm font-black text-white disabled:opacity-60"
                  >
                    {submitting && <LoaderCircle size={16} className="animate-spin" />}
                    {submitting ? 'Gönderiliyor...' : 'Bildir'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
