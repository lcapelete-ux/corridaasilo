import React, { useState, useRef } from 'react';
import { Runner, UserSession, Gender, ShirtSize } from '../types';
import { Search, Trash2, Users, MapPin, Eye, X, Printer, Calendar, CreditCard, User, Flag, Award, Download, Upload, CheckCircle, Clock, ArrowRightLeft, Save, AlertCircle, FileImage, List } from 'lucide-react';

interface RunnerListProps {
  runners: Runner[];
  onDelete: (id: string) => void;
  onUpdate?: (runner: Runner) => void;
  userSession?: UserSession | null;
}

// Modal de transferência tem fundo branco: cores explícitas + color-scheme light
// para o texto não sumir quando o celular está em modo escuro
const transferInputCls = "w-full p-2 bg-white border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 outline-none [color-scheme:light]";

export const RunnerList: React.FC<RunnerListProps> = ({ runners, onDelete, onUpdate, userSession }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null);
  const [activeTab, setActiveTab] = useState<'lista' | 'comprovantes'>('lista');

  // Estados para Transferência
  const [transferRunner, setTransferRunner] = useState<Runner | null>(null);
  const [transferData, setTransferData] = useState<Partial<Runner>>({});

  // Ref para o input de arquivo (hack para abrir o seletor via botão)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const filteredRunners = runners.filter(r => 
    r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cpf.includes(searchTerm) ||
    r.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // Se for formato ISO data completa
    if (dateString.includes('T')) {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    // Se for apenas YYYY-MM-DD (nascimento)
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const calculateAge = (birthDateString: string): number => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    // Cabeçalhos das colunas
    const headers = [
      'ID', 
      'Nome Completo', 
      'CPF', 
      'Data Nascimento', 
      'Idade', 
      'Gênero', 
      'Cidade', 
      'Equipe', 
      'Tamanho Camiseta', 
      'Email', 
      'Data Inscrição',
      'Pagamento Confirmado'
    ];

    // Mapear dados para linhas do CSV
    const rows = filteredRunners.map(runner => {
      // Formatar data de nascimento para DD/MM/AAAA
      const birthDateFormatted = runner.birthDate.split('-').reverse().join('/');
      // Formatar data de inscrição
      const regDateFormatted = new Date(runner.registrationDate).toLocaleDateString('pt-BR');

      return [
        `"${runner.id}"`,
        `"${runner.fullName}"`,
        `"${runner.cpf}"`,
        `"${birthDateFormatted}"`,
        `"${runner.age}"`,
        `"${runner.gender}"`,
        `"${runner.city}"`,
        `"${runner.teamName}"`,
        `"${runner.shirtSize}"`,
        `"${runner.email}"`,
        `"${regDateFormatted}"`,
        `"${runner.isPaid ? 'SIM' : 'NÃO'}"`
      ].join(',');
    });

    // Combinar cabeçalho e linhas
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Adicionar BOM para Excel reconhecer acentuação UTF-8 corretamente
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    
    // Criar link de download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inscritos_corrida_noturna_lsc_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Limpeza
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerUpload = (runnerId: string) => {
    setUploadingId(runnerId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingId && onUpdate) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const runner = runners.find(r => r.id === uploadingId);
        if (runner) {
          const updatedRunner = { ...runner, paymentProof: base64String, isPaid: runner.isPaid };
          onUpdate(updatedRunner);
          if (selectedRunner?.id === uploadingId) {
            setSelectedRunner(updatedRunner);
          }
          alert("Comprovante enviado com sucesso!");
        }
        setUploadingId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePaidStatus = (runner: Runner) => {
    if (onUpdate) {
      onUpdate({ ...runner, isPaid: !runner.isPaid });
    }
  };

  // --- Lógica de Transferência ---

  const openTransferModal = (runner: Runner) => {
    setTransferRunner(runner);
    setTransferData({
      fullName: runner.fullName,
      cpf: runner.cpf,
      email: runner.email,
      birthDate: runner.birthDate,
      gender: runner.gender,
      city: runner.city,
      teamName: runner.teamName,
      shirtSize: runner.shirtSize
    });
  };

  const handleTransferChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTransferData(prev => ({ ...prev, [name]: value }));
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferRunner || !onUpdate) return;

    // Recalcula idade se a data mudou
    const newAge = transferData.birthDate ? calculateAge(transferData.birthDate) : transferRunner.age;

    // Só marca como transferida se o titular realmente mudou (nome ou CPF);
    // correções de email/cidade não contam como transferência
    const holderChanged =
      (transferData.fullName && transferData.fullName.trim() !== transferRunner.fullName.trim()) ||
      (transferData.cpf && transferData.cpf.trim() !== transferRunner.cpf.trim());

    const updatedRunner: Runner = {
      ...transferRunner,
      ...transferData as Runner, // Sobrescreve dados pessoais
      age: newAge,
      // Mantém ID, Data de registro original, Pagamento e Comprovante (pois a vaga está paga)
      ...(holderChanged && {
        transferredFrom: transferRunner.fullName,
        transferredAt: new Date().toISOString(),
      }),
    };

    if (confirm(`Confirma a transferência da inscrição para ${updatedRunner.fullName}?`)) {
      onUpdate(updatedRunner);
      setTransferRunner(null);
      setTransferData({});
      if (holderChanged) {
        alert(`Inscrição transferida de ${transferRunner.fullName} para ${updatedRunner.fullName}.`);
      }
    }
  };

  // Verifica permissão de edição financeira (Admin ou Team Leader)
  const canEditFinancials = userSession?.role === 'admin' || userSession?.role === 'team_leader';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Input de arquivo oculto global para o componente */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,application/pdf"
        className="hidden"
      />

      {/* Header & Tabs */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-4 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-indigo-400" />
              Participantes ({runners.length})
            </h2>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors"
              title="Baixar Excel/CSV"
            >
              <Download size={14} /> Exportar
            </button>
          </div>

          {activeTab === 'lista' && (
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, equipe, cidade ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all text-sm"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('lista')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'lista'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List size={15} /> Lista
          </button>
          <button
            onClick={() => setActiveTab('comprovantes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'comprovantes'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileImage size={15} /> Comprovantes
            {runners.filter(r => r.paymentProof).length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${
                activeTab === 'comprovantes' ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {runners.filter(r => r.paymentProof).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Comprovantes View */}
      {activeTab === 'comprovantes' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-4 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Comprovantes recebidos</p>
              <p className="text-white font-bold text-2xl">
                {runners.filter(r => r.paymentProof).length}
                <span className="text-slate-600 font-normal text-base"> de {runners.length} inscritos</span>
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-emerald-400 font-bold text-lg">{runners.filter(r => r.paymentProof && r.isPaid).length}</p>
                <p className="text-slate-500 text-xs">Confirmados</p>
              </div>
              <div className="text-center">
                <p className="text-amber-400 font-bold text-lg">{runners.filter(r => r.paymentProof && !r.isPaid).length}</p>
                <p className="text-slate-500 text-xs">Pendentes</p>
              </div>
            </div>
          </div>

          {/* Cards grid */}
          {runners.filter(r => r.paymentProof).length === 0 ? (
            <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-12 text-center">
              <FileImage size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum comprovante recebido ainda.</p>
              <p className="text-slate-600 text-sm mt-1">Os comprovantes enviados pelos inscritos aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {runners.filter(r => r.paymentProof).map(runner => (
                <div key={runner.id} className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden hover:border-indigo-500/30 transition-all">
                  {/* Card Header */}
                  <div className="p-4 flex items-start justify-between gap-3 border-b border-slate-800">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{runner.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{runner.cpf}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          runner.teamName === 'Avulso' ? 'bg-slate-800 text-slate-300' : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {runner.teamName}
                        </span>
                        {runner.transferredFrom && (
                          <span
                            className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                            title={`Titular anterior: ${runner.transferredFrom}`}
                          >
                            <ArrowRightLeft size={10} /> Transferida
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (onUpdate) {
                            const updated = { ...runner, isPaid: !runner.isPaid };
                            onUpdate(updated);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          runner.isPaid
                            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                        }`}
                      >
                        {runner.isPaid
                          ? <><CheckCircle size={12} /> PAGO</>
                          : <><Clock size={12} /> PENDENTE</>
                        }
                      </button>
                      <button
                        onClick={() => setSelectedRunner(runner)}
                        className="text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                      >
                        <Eye size={12} /> Ver ficha
                      </button>
                    </div>
                  </div>

                  {/* Proof Image */}
                  <div className="p-3 bg-slate-950/40">
                    <img
                      src={runner.paymentProof}
                      alt={`Comprovante de ${runner.fullName}`}
                      className="w-full rounded-lg border border-slate-800 object-contain max-h-64 bg-slate-950 cursor-zoom-in"
                      onClick={() => setSelectedRunner(runner)}
                      title="Clique para ver a ficha completa"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {activeTab === 'lista' && (
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Atleta</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Local/CPF</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Idade/Gênero</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipe</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Pagto</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRunners.length > 0 ? (
                filteredRunners.map((runner) => (
                  <tr key={runner.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{runner.fullName}</div>
                      <div className="text-xs text-slate-500">{runner.email}</div>
                      {runner.transferredFrom && (
                        <span
                          className="inline-flex items-center gap-1 mt-1 bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          title={`Titular anterior: ${runner.transferredFrom}`}
                        >
                          <ArrowRightLeft size={10} /> Transferida
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-slate-300">
                        <MapPin size={12} className="text-slate-500"/> {runner.city}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{runner.cpf}</div>
                    </td>
                    <td className="p-4 text-slate-300">
                      {runner.age} anos <br/>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{runner.gender}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        runner.teamName === 'Avulso' ? 'bg-slate-800 text-slate-300' : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {runner.teamName}
                      </span>
                      <div className="mt-1 text-xs text-slate-500">
                        👕 {runner.shirtSize}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        {runner.isPaid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold">
                            <CheckCircle size={14} /> Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-bold">
                            <Clock size={14} /> Pendente
                          </span>
                        )}

                        {runner.paymentProof ? (
                          <button
                            onClick={() => setSelectedRunner(runner)}
                            className="text-xs text-indigo-400 hover:underline text-left flex items-center gap-1"
                          >
                            <Eye size={12} /> Ver Comprovante
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerUpload(runner.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit transition-colors border border-slate-700"
                            title="Fazer upload do comprovante"
                          >
                            <Upload size={12} /> Enviar Comp.
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {userSession?.role === 'admin' && (
                          <button
                            onClick={() => openTransferModal(runner)}
                            className="p-2 rounded-lg text-slate-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                            title="Transferir Inscrição (Editar Titular)"
                          >
                            <ArrowRightLeft size={18} />
                          </button>
                        )}

                        {canEditFinancials && (
                          <button
                            onClick={() => togglePaidStatus(runner)}
                            className={`p-2 rounded-lg transition-colors ${runner.isPaid ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-emerald-400'}`}
                            title={runner.isPaid ? "Marcar como não pago" : "Confirmar pagamento"}
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedRunner(runner)}
                          className="text-slate-500 hover:text-indigo-400 transition-colors p-2 hover:bg-indigo-500/10 rounded-lg"
                          title="Ver Ficha Completa"
                        >
                          <Eye size={18} />
                        </button>

                        {userSession?.role === 'admin' && (
                          <button
                            onClick={() => onDelete(runner.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                            title="Remover inscrito"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-600">
                    Nenhum corredor encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* MODAL DE TRANSFERÊNCIA DE INSCRIÇÃO */}
      {transferRunner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="bg-orange-500 p-6 flex justify-between items-center text-white">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <ArrowRightLeft /> Transferir Inscrição
              </h3>
              <button onClick={() => setTransferRunner(null)} className="hover:text-orange-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-orange-50 p-4 rounded-lg text-sm text-orange-800 border border-orange-200 mb-4">
                <strong>Atenção:</strong> Você está editando os dados do titular desta inscrição.
                O status de pagamento e o ID da inscrição serão mantidos.
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Novo Titular (Nome Completo)</label>
                <input required name="fullName" value={transferData.fullName || ''} onChange={handleTransferChange} className={transferInputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">CPF</label>
                   <input required name="cpf" value={transferData.cpf || ''} onChange={handleTransferChange} className={transferInputCls} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Nascimento</label>
                   <input required type="date" name="birthDate" value={transferData.birthDate || ''} onChange={handleTransferChange} className={transferInputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Gênero</label>
                   <select name="gender" value={transferData.gender} onChange={handleTransferChange} className={transferInputCls}>
                      {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1">Camiseta</label>
                   <select name="shirtSize" value={transferData.shirtSize} onChange={handleTransferChange} className={transferInputCls}>
                      {Object.values(ShirtSize).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <input type="email" name="email" value={transferData.email || ''} onChange={handleTransferChange} className={transferInputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cidade</label>
                  <input name="city" value={transferData.city || ''} onChange={handleTransferChange} className={transferInputCls} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Equipe</label>
                  <input name="teamName" value={transferData.teamName || ''} onChange={handleTransferChange} className={transferInputCls} />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setTransferRunner(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 flex items-center gap-2">
                  <Save size={18} /> Salvar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO COMPLETO */}
      {selectedRunner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up print:shadow-none print:w-full print:max-w-none">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 flex justify-between items-start print:bg-white print:border-b print:border-slate-300 print:text-black">
              <div>
                <h3 className="text-yellow-400 font-black italic text-xl uppercase tracking-wider print:text-slate-900">Ficha de Inscrição</h3>
                <p className="text-slate-400 text-xs mt-1 print:text-slate-600">ID: {selectedRunner.id}</p>
              </div>
              <button 
                onClick={() => setSelectedRunner(null)}
                className="text-slate-400 hover:text-white transition-colors print:hidden"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible">

              {/* Aviso de Transferência */}
              {selectedRunner.transferredFrom && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg text-orange-500 shrink-0">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-800 uppercase tracking-wide">Inscrição Transferida</p>
                    <p className="text-sm text-orange-700 mt-0.5">
                      Titular anterior: <strong>{selectedRunner.transferredFrom}</strong>
                      {selectedRunner.transferredAt && (
                        <> — transferida em {formatDate(selectedRunner.transferredAt)}</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Seção 1: Dados Pessoais */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Dados Pessoais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><User size={18}/></div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Nome Completo</p>
                      <p className="text-slate-800 font-medium text-lg">{selectedRunner.fullName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><CreditCard size={18}/></div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">CPF</p>
                      <p className="text-slate-800 font-medium">{selectedRunner.cpf}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Calendar size={18}/></div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Nascimento</p>
                      <p className="text-slate-800 font-medium">
                        {formatDate(selectedRunner.birthDate)} ({selectedRunner.age} anos)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><User size={18}/></div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Gênero</p>
                      <p className="text-slate-800 font-medium">{selectedRunner.gender}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados da Prova */}
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Dados da Prova</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Flag size={18}/></div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Equipe</p>
                      <p className="text-slate-800 font-medium bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                        {selectedRunner.teamName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Award size={18}/></div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Tamanho da Camiseta</p>
                      <p className="text-slate-800 font-bold text-lg">{selectedRunner.shirtSize}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Pagamento (Nova) */}
              <div className="break-inside-avoid">
                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Pagamento & Comprovante</h4>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 font-bold">Status Atual</p>
                        <div className="flex items-center gap-2">
                          <p className={`text-lg font-bold ${selectedRunner.isPaid ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {selectedRunner.isPaid ? 'PAGAMENTO CONFIRMADO' : 'AGUARDANDO CONFIRMAÇÃO'}
                          </p>
                          {canEditFinancials && (
                            <button 
                              onClick={() => {
                                togglePaidStatus(selectedRunner);
                                setSelectedRunner(prev => prev ? ({...prev, isPaid: !prev.isPaid}) : null);
                              }}
                              className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-semibold"
                            >
                              {selectedRunner.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="print:hidden">
                        <button 
                           onClick={() => triggerUpload(selectedRunner.id)}
                           className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-2"
                        >
                           <Upload size={14}/> {selectedRunner.paymentProof ? 'Substituir Comprovante' : 'Anexar Comprovante'}
                        </button>
                      </div>
                    </div>

                    {selectedRunner.paymentProof ? (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 font-bold mb-2 flex items-center gap-1">
                          <AlertCircle size={12} className="text-indigo-500"/> Comprovante Anexado:
                        </p>
                        <img src={selectedRunner.paymentProof} alt="Comprovante" className="max-w-full h-auto max-h-[300px] rounded border border-slate-200 object-contain mx-auto bg-white" />
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-sm bg-slate-50/50">
                        Nenhum comprovante foi anexado ainda.
                      </div>
                    )}
                 </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-6 flex justify-between items-center print:hidden">
              <span className="text-xs text-slate-400 font-mono">CORRIDA NOTURNA LSC</span>
              <div className="flex gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <Printer size={18} /> Imprimir Ficha
                </button>
                <button 
                  onClick={() => setSelectedRunner(null)}
                  className="px-6 py-2 bg-slate-900 text-yellow-400 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};