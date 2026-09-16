import React, { useRef, useState } from 'react';
import { Megaphone, Image as ImageIcon, Upload, Trash2, Eye } from 'lucide-react';
import { KitFlyerSettings } from '../types';
import { prepareProofFile } from '../services/imageUtils';

interface KitFlyerManagerProps {
  settings: KitFlyerSettings;
  onUpdate: (settings: Partial<KitFlyerSettings>) => Promise<void>;
}

export const KitFlyerManager: React.FC<KitFlyerManagerProps> = ({ settings, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [enabledError, setEnabledError] = useState('');
  const [preview, setPreview] = useState(false);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const imageUrl = await prepareProofFile(file);
      await onUpdate({ imageUrl });
    } catch (err: any) {
      setUploadError(err?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!confirm('Remover a imagem do flyer? Isso também desliga a exibição.')) return;
    try {
      await onUpdate({ imageUrl: '', enabled: false });
    } catch (err: any) {
      setUploadError(err?.message || 'Não foi possível remover a imagem.');
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    if (checked && !settings.imageUrl) {
      setEnabledError('Envie a imagem do flyer antes de ativar.');
      return;
    }
    setTogglingEnabled(true);
    setEnabledError('');
    try {
      await onUpdate({ enabled: checked });
    } catch (err: any) {
      setEnabledError(err?.message || 'Erro ao atualizar o status do flyer.');
    } finally {
      setTogglingEnabled(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Megaphone className="text-yellow-400" size={20} /> Flyer Inicial
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Aparece em tela cheia assim que o site abre — antes de qualquer outra coisa, inclusive antes da
          vinheta de largada. Bom para avisos do momento, como data e local da retirada de kit. O visitante
          toca em qualquer lugar (ou no X) para continuar; aparece uma vez a cada carregamento da página.
        </p>
      </div>

      {/* Imagem */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
          <ImageIcon size={16} className="text-yellow-400" /> Imagem do Flyer
        </h3>

        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleUploadImage} className="hidden" />

        {settings.imageUrl ? (
          <div className="relative group inline-block bg-slate-950 rounded-xl p-4 border border-slate-800">
            <img
              src={settings.imageUrl}
              alt="Flyer"
              className="max-h-80 w-auto max-w-full object-contain rounded-lg"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
              title="Remover imagem"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <div className="bg-slate-950/60 rounded-xl border border-dashed border-slate-700 p-10 text-center">
            <ImageIcon size={32} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-medium">Nenhuma imagem enviada ainda.</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-yellow-400 text-slate-900 px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-60 disabled:cursor-wait"
          >
            {uploading
              ? <><Upload size={18} className="animate-pulse" /> Enviando...</>
              : <><Upload size={18} /> {settings.imageUrl ? 'Trocar Imagem' : 'Enviar Imagem'}</>}
          </button>
          {settings.imageUrl && (
            <button
              onClick={() => setPreview(true)}
              className="bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:border-slate-600 transition-all"
            >
              <Eye size={18} /> Ver como vai aparecer
            </button>
          )}
        </div>

        {uploadError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
            {uploadError}
          </div>
        )}
      </div>

      {/* Publicar */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-lg ${settings.enabled ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
            <Megaphone size={24} className={settings.enabled ? 'text-emerald-400' : 'text-slate-500'} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Status na Página Inicial</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Status: <span className={`font-bold ${settings.enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                {settings.enabled ? '✓ Aparecendo para todos' : '✗ Desligado'}
              </span>
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-slate-800 hover:border-yellow-400/40 hover:bg-slate-950/60 transition-all">
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={togglingEnabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-slate-600 accent-yellow-400 cursor-pointer disabled:opacity-50"
          />
          <div className="flex-1">
            <span className="text-sm font-bold text-white block">Mostrar o flyer ao abrir o site</span>
            <span className="text-xs text-slate-500">
              {togglingEnabled ? 'Salvando...' : 'Lembre de desligar quando o aviso não valer mais (ex.: depois da retirada de kit).'}
            </span>
          </div>
        </label>

        {enabledError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
            {enabledError}
          </div>
        )}
      </div>

      {/* Prévia em tela cheia (independente do overlay público — não deve
          interferir na regra de "mostra uma vez por carregamento") */}
      {preview && settings.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4 md:p-8 cursor-pointer"
          onClick={() => setPreview(false)}
        >
          <img
            src={settings.imageUrl}
            alt="Prévia do flyer"
            className="max-w-full max-h-[78vh] w-auto object-contain rounded-2xl shadow-2xl"
          />
          <span className="mt-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
            Toque para fechar a prévia
          </span>
        </div>
      )}
    </div>
  );
};
