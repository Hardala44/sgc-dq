import { useEffect, useState } from 'react';
import { Sparkles, Wifi } from 'lucide-react';
import type { AIMeta } from '../types/marketplace';

interface Props {
  query: string;
  aiMeta: AIMeta;
  providersSearched?: string[];
  status: 'searching' | 'done' | 'no_results';
  resultCount?: number;
}

/**
 * LiveSearchBanner
 * ─────────────────
 * Non-blocking animated banner shown while live scraping is in progress.
 * Correction #4: renders BELOW local results — never replaces them.
 * Hides itself once the scraper returns results.
 */
const LiveSearchBanner = ({ query, aiMeta, status, providersSearched = [], resultCount = 0 }: Props) => {
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Animated ellipsis
  useEffect(() => {
    if (status !== 'searching') return;
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, [status]);

  // Elapsed timer
  useEffect(() => {
    if (status !== 'searching') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const providers = aiMeta.proveedores_sugeridos.length > 0
    ? aiMeta.proveedores_sugeridos
    : ['proveedores del grupo'];

  if (status === 'done' && resultCount > 0) {
    // Compact success ribbon
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 mb-6 animate-fade-in">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <p className="text-sm text-emerald-800 font-medium">
          La IA encontró <strong>{resultCount}</strong> oferta{resultCount !== 1 ? 's' : ''} en vivo
          {providersSearched.length > 0 && (
            <> en <span className="font-bold">{providersSearched.join(', ')}</span></>
          )}
        </p>
      </div>
    );
  }

  if (status === 'done' && resultCount === 0) {
    return (
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 mb-6">
        <Wifi size={16} className="text-slate-400" />
        <p className="text-sm text-slate-500">
          La búsqueda en vivo no encontró resultados adicionales para "{query}".
        </p>
      </div>
    );
  }

  // Searching state — animated
  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 px-6 py-5 mb-6 shadow-sm">
      {/* Pulse background */}
      <div className="absolute inset-0 bg-gradient-to-r from-sky-400/5 to-indigo-400/5 animate-pulse pointer-events-none" />

      <div className="relative flex items-start gap-4">
        {/* Spinning icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center shadow-md shadow-sky-200">
            <Sparkles size={16} className="text-white animate-pulse" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-sky-900 uppercase tracking-widest">
              Búsqueda en Vivo
            </span>
            <span className="text-xs text-sky-500 font-mono bg-sky-100 px-2 py-0.5 rounded-full">
              IA activa
            </span>
          </div>

          <p className="text-sm text-sky-800 leading-relaxed">
            No tenemos <strong>"{query}"</strong> en catálogo local.
            La IA está buscando ahora mismo en{' '}
            {providers.slice(0, 3).map((p, i) => (
              <span key={p}>
                {i > 0 && i < providers.slice(0, 3).length - 1 && ', '}
                {i > 0 && i === providers.slice(0, 3).length - 1 && ' y '}
                <strong className="text-sky-900">{p}</strong>
              </span>
            ))}{dots}
          </p>

          {aiMeta.scraper_terms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="text-xs text-sky-600">Buscando también:</span>
              {aiMeta.scraper_terms.map(term => (
                <span
                  key={term}
                  className="text-xs bg-white border border-sky-200 text-sky-700 px-2.5 py-0.5 rounded-full font-medium"
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex-shrink-0 text-right">
          <span className="text-xs font-mono text-sky-400 tabular-nums">
            {elapsed}s
          </span>
          <div className="flex gap-0.5 mt-1.5 justify-end">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-5 rounded-sm bg-sky-300 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSearchBanner;
