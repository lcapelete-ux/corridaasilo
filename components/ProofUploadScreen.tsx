
import React, { useState, useRef } from 'react';
import { ArrowLeft, Search, Upload, CheckCircle, FileText, User, AlertCircle, Clock, Eye, ShieldAlert, ShieldCheck } from 'lucide-react';
import { findRunnerByCpf, attachPaymentProof } from '../services/storageService';
import { prepareProofFile, isPdfProof } from '../services/imageUtils';
import { isMinorAtEvent } from '../constants';
import { Runner } from '../types';

interface ProofUploadScreenProps {
  onBack: () => void;
}

export const ProofUploadScreen: React.FC<ProofUploadScreenProps> = ({ onBack }) => {
  const [step, setStep] = useState<'search' | 'view' | 'success'>('search');
  const [cpf, setCpf] = useState('');
  const [runner, setRunner] = useState<Partial<Runner> | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [proofFile, setProofFile] = useState<string | null>(null); // novo arquivo escolhido (ainda não enviado)
  const [existingProof, setExistingProof] = useState<string | null>(null); // comprovante já salvo no banco
  const [error, setError] = useState('');
  const [showProofFull, setShowProofFull] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Menor de 18: autorização do responsável exigida junto com o comprovante
  const [authFile, setAuthFile] = useState<string | null>(null);         // nova autorização escolhida
  const [existingHasAuth, setExistingHasAuth] = useState(false);          // já enviou autorização antes?
  const [preparingAuth, setPreparingAuth] = useState(false);
  const authInputRef = useRef<HTMLInputElement>(null);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2');
    value = value.replace(/(-\d{2})\d+?$/, '$1');
    setCpf(value);
    setError('');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf.length < 14) {
      setError('CPF incompleto.');
      return;
    }

    setBusy(true);
    try {
      const found = await findRunnerByCpf(cpf);
      if (found) {
        setRunner(found);
        setExistingProof(found.paymentProof || null);
        setExistingHasAuth(!!found.hasAuthorization);
        setProofFile(null);
        setAuthFile(null);
        setStep('view');
      } else {
        setError('Inscrição não encontrada para este CPF.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao buscar. Verifique sua internet.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreparing(true);
    setError('');
    try {
      const prepared = await prepareProofFile(file);
      setProofFile(prepared);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível preparar o arquivo.');
    } finally {
      setPreparing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAuthFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreparingAuth(true);
    setError('');
    try {
      const prepared = await prepareProofFile(file);
      setAuthFile(prepared);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível preparar a autorização.');
    } finally {
      setPreparingAuth(false);
      if (authInputRef.current) authInputRef.current.value = '';
    }
  };

  const isMinor = isMinorAtEvent(runner?.birthDate || '');
  // Menor sem autorização (nem nova nem já enviada) não pode enviar
  const needsAuth = isMinor && !authFile && !existingHasAuth;

  const handleSubmitProof = async () => {
    if (!runner || !proofFile) return;
    if (needsAuth) {
      setError('Atleta menor de 18 anos: anexe também a autorização assinada do responsável para enviar.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await attachPaymentProof(runner.cpf || cpf, proofFile, authFile || undefined);
      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar o comprovante. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const isPaid = !!runner?.isPaid;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans animate-fade-in">

      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-slate-400 hover:text-yellow-400 transition-colors flex items-center gap-2 font-bold uppercase tracking-wider text-xs"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

        {/* PASSO 1: Buscar por CPF */}
        {step === 'search' && (
          <div className="animate-slide-up">
            <div className="flex justify-center mb-6">
              <div className="bg-slate-800 p-4 rounded-full">
                <Search size={32} className="text-yellow-400" />
              </div>
            </div>

            <h2 className="text-2xl font-black italic text-center mb-2">Minha Inscrição</h2>
            <p className="text-slate-400 text-center text-sm mb-6">
              Digite seu CPF para ver o status do pagamento e enviar ou conferir seu comprovante.
            </p>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">CPF do Atleta</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all placeholder:text-slate-700"
                  autoFocus
                />
                {error && <p className="text-red-400 text-xs mt-2 font-bold flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-yellow-400 text-slate-900 font-black italic uppercase py-3 rounded-xl hover:bg-white transition-colors flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-wait"
              >
                {busy ? 'Buscando...' : 'Buscar Inscrição'}
              </button>
            </form>
          </div>
        )}

        {/* PASSO 2: Status + comprovante */}
        {step === 'view' && runner && (
          <div className="animate-slide-up">
            {/* Dados do atleta */}
            <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-slate-700 p-2 rounded-full"><User size={16} className="text-slate-300"/></div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 uppercase font-bold">Atleta</p>
                  <p className="font-bold text-lg leading-tight truncate">{runner.fullName}</p>
                </div>
              </div>
              {(runner.teamName || runner.city) && (
                <div className="flex items-center gap-2 text-sm text-slate-400 ml-1 flex-wrap">
                  {runner.teamName && <span className="bg-slate-900 px-2 py-0.5 rounded text-xs border border-slate-700">{runner.teamName}</span>}
                  {runner.teamName && runner.city && <span>•</span>}
                  {runner.city && <span>{runner.city}</span>}
                </div>
              )}
            </div>

            {/* Status do pagamento */}
            <div className={`rounded-xl p-4 mb-4 border flex items-center gap-3 ${
              isPaid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              {isPaid ? (
                <CheckCircle size={24} className="text-emerald-400 shrink-0" />
              ) : (
                <Clock size={24} className="text-amber-400 shrink-0" />
              )}
              <div>
                <p className="text-xs uppercase font-bold text-slate-400">Status do Pagamento</p>
                <p className={`font-black ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isPaid ? 'Pagamento Confirmado' : 'Aguardando Confirmação'}
                </p>
              </div>
            </div>

            {/* Comprovante já enviado */}
            {existingProof && !proofFile && (
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                  <CheckCircle size={13} className="text-emerald-400" /> Comprovante Enviado
                </p>
                <button
                  onClick={() => setShowProofFull(true)}
                  className="block w-full group relative rounded-xl overflow-hidden border border-slate-700"
                >
                  {isPdfProof(existingProof) ? (
                    <div className="bg-slate-800 py-8 flex flex-col items-center text-slate-300">
                      <FileText size={36} />
                      <span className="text-sm font-bold mt-2">Ver comprovante (PDF)</span>
                    </div>
                  ) : (
                    <>
                      <img src={existingProof} alt="Comprovante enviado" className="w-full max-h-52 object-contain bg-slate-950" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="flex items-center gap-1 text-white font-bold text-sm bg-black/60 px-3 py-1.5 rounded-lg">
                          <Eye size={14} /> Ampliar
                        </span>
                      </div>
                    </>
                  )}
                </button>
                {!isPaid && (
                  <p className="text-[11px] text-slate-500 mt-2 text-center">
                    Recebemos seu comprovante. A confirmação é feita manualmente pela organização.
                  </p>
                )}
              </div>
            )}

            {/* Upload de novo / troca */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => !preparing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 group ${
                proofFile
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-yellow-400 hover:bg-slate-800'
              } ${preparing ? 'opacity-60 cursor-wait' : ''}`}
            >
              {preparing ? (
                <div className="flex flex-col items-center text-slate-400">
                  <Upload size={32} className="mb-2 animate-pulse" />
                  <span className="font-bold text-sm">Preparando arquivo...</span>
                </div>
              ) : proofFile ? (
                <div className="flex flex-col items-center text-emerald-400">
                  <CheckCircle size={32} className="mb-2" />
                  <span className="font-bold text-sm">Novo arquivo pronto para enviar</span>
                  <span className="text-xs opacity-70 mt-1">Clique para trocar</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover:text-yellow-400">
                  <FileText size={32} className="mb-2 transition-transform group-hover:scale-110" />
                  <span className="font-bold text-sm">{existingProof ? 'Enviar outro comprovante' : 'Clique para selecionar'}</span>
                  <span className="text-xs opacity-50 mt-1">Foto ou PDF do comprovante</span>
                </div>
              )}
            </div>

            {/* Autorização do responsável (menor de 18) */}
            {isMinor && (
              <div className="mb-4">
                <div className="rounded-xl p-3 mb-3 border bg-amber-500/10 border-amber-500/30 flex items-start gap-2">
                  <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200/90">
                    <strong>Atleta menor de 18 anos.</strong> É obrigatório anexar a <strong>autorização assinada</strong> do pai, mãe ou responsável para validar a inscrição.
                    {' '}
                    <a
                      href={`${import.meta.env.BASE_URL}autorizacao-menor.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold text-amber-100 hover:text-white"
                    >
                      Baixar modelo
                    </a>.
                  </p>
                </div>

                {existingHasAuth && !authFile && (
                  <p className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-2">
                    <ShieldCheck size={14} /> Autorização já recebida. Reenvie apenas se precisar corrigir.
                  </p>
                )}

                <input
                  type="file"
                  ref={authInputRef}
                  accept="image/*,application/pdf"
                  onChange={handleAuthFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => !preparingAuth && authInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all group ${
                    authFile
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-amber-500/40 hover:border-amber-400 hover:bg-slate-800'
                  } ${preparingAuth ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {preparingAuth ? (
                    <div className="flex flex-col items-center text-slate-400">
                      <Upload size={28} className="mb-2 animate-pulse" />
                      <span className="font-bold text-sm">Preparando...</span>
                    </div>
                  ) : authFile ? (
                    <div className="flex flex-col items-center text-emerald-400">
                      <CheckCircle size={28} className="mb-2" />
                      <span className="font-bold text-sm">Autorização pronta para enviar</span>
                      <span className="text-xs opacity-70 mt-1">Clique para trocar</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-amber-300 group-hover:text-amber-200">
                      <ShieldAlert size={28} className="mb-2" />
                      <span className="font-bold text-sm">{existingHasAuth ? 'Reenviar autorização' : 'Anexar autorização assinada'}</span>
                      <span className="text-xs opacity-60 mt-1">Foto ou PDF do documento</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-xs mb-3 font-bold flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}

            {proofFile && (
              <>
                <button
                  onClick={handleSubmitProof}
                  disabled={busy || needsAuth}
                  className="w-full py-4 rounded-xl font-black italic uppercase tracking-wider transition-all shadow-lg bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? 'Enviando...' : 'Confirmar Envio'}
                </button>
                {needsAuth && (
                  <p className="text-amber-400 text-xs mt-2 text-center font-bold flex items-center justify-center gap-1">
                    <ShieldAlert size={12} /> Anexe a autorização do responsável para liberar o envio.
                  </p>
                )}
              </>
            )}

            <button
              onClick={() => { setStep('search'); setRunner(null); setProofFile(null); setExistingProof(null); setAuthFile(null); setExistingHasAuth(false); setCpf(''); }}
              className="w-full mt-3 text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors"
            >
              Buscar outro CPF
            </button>
          </div>
        )}

        {/* PASSO 3: Sucesso */}
        {step === 'success' && (
          <div className="text-center animate-zoom-in py-8">
            <div className="bg-emerald-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black italic text-white mb-2">Recebido!</h2>
            <p className="text-slate-400 mb-8 max-w-xs mx-auto">
              Seu comprovante foi enviado com sucesso. Aguarde a confirmação do pagamento no sistema.
            </p>
            <button
              onClick={onBack}
              className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        )}
      </div>

      {/* Modal: comprovante ampliado */}
      {showProofFull && existingProof && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowProofFull(false)}
        >
          {isPdfProof(existingProof) ? (
            <iframe src={existingProof} title="Comprovante" className="w-full max-w-2xl h-[80vh] rounded-lg bg-white" onClick={e => e.stopPropagation()} />
          ) : (
            <img src={existingProof} alt="Comprovante" className="max-w-full max-h-[85vh] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </div>
  );
};
