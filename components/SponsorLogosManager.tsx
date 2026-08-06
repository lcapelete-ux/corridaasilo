import React, { useRef, useState } from 'react';
import { SponsorLogo } from '../types';
import { prepareLogoFile, cloudinaryLogoUrl } from '../services/imageUtils';
import { LogoAdjustModal } from './LogoAdjustModal';
import { FOOTER_CHIP_HEIGHT, FOOTER_LOGO_BASE_HEIGHT } from '../constants';
import { Image as ImageIcon, Upload, Trash2, Plus, Maximize2 } from 'lucide-react';

interface SponsorLogosManagerProps {
  logos: SponsorLogo[];
  onAdd: (imageData: string, name?: string) => Promise<SponsorLogo | null | void>;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, changes: { scale?: number; trimEdges?: boolean }) => Promise<void>;
}

export const SponsorLogosManager: React.FC<SponsorLogosManagerProps> = ({ logos, onAdd, onDelete, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [adjusting, setAdjusting] = useState<SponsorLogo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    let lastAdded: SponsorLogo | null = null;
    try {
      for (const file of files) {
        const dataUrl = await prepareLogoFile(file);
        const name = file.name.replace(/\.[^.]+$/, '').trim();
        const created = await onAdd(dataUrl, name);
        if (created) lastAdded = created;
      }
    } catch (err: any) {
      alert(err?.message || 'Não foi possível enviar o logo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Já abre o ajuste do último enviado: é o momento em que o admin está
      // olhando pro logo e sabe se ficou do tamanho certo
      if (lastAdded && onUpdate) setAdjusting(lastAdded);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + upload */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="text-yellow-400" size={20} /> Logos do Site
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Estes logos aparecem no rodapé do site, ao lado do Sicredi. Pode enviar vários de uma vez.
            </p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <button
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-yellow-400 text-slate-900 px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-60 disabled:cursor-wait shrink-0"
          >
            {uploading ? <><Upload size={18} className="animate-pulse" /> Enviando...</> : <><Plus size={18} /> Enviar Logos</>}
          </button>
        </div>
      </div>

      {/* Prévia do rodapé: mostra os logos exatamente como o visitante vê,
          lado a lado — é olhando assim que dá pra notar qual está pequeno */}
      {logos.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-3">
            Prévia do rodapé do site
          </p>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-2.5">
              {logos.map(logo => (
                <button
                  key={logo.id}
                  onClick={() => onUpdate && setAdjusting(logo)}
                  disabled={!onUpdate}
                  title={onUpdate ? 'Clique para ajustar o tamanho deste logo' : undefined}
                  className="bg-white rounded-lg px-4 flex items-center justify-center shrink-0 ring-offset-2 ring-offset-slate-950 hover:ring-2 hover:ring-yellow-400 transition-all disabled:cursor-default"
                  style={{ height: FOOTER_CHIP_HEIGHT }}
                >
                  <img
                    src={cloudinaryLogoUrl(logo.imageData, 200, logo.trimEdges ?? true)}
                    alt={logo.name || 'Patrocinador'}
                    style={{ maxHeight: Math.round((FOOTER_LOGO_BASE_HEIGHT * (logo.scale ?? 100)) / 100) }}
                    className="w-auto max-w-[170px] object-contain"
                  />
                </button>
              ))}
            </div>
          </div>
          {onUpdate && (
            <p className="text-xs text-slate-600 mt-2">
              Clique em qualquer logo acima para ajustar o tamanho dele.
            </p>
          )}
        </div>
      )}

      {/* Grade de logos (gerenciar) */}
      {logos.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <ImageIcon size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum logo enviado ainda.</p>
          <p className="text-slate-600 text-sm mt-1">Clique em "Enviar Logos" para adicionar os patrocinadores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {logos.map(logo => (
            <div key={logo.id} className="relative group bg-white rounded-xl p-4 pb-6 aspect-square flex items-center justify-center shadow-sm">
              <img
                src={cloudinaryLogoUrl(logo.imageData, 320, logo.trimEdges ?? true)}
                alt={logo.name || 'Patrocinador'}
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {onUpdate && (
                  <button
                    onClick={() => setAdjusting(logo)}
                    className="bg-indigo-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-600 transition-all"
                    title="Ajustar tamanho no rodapé"
                  >
                    <Maximize2 size={13} />
                  </button>
                )}
                <button
                  onClick={() => { if (confirm('Remover este logo do rodapé?')) onDelete(logo.id); }}
                  className="bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all"
                  title="Remover logo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <span className="absolute bottom-1.5 left-1 right-1 text-center text-[10px] text-slate-400 truncate">
                {logo.name || ''}
                {(logo.scale ?? 100) !== 100 && <span className="text-indigo-500 font-bold"> · {logo.scale}%</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {logos.length > 0 && (
        <p className="text-xs text-slate-500">
          Passe o mouse sobre um logo para ajustar (⤢) ou remover (✕). Toque nele no celular. Os logos aparecem no site na ordem de envio.
        </p>
      )}

      {adjusting && onUpdate && (
        <LogoAdjustModal
          logo={adjusting}
          onClose={() => setAdjusting(null)}
          onSave={(changes) => onUpdate(adjusting.id, changes)}
        />
      )}
    </div>
  );
};
