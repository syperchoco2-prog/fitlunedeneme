import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Clock, Flame, ChevronRight } from 'lucide-react';

interface Recipe {
  id: number;
  name: string;
  emoji: string;
  category: 'Kahvaltı' | 'Öğle' | 'Akşam' | 'Atıştırma';
  kcal: number;
  time: number;
  tags: string[];
  color: string;
}

const RECIPES: Recipe[] = [
  { id: 1, name: 'Yulaf Ezmesi', emoji: '🥣', category: 'Kahvaltı', kcal: 320, time: 10, tags: ['Lif', 'Protein'], color: '#fef3c7' },
  { id: 2, name: 'Avokadolu Tost', emoji: '🥑', category: 'Kahvaltı', kcal: 410, time: 8, tags: ['Sağlıklı Yağ'], color: '#dcfce7' },
  { id: 3, name: 'Izgara Tavuk Salata', emoji: '🥗', category: 'Öğle', kcal: 380, time: 20, tags: ['Yüksek Protein', 'Düşük Karb'], color: '#d1fae5' },
  { id: 4, name: 'Mercimek Çorbası', emoji: '🍲', category: 'Öğle', kcal: 290, time: 30, tags: ['Lif', 'Demir'], color: '#fde8d8' },
  { id: 5, name: 'Fırın Somon', emoji: '🐟', category: 'Akşam', kcal: 520, time: 25, tags: ['Omega-3', 'Protein'], color: '#dbeafe' },
  { id: 6, name: 'Sebzeli Makarna', emoji: '🍝', category: 'Akşam', kcal: 480, time: 20, tags: ['Karbonhidrat', 'Lif'], color: '#fce7f3' },
  { id: 7, name: 'Protein Smoothie', emoji: '🥤', category: 'Atıştırma', kcal: 220, time: 5, tags: ['Protein', 'Hızlı'], color: '#ede9fe' },
  { id: 8, name: 'Badem & Fındık', emoji: '🥜', category: 'Atıştırma', kcal: 180, time: 1, tags: ['Sağlıklı Yağ', 'Hızlı'], color: '#fef9c3' },
];

const CATEGORIES = ['Tümü', 'Kahvaltı', 'Öğle', 'Akşam', 'Atıştırma'] as const;

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } } };

export default function BeslenmeView() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Tümü');
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = RECIPES.filter(r => {
    const matchCat = activeCategory === 'Tümü' || r.category === activeCategory;
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div
      className="flex-1 flex flex-col overflow-x-hidden pb-28"
      style={{ background: 'linear-gradient(160deg, #e8eaf8 0%, #dce5f5 40%, #e0e8f8 70%, #d8e2f5 100%)' }}
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-3 shrink-0">
        <h1 className="text-[22px] font-bold text-[#15224a] tracking-tight">Tarifler</h1>
        <p className="text-[12px] text-[#15224a]/50 mt-0.5">Sağlıklı beslenme için öneriler</p>
      </div>

      {/* Search */}
      <div className="px-5 mb-3 shrink-0">
        <div className="flex items-center gap-2.5 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/60 shadow-sm">
          <Search size={16} className="text-[#15224a]/40 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tarif ara..."
            className="flex-1 bg-transparent text-[14px] text-[#15224a] placeholder-[#15224a]/35 outline-none"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 px-5 mb-4 overflow-x-auto scrollbar-hide shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-[#15224a] text-white shadow-sm'
                : 'bg-white/70 text-[#15224a]/60 hover:bg-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recipe List */}
      <motion.div
        key={activeCategory + search}
        variants={container}
        initial="hidden"
        animate="show"
        className="px-5 space-y-3 overflow-y-auto flex-1"
      >
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#15224a]/40">
            <span className="text-4xl mb-3">🔍</span>
            <span className="text-sm font-medium">Tarif bulunamadı</span>
          </div>
        )}
        {filtered.map(recipe => (
          <motion.div
            key={recipe.id}
            variants={item}
            onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
            className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-sm border border-white/60 overflow-hidden cursor-pointer"
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: recipe.color }}
              >
                {recipe.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] text-[#15224a] truncate">{recipe.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[11px] text-[#15224a]/55">
                    <Flame size={11} className="text-orange-400" />
                    {recipe.kcal} kcal
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#15224a]/55">
                    <Clock size={11} className="text-emerald-500" />
                    {recipe.time} dk
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: recipe.color, color: '#15224a' }}>
                  {recipe.category}
                </span>
                <motion.div animate={{ rotate: expanded === recipe.id ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight size={16} className="text-[#15224a]/40" />
                </motion.div>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === recipe.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="px-4 pb-4 border-t border-zinc-100"
              >
                <div className="pt-3 flex flex-wrap gap-1.5 mb-3">
                  {recipe.tags.map(tag => (
                    <span key={tag} className="text-[11px] font-medium px-2.5 py-1 bg-[#15224a]/8 text-[#15224a]/70 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-[13px] font-bold shadow-sm shadow-emerald-500/20"
                >
                  Öğüne Ekle
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
