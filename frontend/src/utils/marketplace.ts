import type { LucideIcon } from 'lucide-react';
import { Package, Syringe, Clipboard, Box } from 'lucide-react';
import type { SupplierOffer } from '../types/marketplace';

// ─── Stock Labels ─────────────────────────────────────────────────────────────

export const STOCK_LABELS: Record<SupplierOffer['stock_status'], { label: string; color: string }> = {
  in_stock: { label: 'En stock', color: 'text-emerald-400' },
  low_stock: { label: 'Stock bajo', color: 'text-amber-400' },
  out_of_stock: { label: 'Sin stock', color: 'text-red-400' },
  unknown: { label: 'Consultar', color: 'text-slate-400' },
};

// ─── Placeholder image logic ──────────────────────────────────────────────────

export const isPlaceholderUrl = (url: string | null | undefined): boolean => {
  if (!url) return true;
  return /unsplash|stock/i.test(url);
};

// ─── Category icon resolver ───────────────────────────────────────────────────

// Strip accents for robust keyword matching (e.g. 'prótesis' → 'protesis').
// Exported so other modules (GlobalSearch, Catalogo, etc.) share the same logic.
export const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** @deprecated use normalize() */
const _normalize = normalize;

const CATEGORY_ICONS: Array<{ keywords: string[]; Icon: LucideIcon }> = [
  {
    // Surgical / injectable supplies
    keywords: [
      'implant', 'anestesi', 'jeringa', 'aguja', 'inyect', 'cirugi',
      'carpule', 'cartucho', 'bisturi', 'sutura',
    ],
    Icon: Syringe,
  },
  {
    // Prosthetics / restorative materials
    keywords: [
      'protesis', 'protesic', 'corona', 'puente', 'composite', 'adhesivo',
      'cemento', 'resina', 'bracket', 'removible', 'fija', 'incrustacion',
      'carilla', 'endodoncia', 'gutapercha', 'lima',
    ],
    Icon: Box,
  },
  {
    // Diagnostics / documentation / imaging
    keywords: [
      'diagnos', 'radiolog', 'ortodoncia', 'prescripcion', 'documento',
      'ficha', 'registro', 'imagen', 'escaner', 'impresion', 'digital',
    ],
    Icon: Clipboard,
  },
  {
    // Generic dental / consumables catch-all → Package
    keywords: [
      'dental', 'clinica', 'consumible', 'higiene', 'desinfec', 'esteril',
      'guante', 'mascaril', 'material', 'accesorio', 'instrumen',
    ],
    Icon: Package,
  },
];

// Returns the Lucide component class — caller renders it with JSX so bundler
// can resolve it correctly (avoids "Lucide is not defined" at runtime).
export const getPlaceholderIcon = (categoryName: string): LucideIcon => {
  const lower = _normalize(categoryName || '');
  for (const { keywords, Icon } of CATEGORY_ICONS) {
    if (keywords.some((kw) => lower.includes(kw))) return Icon;
  }
  return Package;
};
