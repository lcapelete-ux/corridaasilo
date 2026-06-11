
import React, { useState, useRef } from 'react';
import { ArrowLeft, Search, Upload, CheckCircle, FileText, User, AlertCircle } from 'lucide-react';
import { getRunners, updateRunner } from '../services/storageService';
import { Runner } from '../types';

interface ProofUploadScreenProps {
  onBack: () => void;
}

export const ProofUploadScreen: React.FC<ProofUploadScreenProps> = ({ onBack }) => {
  const [step, setStep] = useState<'search' | 'upload' | 'success'>('search');
  const [cpf, setCpf] = useState('');
  const [runner, setRunner] = useState<Runner | null>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Mask
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2');
    value = value.replace(/(-\d{2})\d+?$/, '$1');

    setCpf(value);
    setError('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (cpf.length < 14) {
      setError('CPF incompleto.');
      return;
    }

    const runners = getRunners();
    const found = runners.find(r => r.cpf === cpf);

    if (found) {
      setRunner(found);
      setStep('upload');
      // Se já tiver comprovante, preenche o estado, mas permite trocar
      if (found.paymentProof) {
        setProofFile(found.paymentProof);
      }
    } else {
      setError('Inscrição não encontrada para este CPF.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = () => {
    if (runner && proofFile) {
      const updatedRunner = { ...runner, paymentProof: proofFile };
      updateRunner(updatedRunner);
      setStep('success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans animate-fade-in">
      
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 text-slate-400 hover:text-yellow-400 transition-colors flex items-center gap-2 font-bold uppercase tracking-wider text-xs"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

        {step === 'search' && (
          <div className="animate-slide-up">
            <div className="flex justify-center mb-6">
              <div className="bg-slate-800 p-4 rounded-full">
                <Search size={32} className="text-yellow-400" />
              </div>
            </div>
            
            <h2 className="text-2xl font-black italic text-center mb-2">Enviar Comprovante</h2>
            <p className="text-slate-400 text-center text-sm mb-6">
              Digite seu CPF para localizar sua inscrição e anexar o pagamento.
            </p>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">CPF do Atleta</label>
                <input
                  type="text"
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
                className="w-full bg-yellow-400 text-slate-900 font-black italic uppercase py-3 rounded-xl hover:bg-white transition-colors flex justify-center items-center gap-2"
              >
                Buscar Inscrição
              </button>
            </form>
          </div>
        )}

        {step === 'upload' && runner && (
          <div className="animate-slide-up">
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
               <div className="flex items-center gap-3 mb-2">
                 <div className="bg-slate-700 p-2 rounded-full"><User size={16} className="text-slate-300"/></div>
                 <div>
                   <p className="text-xs text-slate-500 uppercase font-bold">Atleta</p>
                   <p className="font-bold text-lg leading-none">{runner.fullName}</p>
                 </div>
               </div>
               <div className="flex items-center gap-2 text-sm text-slate-400 ml-1">
                 <span className="bg-slate-900 px-2 py-0.5 rounded text-xs border border-slate-700">{runner.teamName}</span>
                 <span>•</span>
                 <span>{runner.city}</span>
               </div>
            </div>

            <h3 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
              <Upload size={16} className="text-yellow-400"/> Anexar Arquivo
            </h3>

            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-6 group ${
                proofFile 
                  ? 'border-emerald-500/50 bg-emerald-500/10' 
                  : 'border-slate-700 hover:border-yellow-400 hover:bg-slate-800'
              }`}
            >
              {proofFile ? (
                <div className="flex flex-col items-center text-emerald-400">
                  <CheckCircle size={40} className="mb-2" />
                  <span className="font-bold">Arquivo Selecionado!</span>
                  <span className="text-xs opacity-70 mt-1">Clique para trocar</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400 group-hover:text-yellow-400">
                  <FileText size={40} className="mb-2 transition-transform group-hover:scale-110" />
                  <span className="font-bold">Clique para selecionar</span>
                  <span className="text-xs opacity-50 mt-1">Foto ou PDF do comprovante</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmitProof}
              disabled={!proofFile}
              className={`w-full py-4 rounded-xl font-black italic uppercase tracking-wider transition-all shadow-lg ${
                proofFile 
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {proofFile ? 'Confirmar Envio' : 'Selecione um arquivo'}
            </button>
          </div>
        )}

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
    </div>
  );
};
