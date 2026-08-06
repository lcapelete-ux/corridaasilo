
import React, { useState, useRef } from 'react';
import { Copy, Check, Timer, QrCode, Tag, AlertCircle, Upload, FileText, CheckCircle, ShieldAlert } from 'lucide-react';
import { REGISTRATION_PRICE, REGISTRATION_PRICE_SENIOR } from '../constants';
import { prepareProofFile } from '../services/imageUtils';
import { attachPaymentProof } from '../services/storageService';
import { RafflePromo } from './RafflePromo';
import { PayerSelector } from './PayerSelector';
import { RaffleSettings } from '../types';

interface RegistrationSuccessProps {
  onBack: () => void;
  isSenior: boolean;
  discount?: number; // Desconto do cupom da academia (R$) ou de apoiador (60+)
  seniorFullPrice?: boolean; // 60+ que optou por não usar a meia-inscrição (ajuda o Lar São Cristóvão)
  extraDonation?: number; // Contribuição extra opcional somada à inscrição
  cpf?: string; // CPF do inscrito (permite enviar o comprovante aqui mesmo)
  isMinor?: boolean; // Menor de 18 no dia do evento: exige autorização junto
  raffleSettings?: RaffleSettings;
}

export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({ onBack, isSenior, discount = 0, seniorFullPrice = false, extraDonation = 0, cpf, isMinor = false, raffleSettings }) => {
  const [copied, setCopied] = useState(false);
  const pixKey = "corridaasilo@gmail.com";

  // Envio do comprovante direto nesta tela (usa o CPF que acabou de se inscrever)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const authInputRef = useRef<HTMLInputElement>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [authFile, setAuthFile] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [preparingAuth, setPreparingAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [proofError, setProofError] = useState('');

  // Quem pagou: o próprio atleta ou outra pessoa
  const [payerName, setPayerName] = useState('');
  const [payerIsThirdParty, setPayerIsThirdParty] = useState(false);

  const needsAuth = isMinor && !authFile; // menor precisa anexar a autorização

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreparing(true);
    setProofError('');
    try {
      setProofFile(await prepareProofFile(file));
    } catch (err: any) {
      setProofError(err?.message || 'Não foi possível preparar o arquivo.');
    } finally {
      setPreparing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAuthFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreparingAuth(true);
    setProofError('');
    try {
      setAuthFile(await prepareProofFile(file));
    } catch (err: any) {
      setProofError(err?.message || 'Não foi possível preparar a autorização.');
    } finally {
      setPreparingAuth(false);
      if (authInputRef.current) authInputRef.current.value = '';
    }
  };

  const handleSubmitProof = async () => {
    if (!cpf || !proofFile) return;
    if (needsAuth) {
      setProofError('Atleta menor de 18: anexe também a autorização assinada do responsável.');
      return;
    }
    if (payerIsThirdParty && !payerName.trim()) {
      setProofError('Informe o nome de quem fez o pagamento.');
      return;
    }
    setBusy(true);
    setProofError('');
    try {
      await attachPaymentProof(cpf, proofFile, authFile || undefined, payerIsThirdParty ? payerName : undefined);
      setSent(true);
    } catch (err: any) {
      setProofError(err?.message || 'Erro ao enviar o comprovante. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };
  const basePrice = isSenior && !seniorFullPrice ? REGISTRATION_PRICE_SENIOR : REGISTRATION_PRICE;
  const finalPrice = Math.max(0, basePrice - discount) + extraDonation;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const price = fmt(finalPrice);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative">
        
        {/* Header Visual */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
          <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-400/20 z-10 relative">
            <Check size={40} className="text-slate-900" strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-wider relative z-10">Inscrição Confirmada!</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium relative z-10">Garanta sua vaga finalizando o pagamento.</p>
          
          {/* Decorative Circle */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-800 rounded-full opacity-50"></div>
          <div className="absolute top-10 -left-10 w-20 h-20 bg-slate-800 rounded-full opacity-50"></div>
        </div>

        {/* Payment Card Body */}
        <div className="p-8">
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center mb-6 relative overflow-hidden">
            {isSenior && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                 <Tag size={10} /> 60+
              </div>
            )}
            
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-2">
              {seniorFullPrice ? "Inscrição de Apoiador (60+)" : isSenior ? "Valor com Desconto (60+)" : "Valor da Inscrição"}
            </p>
            <div className="flex items-center justify-center gap-1 text-slate-900">
              <span className="text-xl font-medium">R$</span>
              <span className="text-5xl font-black tracking-tighter">{price}</span>
            </div>
            {discount > 0 && (
              <p className="mt-2 text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                <Tag size={11} /> {seniorFullPrice ? 'Desconto de apoiador' : 'Cupom aplicado'}: R$ {fmt(basePrice)} − R$ {fmt(discount)} de desconto
              </p>
            )}
            {extraDonation > 0 && (
              <p className="mt-2 text-xs font-bold text-indigo-600 flex items-center justify-center gap-1">
                <Tag size={11} /> Contribuição extra: + R$ {fmt(extraDonation)}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <QrCode className="text-yellow-500" />
              <span className="font-bold text-slate-700">Pagamento via PIX</span>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col gap-2 relative">
              <span className="text-xs text-yellow-700 font-bold uppercase">Chave PIX (E-mail)</span>
              <p className="font-mono text-slate-900 font-bold text-lg break-all">{pixKey}</p>
              
              <button 
                onClick={handleCopy}
                className={`absolute right-3 top-3 p-2 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white text-slate-500 hover:text-slate-900 shadow-sm'}`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            {/* Envio do comprovante — direto aqui (usando o CPF da inscrição) */}
            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={22} />
                <div className="text-sm">
                  <p className="font-bold text-emerald-900 leading-tight mb-1">Comprovante enviado!</p>
                  <p className="text-xs text-emerald-700/80 leading-relaxed">
                    Recebemos seu comprovante. A confirmação do pagamento é feita manualmente pela organização.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={20} />
                  <div className="text-sm">
                    <p className="font-bold text-indigo-900 leading-tight mb-1">
                      Já pagou? Envie o comprovante aqui.
                    </p>
                    <p className="text-xs text-indigo-600/80 leading-relaxed">
                      Anexe o comprovante do PIX (foto ou PDF). Você também pode enviar depois na tela inicial,
                      em “Enviar comprovante”, digitando seu CPF.
                    </p>
                  </div>
                </div>

                {cpf ? (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div
                      onClick={() => !preparing && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        proofFile ? 'border-emerald-400 bg-emerald-50' : 'border-indigo-200 bg-white hover:border-yellow-400'
                      } ${preparing ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      {preparing ? (
                        <div className="flex flex-col items-center text-slate-500">
                          <Upload size={26} className="mb-2 animate-pulse" />
                          <span className="font-bold text-sm">Preparando arquivo...</span>
                        </div>
                      ) : proofFile ? (
                        <div className="flex flex-col items-center text-emerald-600">
                          <CheckCircle size={26} className="mb-2" />
                          <span className="font-bold text-sm">Comprovante pronto para enviar</span>
                          <span className="text-xs opacity-70 mt-1">Toque para trocar</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-slate-500">
                          <FileText size={26} className="mb-2" />
                          <span className="font-bold text-sm">Toque para anexar o comprovante</span>
                          <span className="text-xs opacity-60 mt-1">Foto ou PDF</span>
                        </div>
                      )}
                    </div>

                    {/* Menor de 18: autorização do responsável exigida junto */}
                    {isMinor && (
                      <div className="mt-3">
                        <div className="rounded-xl p-3 mb-2 border bg-amber-50 border-amber-200 flex items-start gap-2">
                          <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800">
                            <strong>Atleta menor de 18 anos.</strong> Anexe também a <strong>autorização assinada</strong> do responsável.{' '}
                            <a
                              href={`${import.meta.env.BASE_URL}autorizacao-menor.html`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-bold text-amber-900 hover:text-amber-950"
                            >
                              Baixar modelo
                            </a>.
                          </p>
                        </div>
                        <input
                          type="file"
                          ref={authInputRef}
                          accept="image/*,application/pdf"
                          onChange={handleAuthFileChange}
                          className="hidden"
                        />
                        <div
                          onClick={() => !preparingAuth && authInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                            authFile ? 'border-emerald-400 bg-emerald-50' : 'border-amber-300 bg-white hover:border-amber-400'
                          } ${preparingAuth ? 'opacity-60 cursor-wait' : ''}`}
                        >
                          {preparingAuth ? (
                            <div className="flex flex-col items-center text-slate-500">
                              <Upload size={22} className="mb-1.5 animate-pulse" />
                              <span className="font-bold text-sm">Preparando...</span>
                            </div>
                          ) : authFile ? (
                            <div className="flex flex-col items-center text-emerald-600">
                              <CheckCircle size={22} className="mb-1.5" />
                              <span className="font-bold text-sm">Autorização pronta</span>
                              <span className="text-xs opacity-70 mt-0.5">Toque para trocar</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-amber-600">
                              <ShieldAlert size={22} className="mb-1.5" />
                              <span className="font-bold text-sm">Anexar autorização assinada</span>
                              <span className="text-xs opacity-60 mt-0.5">Foto ou PDF</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quem pagou (só faz sentido quando há um comprovante para enviar) */}
                    {proofFile && (
                      <PayerSelector
                        payerName={payerName}
                        onChange={setPayerName}
                        isThirdParty={payerIsThirdParty}
                        onChangeIsThirdParty={setPayerIsThirdParty}
                        variant="light"
                      />
                    )}

                    {proofError && (
                      <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1">
                        <AlertCircle size={12} /> {proofError}
                      </p>
                    )}

                    {proofFile && (
                      <button
                        onClick={handleSubmitProof}
                        disabled={busy || needsAuth}
                        className="w-full mt-3 py-3 rounded-xl font-black italic uppercase tracking-wider transition-all shadow bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? 'Enviando...' : 'Enviar comprovante'}
                      </button>
                    )}
                    {proofFile && needsAuth && (
                      <p className="text-amber-600 text-xs mt-2 text-center font-bold flex items-center justify-center gap-1">
                        <ShieldAlert size={12} /> Anexe a autorização do responsável para liberar o envio.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                    Envie o comprovante na tela inicial, em “Enviar comprovante”, digitando seu CPF.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Action */}
        <div className="bg-slate-50 p-6 border-t border-slate-100">
          <button
            onClick={onBack}
            className="w-full bg-slate-900 text-yellow-400 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Timer size={20} /> Voltar ao Início
          </button>
        </div>
      </div>

      {/* Rifa Solidária: divulgada também após a inscrição */}
      {raffleSettings?.enabled && raffleSettings.imageUrl && raffleSettings.link && (
        <div className="mt-6">
          <RafflePromo settings={raffleSettings} variant="light" />
        </div>
      )}
      </div>
    </div>
  );
};
