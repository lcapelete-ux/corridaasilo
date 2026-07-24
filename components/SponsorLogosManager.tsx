import React, { useRef, useState } from 'react';
import { SponsorLogo } from '../types';
import { prepareLogoFile, cloudinaryLogoUrl } from '../services/imageUtils';
import { Image as ImageIcon, Upload, Trash2, Plus } from 'lucide-react';

interface SponsorLogosManagerProps {
  logos: SponsorLogo[];
  onAdd: (imageData: string, name?: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export const SponsorLogosManager: React.FC<SponsorLogosManagerProps> = ({ logos, onAdd, onDelete }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const dataUrl = await prepareLogoFile(file);
        const name = file.name.replace(/\.[^.]+$/, '').trim();
        await onAdd(dataUrl, name);
      }
    } catch (err: any) {
      alert(err?.message || 'Não foi possível enviar o logo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

      {/* Grade de logos */}
      {logos.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <ImageIcon size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum logo enviado ainda.</p>
          <p className="text-slate-600 text-sm mt-1">Clique em "Enviar Logos" para adicionar os patrocinadores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {logos.map(logo => (
            <div key={logo.id} className="relative group bg-white rounded-xl p-4 flex items-center justify-center min-h-[96px] shadow-sm">
              <img
                src={cloudinaryLogoUrl(logo.imageData)}
                alt={logo.name || 'Patrocinador'}
                className="max-h-16 w-auto max-w-full object-contain"
              />
              <button
                onClick={() => { if (confirm('Remover este logo do rodapé?')) onDelete(logo.id); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
                title="Remover logo"
              >
                <Trash2 size={14} />
              </button>
              {logo.name && (
                <span className="absolute bottom-1 left-1 right-1 text-center text-[10px] text-slate-400 truncate">{logo.name}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {logos.length > 0 && (
        <p className="text-xs text-slate-500">
          Passe o mouse sobre um logo e clique no ✕ para remover. Toque nele no celular. Os logos aparecem no site na ordem de envio.
        </p>
      )}
    </div>
  );
};
