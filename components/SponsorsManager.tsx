
import React, { useState, useRef } from 'react';
import { Sponsor, SponsorType } from '../types';
import { Plus, Trash2, CheckCircle, XCircle, Upload, DollarSign, Briefcase } from 'lucide-react';

interface SponsorsManagerProps {
  sponsors: Sponsor[];
  onSave: (sponsor: Sponsor) => void;
  onUpdate: (sponsor: Sponsor) => void;
  onDelete: (id: string) => void;
}

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all text-sm";
const selectCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all text-sm [color-scheme:dark]";
const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";

export const SponsorsManager: React.FC<SponsorsManagerProps> = ({ sponsors, onSave, onUpdate, onDelete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: 'Camiseta' as SponsorType,
    position: '',
    isPaid: false,
    receiptImage: ''
  });

  const [isFormVisible, setIsFormVisible] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, receiptImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    const newSponsor: Sponsor = {
      id: crypto.randomUUID(),
      name: formData.name,
      amount: parseFloat(formData.amount),
      type: formData.type,
      position: formData.type === 'Camiseta' ? formData.position : 'N/A',
      isPaid: formData.isPaid,
      receiptImage: formData.receiptImage
    };

    onSave(newSponsor);
    setFormData({ name: '', amount: '', type: 'Camiseta', position: '', isPaid: false, receiptImage: '' });
    setIsFormVisible(false);
  };

  const togglePaymentStatus = (sponsor: Sponsor) => {
    onUpdate({ ...sponsor, isPaid: !sponsor.isPaid });
  };

  const totalRevenue = sponsors.reduce((acc, curr) => acc + (curr.isPaid ? curr.amount : 0), 0);
  const potentialRevenue = sponsors.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 p-6 rounded-xl border border-emerald-500/20 flex items-center justify-between">
          <div>
            <p className="text-emerald-400 font-bold text-sm">Receita Confirmada</p>
            <h2 className="text-3xl font-black text-white">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-400">
            <CheckCircle size={24} />
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 flex items-center justify-between">
          <div>
            <p className="text-slate-500 font-bold text-sm">Total Previsto</p>
            <h2 className="text-3xl font-black text-slate-400">R$ {potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div className="bg-slate-800 p-3 rounded-full text-slate-500">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Briefcase className="text-yellow-400" size={20} />
          Patrocinadores ({sponsors.length})
        </h2>
        <button
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="bg-slate-800 text-yellow-400 border border-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700 transition-all"
        >
          <Plus size={18} /> Novo Patrocinador
        </button>
      </div>

      {/* Form */}
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">Novo Patrocinador</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            <div className="col-span-1 md:col-span-2">
              <label className={labelCls}>Nome da Empresa/Pessoa</label>
              <input
                required type="text"
                className={inputCls}
                placeholder="Ex: Supermercado Central"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <label className={labelCls}>Valor (Doação)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                <input
                  required type="number"
                  className={`${inputCls} pl-8`}
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Tipo de Patrocínio</label>
              <select className={selectCls} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as SponsorType})}>
                <option value="Camiseta">Camiseta</option>
                <option value="Medalha">Medalha</option>
              </select>
            </div>

            {formData.type === 'Camiseta' && (
              <div>
                <label className={labelCls}>Posição na Camiseta</label>
                <select className={selectCls} value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                  <option value="">Selecione...</option>
                  <option value="Master frente">Master frente</option>
                  <option value="Master costas">Master costas</option>
                  <option value="Costas embaixo">Costas embaixo</option>
                  <option value="Peito lado direito">Peito lado direito</option>
                  <option value="Peito lado esquerdo">Peito lado esquerdo</option>
                  <option value="Manga lado direito">Manga lado direito</option>
                  <option value="Manga lado esquerdo">Manga lado esquerdo</option>
                  <option value="Costas pequeno">Costas pequeno</option>
                </select>
              </div>
            )}

            <div>
              <label className={labelCls}>Comprovante de Pagamento</label>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border border-dashed rounded-lg p-2.5 flex items-center justify-center gap-2 text-sm transition-colors ${
                  formData.receiptImage
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-600 text-slate-500 hover:border-slate-500 hover:text-slate-400'
                }`}
              >
                {formData.receiptImage ? <CheckCircle size={16} /> : <Upload size={16} />}
                {formData.receiptImage ? 'Comprovante Carregado' : 'Upload Imagem'}
              </button>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer bg-slate-800 p-2.5 rounded-lg w-full border border-slate-700">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-600 accent-yellow-400"
                  checked={formData.isPaid}
                  onChange={e => setFormData({...formData, isPaid: e.target.checked})}
                />
                <span className="text-sm font-bold text-slate-300">Pagamento Confirmado?</span>
              </label>
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button type="button" onClick={() => setIsFormVisible(false)} className="px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2 bg-yellow-400 text-slate-900 rounded-lg font-bold text-sm hover:bg-yellow-300 shadow-lg shadow-yellow-400/10 transition-all">
                Salvar Patrocinador
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Patrocinador</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Tipo/Posição</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Comprovante</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sponsors.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-600">Nenhum patrocinador cadastrado.</td></tr>
              ) : (
                sponsors.map(sponsor => (
                  <tr key={sponsor.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-white">{sponsor.name}</td>
                    <td className="p-4 text-sm text-slate-400">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-xs font-bold mr-2">{sponsor.type}</span>
                      {sponsor.position && sponsor.position !== 'N/A' && <span className="text-xs">{sponsor.position}</span>}
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-300">R$ {sponsor.amount.toFixed(2)}</td>
                    <td className="p-4">
                      {sponsor.receiptImage ? (
                        <div className="group relative">
                          <img src={sponsor.receiptImage} alt="Comprovante" className="w-10 h-10 object-cover rounded border border-slate-700" />
                          <div className="hidden group-hover:block absolute top-0 left-12 z-10 w-48 bg-slate-800 p-2 rounded shadow-xl border border-slate-700">
                            <img src={sponsor.receiptImage} alt="Zoom" className="w-full rounded" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic">Sem imagem</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => togglePaymentStatus(sponsor)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          sponsor.isPaid
                            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                        }`}
                      >
                        {sponsor.isPaid ? 'PAGO' : 'PENDENTE'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => onDelete(sponsor.id)} className="text-slate-600 hover:text-red-400 p-2 rounded hover:bg-red-500/10 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
