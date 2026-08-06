import React, { useState } from 'react';
import { SponsorLogo } from '../types';
import { cloudinaryLogoUrl } from '../services/imageUtils';
import { FOOTER_CHIP_HEIGHT, FOOTER_LOGO_BASE_HEIGHT } from '../constants';
import { X, Save, Maximize2, Crop, RotateCcw } from 'lucide-react';

interface LogoAdjustModalProps {
  logo: SponsorLogo;
  onClose: () => void;
  onSave: (changes: { scale: number; trimEdges: boolean }) => Promise<void> | void;
}

export const LogoAdjustModal: React.FC<LogoAdjustModalProps> = ({ logo, onClose, onSave }) => {
  const [scale, setScale] = useState(logo.scale ?? 100);
  const [trimEdges, setTrimEdges] = useState(logo.trimEdges ?? true);
  const [saving, setSaving] = useState(false);

  const imgHeight = Math.round((FOOTER_LOGO_BASE_HEIGHT * scale) / 100);
  const previewSrc = cloudinaryLogoUrl(logo.imageData, 200, trimEdges);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ scale, trimEdges });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-slate-800 p-5 flex justify-between items-center border-b border-slate-700">
          <div>
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Maximize2 size={18} className="text-yellow-400" /> Ajustar Logo
            </h3>
            {logo.name && <p className="text-xs text-slate-500 mt-0.5">{logo.name}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Preview idêntico ao rodapé do site */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
              Como vai aparecer no rodapé do site
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex items-center justify-center gap-2.5">
              {/* Chip vizinho, para comparar o tamanho relativo */}
              <div
                className="bg-white/10 rounded-lg px-4 flex items-center justify-center shrink-0"
                style={{ height: FOOTER_CHIP_HEIGHT }}
              >
                <span className="text-[10px] text-slate-600 font-bold">outro logo</span>
              </div>
              <div
                className="bg-white rounded-lg px-4 flex items-center justify-center shrink-0"
                style={{ height: FOOTER_CHIP_HEIGHT }}
              >
                <img
                  src={previewSrc}
                  alt={logo.name || 'Logo'}
                  style={{ maxHeight: imgHeight }}
                  className="w-auto max-w-[180px] object-contain transition-[max-height] duration-100"
                />
              </div>
              <div
                className="bg-white/10 rounded-lg px-4 flex items-center justify-center shrink-0"
                style={{ height: FOOTER_CHIP_HEIGHT }}
              >
                <span className="text-[10px] text-slate-600 font-bold">outro logo</span>
              </div>
            </div>
          </div>

          {/* Tamanho */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
              <Maximize2 size={14} className="text-yellow-400" /> Tamanho
              <span className="text-yellow-400 normal-case font-mono">{scale}%</span>
            </label>
            <input
              type="range"
              min={50}
              max={140}
              step={5}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full accent-yellow-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-600 mt-1">
              Aumente se o logo estiver aparecendo pequeno em relação aos outros.
            </p>
          </div>

          {/* Recorte de borda */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 border-slate-800 hover:border-slate-700 transition-all">
              <input
                type="checkbox"
                checked={trimEdges}
                onChange={(e) => setTrimEdges(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-slate-600 accent-yellow-400 cursor-pointer shrink-0"
              />
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Crop size={13} className="text-yellow-400" /> Aparar moldura do arquivo
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Remove a borda branca em volta do logo, deixando ele maior. <strong>Desmarque</strong> se
                  o fundo colorido fizer parte da marca (o recorte cortaria o desenho).
                </span>
              </div>
            </label>
          </div>

          {(scale !== 100 || !trimEdges) && (
            <button
              onClick={() => { setScale(100); setTrimEdges(true); }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-bold"
            >
              <RotateCcw size={12} /> Voltar ao padrão
            </button>
          )}
        </div>

        <div className="p-5 pt-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-yellow-400 text-slate-900 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-300 transition-all disabled:opacity-60"
          >
            <Save size={17} /> {saving ? 'Salvando...' : 'Salvar Ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
};
