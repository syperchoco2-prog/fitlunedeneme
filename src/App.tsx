import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Flame, Dumbbell, BookOpen, Plus, X, Camera, Barcode } from 'lucide-react';
import BeslenmeView from './components/BeslenmeView';
import { AppProvider } from './context/AppContext';
import HomeView from './components/HomeView';
import CaloriesView from './components/CaloriesView';
import ActivityView from './components/ActivityView';
import ProfileView from './components/ProfileView';
import ToastContainer from './components/Toast';
import AIScannerModal from './components/AIScannerModal';
import BarcodeScannerModal from './components/BarcodeScannerModal';

const devBarcodeEntryEnabled = import.meta.env.VITE_ENABLE_DEV_BARCODE_PAGE === 'true';

const NavItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  iconStyle,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  iconStyle?: React.CSSProperties;
}) => (
  <button
    onClick={onClick}
    className="flex w-14 flex-col items-center justify-center gap-1 outline-none focus:outline-none [-webkit-tap-highlight-color:transparent] group"
  >
    <div className={`transition-all duration-300 ${active ? 'scale-110 text-emerald-500' : 'text-zinc-400'}`} style={iconStyle}>
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className={`mt-1 text-[10px] font-medium tracking-wide ${active ? 'text-emerald-500' : 'text-zinc-400'}`}>
      {label}
    </span>
  </button>
);

function AddMealModal({
  open,
  onClose,
  onOpenScanner,
  onOpenBarcodeScanner,
  onOpenDeveloperBarcodeScanner,
  showDevBarcodePage,
}: {
  open: boolean;
  onClose: () => void;
  onOpenScanner: () => void;
  onOpenBarcodeScanner?: () => void;
  onOpenDeveloperBarcodeScanner?: () => void;
  showDevBarcodePage?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="add-meal-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-end justify-center"
        >
          <div className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm transition-colors" onClick={onClose} />

          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            exit={{ y: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full rounded-t-3xl bg-white dark:bg-zinc-900 p-6 pb-10 transition-colors"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Öğün Ekle</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onClose();
                  onOpenScanner();
                }}
                className="group relative w-full overflow-hidden rounded-2xl border border-emerald-100 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20 p-5 text-left transition-all hover:border-emerald-200 dark:hover:border-emerald-500/40 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 shadow-sm transition-colors">
                    <Camera size={24} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <span className="block text-base font-bold text-zinc-900 dark:text-white">Fotoğraf ile Ekle</span>
                    <span className="mt-1 block text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                      Fitlune AI yemeği tanır ve kaloriyi otomatik hesaplar.
                    </span>
                  </div>
                </div>
                <div className="absolute right-2 top-2 rounded-lg bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                  Hızlı
                </div>
              </motion.button>

              {onOpenBarcodeScanner && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    onClose();
                    onOpenBarcodeScanner();
                  }}
                  className="w-full rounded-2xl border border-zinc-200/80 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-5 text-left shadow-sm transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors">
                      <Barcode size={24} />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <span className="block text-base font-bold text-zinc-900 dark:text-white">Barkod Okut</span>
                      <span className="mt-1 block text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                        Paketli gıdaların barkodunu okutarak değerlerini bul.
                      </span>
                    </div>
                  </div>
                </motion.button>
              )}

              {showDevBarcodePage && onOpenDeveloperBarcodeScanner && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    onClose();
                    onOpenDeveloperBarcodeScanner();
                  }}
                  className="w-full rounded-2xl border border-zinc-200/80 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-5 text-left shadow-sm transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-500 dark:text-violet-400 transition-colors">
                      <Barcode size={22} />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <span className="block text-base font-bold text-zinc-900 dark:text-white">Dev Barkod Yaz</span>
                      <span className="mt-1 block text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                        Barkodu oku ve doğrudan developer kuyruğuna yaz.
                      </span>
                    </div>
                    <div className="mt-1 rounded-lg bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                      Dev
                    </div>
                  </div>
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AppContent() {
  const barcodeScannerEnabled = true;
  const [activeTab, setActiveTab] = useState('home');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [barcodeScannerMode, setBarcodeScannerMode] = useState<'lookup' | 'developer'>('lookup');

  const openLookupBarcodeScanner = () => {
    setBarcodeScannerMode('lookup');
    setBarcodeScannerOpen(true);
  };

  const openDeveloperBarcodeScanner = () => {
    setBarcodeScannerMode('developer');
    setBarcodeScannerOpen(true);
  };

  const closeBarcodeScanner = () => {
    setBarcodeScannerOpen(false);
    setBarcodeScannerMode('lookup');
  };

  const renderView = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView onNavigate={setActiveTab} />;
      case 'calories':
        return (
          <CaloriesView
            onOpenScanner={() => setScannerOpen(true)}
            onOpenBarcodeScanner={barcodeScannerEnabled ? openLookupBarcodeScanner : undefined}
          />
        );
      case 'activity':
        return <ActivityView />
      case 'beslenme':
        return <BeslenmeView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <HomeView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center font-sans selection:bg-emerald-100 transition-colors">
      <div className="relative flex h-[850px] max-h-[100dvh] w-full max-w-[400px] flex-col overflow-hidden bg-transparent shadow-2xl sm:rounded-[3rem] sm:border-[12px] border-zinc-900/10 dark:border-zinc-800 transition-colors">
        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent scrollbar-hide transition-colors">

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex min-h-full flex-col"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-0 z-20 flex w-full items-center justify-between border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 pt-3 transition-colors" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <NavItem icon={Home} label="Ana Sayfa" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={Flame} label="Kalori" active={activeTab === 'calories'} onClick={() => setActiveTab('calories')} />

          <div className="relative -mt-6 flex flex-col items-center justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setAddModalOpen(true)}
              className="z-30 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 outline-none focus:outline-none [-webkit-tap-highlight-color:transparent]"
            >
              <Plus size={28} strokeWidth={2.5} />
            </motion.button>
          </div>

          <NavItem icon={Dumbbell} label="Egzersiz" active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} iconStyle={{ transform: 'rotate(90deg)' }} />
          <NavItem icon={BookOpen} label="Beslenme" active={activeTab === 'beslenme'} onClick={() => setActiveTab('beslenme')} />
        </div>

        <AddMealModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onOpenScanner={() => setScannerOpen(true)}
          onOpenBarcodeScanner={barcodeScannerEnabled ? openLookupBarcodeScanner : undefined}
          onOpenDeveloperBarcodeScanner={devBarcodeEntryEnabled ? openDeveloperBarcodeScanner : undefined}
          showDevBarcodePage={devBarcodeEntryEnabled}
        />

        <AIScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} />

        {barcodeScannerEnabled && (
          <BarcodeScannerModal
            open={barcodeScannerOpen}
            onClose={closeBarcodeScanner}
            mode={barcodeScannerMode}
          />
        )}

        <ToastContainer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
