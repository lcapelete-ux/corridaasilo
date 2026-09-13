import React, { useMemo, useState } from 'react';
import { Runner } from '../types';
import { getRunnerPaidValue, modalityLabel, getRunnerCategory, formatBrDate } from '../constants';
import { Send, X, Download, AlertCircle, CheckCircle, Clock, Undo2, Package } from 'lucide-react';

// Modal de fundo branco: cores explícitas, igual aos outros modais do painel
const cardCls = "bg-slate-50 border border-slate-200 rounded-xl p-4";

interface SendBatchModalProps {
  runners: Runner[];                                        // todos os inscritos
  onClose: () => void;
  onSend: (ids: string[], batch: number) => Promise<void>;  // marca a remessa
  onUndo: (ids: string[]) => Promise<void>;                 // desfaz uma remessa
}

const x = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const tag = (name: string, value: unknown): string =>
  value === undefined || value === null || value === '' ? '' : `      <${name}>${x(value)}</${name}>\n`;

// XML da remessa: só os campos que a organização precisa para montar a prova.
// Diferente do Backup XML, que leva tudo (inclusive dados internos).
const montarXml = (lista: Runner[], remessa: number): string => {
  const corpo = lista.map(r => {
    const campos = [
      tag('nome', r.fullName),
      tag('cpf', r.cpf),
      tag('nascimento', r.birthDate),
      tag('idade', r.age),
      tag('sexo', r.gender),
      tag('equipe', r.teamName),
      tag('cidade', r.city),
      tag('modalidade', modalityLabel(r.modality)),
      tag('categoria', getRunnerCategory(r.birthDate, r.modality)),
      tag('camiseta', r.shirtSize),
      tag('email', r.email),
      tag('telefone', r.phone),
      tag('valor_pago', getRunnerPaidValue(r).toFixed(2)),
      tag('data_inscricao', r.registrationDate),
    ].join('');
    return `    <atleta>\n${campos}    </atleta>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<remessa numero="${remessa}" evento="2ª Corrida Noturna LSC" geradoEm="${x(new Date().toISOString())}" totalAtletas="${lista.length}">\n`
    + `  <atletas>\n${corpo}\n  </atletas>\n`
    + `</remessa>\n`;
};

const baixar = (xml: string, nome: string) => {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nome);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const SendBatchModal: React.FC<SendBatchModalProps> = ({ runners, onClose, onSend, onUndo }) => {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  // Só entra em remessa quem pagou. Quem não pagou fica para a próxima, se pagar.
  const pendentesEnvio = useMemo(
    () => runners.filter(r => r.isPaid && !r.sentBatch),
    [runners]
  );
  const semPagamento = useMemo(() => runners.filter(r => !r.isPaid), [runners]);

  // Remessas já geradas, com quantos atletas e quando
  const remessas = useMemo(() => {
    const m = new Map<number, { total: number; data?: string }>();
    for (const r of runners) {
      if (!r.sentBatch) continue;
      const atual = m.get(r.sentBatch) || { total: 0, data: r.sentAt };
      atual.total += 1;
      if (r.sentAt && (!atual.data || r.sentAt < atual.data)) atual.data = r.sentAt;
      m.set(r.sentBatch, atual);
    }
    return Array.from(m.entries())
      .map(([numero, v]) => ({ numero, ...v }))
      .sort((a, b) => a.numero - b.numero);
  }, [runners]);

  const proxima = remessas.length ? Math.max(...remessas.map(r => r.numero)) + 1 : 1;

  const gerar = async () => {
    if (pendentesEnvio.length === 0) return;
    if (!confirm(
      `Gerar a remessa nº ${proxima} com ${pendentesEnvio.length} ${pendentesEnvio.length === 1 ? 'atleta' : 'atletas'}?\n\n`
      + `O arquivo será baixado e esses atletas ficarão marcados como enviados. `
      + `A próxima remessa vai pegar só quem entrar (ou pagar) depois disso.`
    )) return;

    setEnviando(true);
    setErro('');
    setOk('');
    try {
      // Marca primeiro: se a gravação falhar, não fica um arquivo na mão do
      // organizador sem o sistema saber que aquela remessa saiu.
      await onSend(pendentesEnvio.map(r => r.id), proxima);
      baixar(montarXml(pendentesEnvio, proxima), `remessa-${proxima}-corrida-lsc.xml`);
      setOk(`Remessa nº ${proxima} gerada com ${pendentesEnvio.length} atletas. O arquivo foi baixado.`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível marcar a remessa. Nada foi enviado.');
    } finally {
      setEnviando(false);
    }
  };

  const baixarNovamente = (numero: number) => {
    const lista = runners.filter(r => r.sentBatch === numero);
    baixar(montarXml(lista, numero), `remessa-${numero}-corrida-lsc.xml`);
  };

  const desfazer = async (numero: number) => {
    const lista = runners.filter(r => r.sentBatch === numero);
    if (!confirm(
      `Desfazer a remessa nº ${numero}?\n\n`
      + `Os ${lista.length} atletas voltam para "não enviados" e entrarão na próxima remessa. `
      + `Use só se essa remessa foi gerada por engano e não chegou à organização.`
    )) return;
    setEnviando(true);
    setErro('');
    setOk('');
    try {
      await onUndo(lista.map(r => r.id));
      setOk(`Remessa nº ${numero} desfeita. Os atletas voltaram para a fila de envio.`);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível desfazer.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-teal-600 p-6 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Send size={20} /> Remessa para a Organização
          </h3>
          <button onClick={onClose} className="hover:text-teal-200" disabled={enviando}>
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Quem vai na próxima remessa */}
          <div className={`${cardCls} border-teal-200 bg-teal-50`}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-teal-900">Prontos para enviar</span>
              <span className="font-black text-2xl text-teal-700">{pendentesEnvio.length}</span>
            </div>
            <p className="text-xs text-teal-800/80 mt-1">
              Pagamento confirmado e ainda não enviados. São estes que entram na <strong>remessa nº {proxima}</strong>.
            </p>
          </div>

          {/* Quem fica de fora, e por quê */}
          {semPagamento.length > 0 && (
            <div className={`${cardCls} border-amber-200 bg-amber-50 flex items-start gap-3`}>
              <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">
                  {semPagamento.length} {semPagamento.length === 1 ? 'inscrito fica de fora' : 'inscritos ficam de fora'}
                </p>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  Estão inscritos mas <strong>sem pagamento confirmado</strong>. Quando você confirmar o pagamento,
                  eles entram automaticamente na próxima remessa.
                </p>
              </div>
            </div>
          )}

          {/* Remessas já enviadas */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Remessas já enviadas ({remessas.length})
            </p>
            {remessas.length === 0 ? (
              <p className="text-sm text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 text-center">
                Nenhuma remessa gerada ainda. A primeira será a nº 1.
              </p>
            ) : (
              <ul className="space-y-2">
                {remessas.map(r => (
                  <li key={r.numero} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-teal-50 text-teal-700 text-sm font-black flex items-center justify-center">
                      {r.numero}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm">
                        {r.total} {r.total === 1 ? 'atleta' : 'atletas'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.data ? `Enviada em ${formatBrDate(r.data.split('T')[0], true)}` : 'Data não registrada'}
                      </p>
                    </div>
                    <button
                      onClick={() => baixarNovamente(r.numero)}
                      className="text-slate-500 hover:text-teal-600 p-2 rounded hover:bg-teal-50 transition-all shrink-0"
                      title="Baixar este arquivo de novo"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => desfazer(r.numero)}
                      disabled={enviando}
                      className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-red-50 transition-all shrink-0 disabled:opacity-50"
                      title="Desfazer esta remessa"
                    >
                      <Undo2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {ok && (
            <p className="text-emerald-700 text-sm font-bold flex items-start gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle size={15} className="shrink-0 mt-0.5" /> {ok}
            </p>
          )}
          {erro && (
            <p className="text-red-700 text-sm font-bold flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {erro}
            </p>
          )}

          <p className="text-xs text-slate-500 flex items-start gap-1.5 pt-2 border-t border-slate-100">
            <Package size={12} className="shrink-0 mt-0.5" />
            O arquivo leva os dados que a organização usa para montar a prova. Para guardar
            uma cópia de segurança com tudo, use o <strong>Backup XML</strong> na lista.
          </p>
        </div>

        <div className="p-6 pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} disabled={enviando} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-60">
            Fechar
          </button>
          <button
            onClick={gerar}
            disabled={enviando || pendentesEnvio.length === 0}
            className="px-5 py-2.5 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={17} />
            {enviando ? 'Gravando...' : `Gerar remessa nº ${proxima} (${pendentesEnvio.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
