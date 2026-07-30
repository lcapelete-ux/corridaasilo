import React, { useRef, useState } from 'react';
import { Gift, Image as ImageIcon, Upload, Trash2, Save, ExternalLink, Ticket, Maximize2, MessageCircle } from 'lucide-react';
import { RaffleSettings } from '../types';
import { prepareProofFile } from '../services/imageUtils';

interface RaffleManagerProps {
  settings: RaffleSettings;
  onUpdate: (settings: Partial<RaffleSettings>) => Promise<void>;
}

const MIN_IMAGE_HEIGHT = 100;
const MAX_IMAGE_HEIGHT = 360;

export const RaffleManager: React.FC<RaffleManagerProps> = ({ settings, onUpdate }) => {
  const [prizeName, setPrizeName] = useState(settings.prizeName);
  const [link, setLink] = useState(settings.link);
  const [whatsappLink, setWhatsappLink] = useState(settings.whatsappLink);
  const [imageHeight, setImageHeight] = useState(settings.imageHeight);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsSuccess, setDetailsSuccess] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [enabledError, setEnabledError] = useState('');

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const imageUrl = await prepareProofFile(file);
      await onUpdate({ imageUrl });
    } catch (err: any) {
      setUploadError(err?.message || 'Não foi possível enviar a foto do prêmio.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    if (!confirm('Remover a foto do prêmio?')) return;
    try {
      await onUpdate({ imageUrl: '' });
    } catch (err: any) {
      setUploadError(err?.message || 'Não foi possível remover a foto.');
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsError('');
    setDetailsSuccess(false);
    try {
      await onUpdate({
        prizeName: prizeName.trim(),
        link: link.trim(),
        whatsappLink: whatsappLink.trim(),
        imageHeight,
      });
      setDetailsSuccess(true);
      setTimeout(() => setDetailsSuccess(false), 3000);
    } catch (err: any) {
      setDetailsError(err?.message || 'Erro ao salvar os dados da rifa.');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    if (checked && (!settings.imageUrl || !link.trim() || !prizeName.trim())) {
      setEnabledError('Antes de publicar, preencha o nome do prêmio, o link e envie a foto.');
      return;
    }
    setTogglingEnabled(true);
    setEnabledError('');
    try {
      await onUpdate({ enabled: checked });
    } catch (err: any) {
      setEnabledError(err?.message || 'Erro ao atualizar o status da rifa.');
    } finally {
      setTogglingEnabled(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Gift className="text-yellow-400" size={20} /> Rifa Solidária
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Prêmio sorteado à parte da inscrição. Cadastre a foto, o nome do prêmio e o link da plataforma onde o número é comprado — depois publique na página inicial.
        </p>
      </div>

      {/* Foto do prêmio */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
          <ImageIcon size={16} className="text-yellow-400" /> Foto do Prêmio
        </h3>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleUploadImage}
          className="hidden"
        />

        {settings.imageUrl ? (
          <div className="relative group inline-block bg-white rounded-xl p-4">
            <img
              src={settings.imageUrl}
              alt={settings.prizeName || 'Prêmio da rifa'}
              style={{ height: imageHeight }}
              className="w-auto max-w-full max-h-[60vh] object-contain rounded-lg transition-[height] duration-100"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
              title="Remover foto"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <div className="bg-slate-950/60 rounded-xl border border-dashed border-slate-700 p-10 text-center">
            <ImageIcon size={32} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-medium">Nenhuma foto enviada ainda.</p>
          </div>
        )}

        <button
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-4 bg-yellow-400 text-slate-900 px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-60 disabled:cursor-wait"
        >
          {uploading ? <><Upload size={18} className="animate-pulse" /> Enviando...</> : <><Upload size={18} /> {settings.imageUrl ? 'Trocar Foto' : 'Enviar Foto'}</>}
        </button>

        {uploadError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
            {uploadError}
          </div>
        )}

        {settings.imageUrl && (
          <div className="mt-5 pt-5 border-t border-slate-800/60">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
              <Maximize2 size={14} className="text-yellow-400" /> Tamanho da foto na página inicial
              <span className="text-yellow-400 normal-case font-mono">{imageHeight}px</span>
            </label>
            <input
              type="range"
              min={MIN_IMAGE_HEIGHT}
              max={MAX_IMAGE_HEIGHT}
              step={10}
              value={imageHeight}
              onChange={(e) => setImageHeight(Number(e.target.value))}
              className="w-full accent-yellow-400 cursor-pointer"
            />
            <p className="text-xs text-slate-600 mt-1">
              Arraste para ver o tamanho na hora, depois clique em "Salvar" abaixo para publicar.
            </p>
          </div>
        )}
      </div>

      {/* Nome do prêmio + links */}
      <form onSubmit={handleSaveDetails} className="bg-slate-900 rounded-xl border border-slate-800/60 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
          <Ticket size={16} className="text-yellow-400" /> Nome do Prêmio e Links
        </h3>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nome do prêmio</label>
          <input
            type="text"
            value={prizeName}
            onChange={(e) => setPrizeName(e.target.value)}
            placeholder="Ex: Relógio Garmin Forerunner 965"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Link da plataforma de rifa</label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
          />
          {link.trim() && (
            <a
              href={link.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 mt-2"
            >
              Testar link <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
            <MessageCircle size={14} className="text-emerald-400" /> Link do grupo de WhatsApp (dúvidas e resultados)
          </label>
          <input
            type="url"
            value={whatsappLink}
            onChange={(e) => setWhatsappLink(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
          />
          <p className="text-xs text-slate-600 mt-1.5">Opcional. Se preenchido, aparece um botão na página inicial abaixo de "Participar da Rifa".</p>
        </div>

        {detailsError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
            {detailsError}
          </div>
        )}
        {detailsSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-3">
            Dados salvos!
          </div>
        )}

        <button
          type="submit"
          disabled={savingDetails}
          className="bg-yellow-400 text-slate-900 px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-60 disabled:cursor-wait"
        >
          <Save size={18} /> {savingDetails ? 'Salvando...' : 'Salvar'}
        </button>
      </form>

      {/* Publicar na página inicial */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-lg ${settings.enabled ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
            <Gift size={24} className={settings.enabled ? 'text-emerald-400' : 'text-slate-500'} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Status na Página Inicial</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Status: <span className={`font-bold ${settings.enabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                {settings.enabled ? '✓ Visível para todos' : '✗ Oculta'}
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
            <span className="text-sm font-bold text-white block">Mostrar a seção da rifa no site</span>
            <span className="text-xs text-slate-500">
              {togglingEnabled ? 'Salvando...' : 'Precisa de foto, nome do prêmio e link salvos antes de publicar.'}
            </span>
          </div>
        </label>

        {enabledError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
            {enabledError}
          </div>
        )}
      </div>
    </div>
  );
};
