import React, { useMemo, useState } from 'react';
import { Runner, Gender, ShirtSize, RaceModality } from '../types';
import {
  BulkRow, parseBulkText, validarLinha, contarCpfs, aplicarPadroes, calcularIdade,
  normalizeCpf, normalizeDate, normalizeGender, normalizeShirt, normalizeModality, normalizePhone,
} from '../services/bulkImport';
import { parseRunnersFromText, isAiEnabled } from '../services/geminiService';
import {
  Sparkles, Users, Wand2, AlertCircle, CheckCircle, Trash2, Save, ArrowLeft,
  ClipboardPaste, Loader2, FileText, Info,
} from 'lucide-react';

interface BulkRegistrationProps {
  runners: Runner[];                       // já inscritos, para barrar CPF repetido
  teams: string[];
  cities: string[];
  onSaveRunner: (runner: Runner) => Promise<boolean> | boolean;
  onFinish?: () => Promise<void> | void;   // recarrega a lista depois do lote
}

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-600 focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all text-sm";
const selectCls = `${inputCls} [color-scheme:dark]`;
const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";
const cellCls = "w-full bg-transparent border border-transparent hover:border-slate-700 focus:border-yellow-400 focus:bg-slate-800 rounded px-2 py-1 text-white outline-none text-sm transition-all";
const cellSelectCls = `${cellCls} [color-scheme:dark]`;

const EXEMPLO = `Nome\tCPF\tNascimento\tSexo\tCamiseta\tModalidade
Ana Paula Souza\t111.222.333-44\t10/04/1995\tF\tM\tCorrida 5km
Bruno Martins\t222.333.444-55\t03/02/1960\tM\tGG\tCaminhada 3km`;

export const BulkRegistration: React.FC<BulkRegistrationProps> = ({ runners, teams, cities, onSaveRunner, onFinish }) => {
  const [etapa, setEtapa] = useState<'entrada' | 'revisao'>('entrada');
  const [texto, setTexto] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [formato, setFormato] = useState('');
  const [usouIa, setUsouIa] = useState(false);
  const [interpretando, setInterpretando] = useState(false);
  const [avisoIa, setAvisoIa] = useState('');

  // Padrões: o caso comum é uma academia mandar a lista dela inteira, então
  // equipe/cidade/modalidade quase nunca vêm no texto.
  const [padraoEquipe, setPadraoEquipe] = useState('');
  const [padraoCidade, setPadraoCidade] = useState('');
  const [padraoModalidade, setPadraoModalidade] = useState<RaceModality>('5k');
  // A camiseta não é exigida na lista, mas a coluna do banco é obrigatória
  // (enum P/M/G/GG/EXG). Em vez de escolher escondido, o admin define aqui o
  // tamanho que vale para quem vier sem — e vê o resultado na tabela.
  const [padraoCamiseta, setPadraoCamiseta] = useState<string>(ShirtSize.M);
  const [marcarPago, setMarcarPago] = useState(false);

  const [salvando, setSalvando] = useState<{ feitos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{ salvos: number; falhas: string[] } | null>(null);

  const cpfsExistentes = useMemo(
    () => new Set(runners.map(r => r.cpf.replace(/\D/g, ''))),
    [runners]
  );
  const cpfsNaLista = useMemo(() => contarCpfs(rows), [rows]);
  const pendenciasPorLinha = useMemo(
    () => rows.map(r => validarLinha(r, { cpfsExistentes, cpfsNaLista })),
    [rows, cpfsExistentes, cpfsNaLista]
  );
  const prontas = pendenciasPorLinha.filter(p => p.length === 0).length;
  const comPendencia = rows.length - prontas;

  const interpretar = async () => {
    if (!texto.trim()) return;
    setInterpretando(true);
    setAvisoIa('');
    setResultado(null);
    try {
      // A IA lê texto bagunçado melhor; o leitor de colunas é a rede de
      // segurança. Se a IA devolver menos gente que o leitor, é sinal de que
      // ela perdeu linhas — nesse caso o leitor ganha.
      const doLeitor = parseBulkText(texto);
      let finais = doLeitor.rows;
      let viaIa = false;

      if (isAiEnabled()) {
        const daIa = await parseRunnersFromText(texto);
        if (daIa && daIa.length >= doLeitor.rows.length && daIa.length > 0) {
          finais = daIa.map(p => ({
            id: crypto.randomUUID(),
            fullName: (p.fullName || '').trim(),
            cpf: normalizeCpf(p.cpf || ''),
            birthDate: normalizeDate(p.birthDate || ''),
            gender: normalizeGender(p.gender || ''),
            shirtSize: normalizeShirt(p.shirtSize || ''),
            modality: normalizeModality(p.modality || ''),
            teamName: (p.teamName || '').trim(),
            city: (p.city || '').trim(),
            email: (p.email || '').trim().toLowerCase(),
            phone: normalizePhone(p.phone || ''),
            guardianName: (p.guardianName || '').trim(),
          }));
          viaIa = true;
        } else if (daIa) {
          setAvisoIa('A IA leu menos pessoas do que a leitura por colunas, então usei a leitura por colunas. Confira a tabela.');
        } else {
          setAvisoIa('Não consegui usar a IA agora (sem chave ou falha na chamada). Usei a leitura por colunas.');
        }
      }

      const comPadroes = aplicarPadroes(finais, {
        teamName: padraoEquipe, city: padraoCidade, modality: padraoModalidade,
        shirtSize: padraoCamiseta,
      });
      setRows(comPadroes);
      setFormato(viaIa ? 'interpretado por IA' : doLeitor.formato);
      setUsouIa(viaIa);
      setEtapa('revisao');
    } finally {
      setInterpretando(false);
    }
  };

  const alterar = (id: string, campo: keyof BulkRow, valor: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [campo]: valor } : r)));
  };

  const remover = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const salvar = async () => {
    const aSalvar = rows.filter((_, i) => pendenciasPorLinha[i].length === 0);
    if (aSalvar.length === 0) return;
    if (!confirm(`Cadastrar ${aSalvar.length} ${aSalvar.length === 1 ? 'inscrição' : 'inscrições'}?${marcarPago ? '\n\nTodas serão marcadas como PAGAS.' : ''}`)) return;

    setSalvando({ feitos: 0, total: aSalvar.length });
    const falhas: string[] = [];
    const salvos: string[] = [];

    for (const r of aSalvar) {
      const idade = calcularIdade(r.birthDate);
      const runner: Runner = {
        id: crypto.randomUUID(),
        fullName: r.fullName,
        email: r.email,
        phone: r.phone || undefined,
        cpf: r.cpf,
        city: r.city,
        birthDate: r.birthDate,
        age: idade,
        gender: r.gender as Gender,
        teamName: r.teamName || 'Avulso',
        // Coluna do banco é enum obrigatório: célula limpa na conferência cai
        // no padrão escolhido, em vez de quebrar a gravação da linha
        shirtSize: (r.shirtSize || padraoCamiseta || ShirtSize.M) as ShirtSize,
        modality: (r.modality || '5k') as RaceModality,
        registrationDate: new Date().toISOString(),
        isPaid: marcarPago,
        ...(idade < 18 && r.guardianName ? { guardianName: r.guardianName } : {}),
      };
      try {
        const ok = await onSaveRunner(runner);
        if (ok) salvos.push(r.id);
        else falhas.push(`${r.fullName}: não foi salvo`);
      } catch (e: any) {
        falhas.push(`${r.fullName}: ${e?.message || 'erro ao salvar'}`);
      }
      setSalvando(p => (p ? { ...p, feitos: p.feitos + 1 } : p));
    }

    setSalvando(null);
    // Some da tabela só quem entrou de verdade: o que falhou fica para
    // corrigir, em vez de sumir e o admin não saber quem ficou de fora.
    const salvosSet = new Set(salvos);
    setRows(prev => prev.filter(r => !salvosSet.has(r.id)));
    setResultado({ salvos: salvos.length, falhas });
    // Recarrega os inscritos: sem isso, um CPF gravado agora não seria
    // barrado como repetido se o admin colar a mesma lista de novo.
    if (salvos.length > 0) await onFinish?.();
  };

  // --- ETAPA 1: colar a lista ---
  if (etapa === 'entrada') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={20} /> Inscrição em Lote
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Cole a lista que a academia mandou — planilha, CSV ou mensagem de WhatsApp.
            {isAiEnabled()
              ? ' A IA separa os campos e você confere tudo antes de gravar.'
              : ' O sistema separa os campos e você confere tudo antes de gravar.'}
          </p>
          {!isAiEnabled() && (
            <div className="mt-4 flex items-start gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
              <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                A interpretação por <strong className="text-slate-300">IA</strong> está desligada neste site (falta a chave da API).
                A leitura por colunas continua funcionando normalmente — só é menos tolerante com texto muito bagunçado.
              </p>
            </div>
          )}
        </div>

        {/* Padrões aplicados a quem não trouxer o campo */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            Preencher automaticamente o que faltar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className={labelCls}>Equipe / Academia</label>
              <input list="bulk-equipes" className={inputCls} placeholder="Ex: Academia Luso"
                value={padraoEquipe} onChange={e => setPadraoEquipe(e.target.value)} />
              <datalist id="bulk-equipes">{teams.map(t => <option key={t} value={t} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Cidade</label>
              <input list="bulk-cidades" className={inputCls} placeholder="Ex: Laranjal Paulista"
                value={padraoCidade} onChange={e => setPadraoCidade(e.target.value)} />
              <datalist id="bulk-cidades">{cities.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Modalidade</label>
              <select className={selectCls} value={padraoModalidade}
                onChange={e => setPadraoModalidade(e.target.value as RaceModality)}>
                <option value="5k">Corrida 5 km</option>
                <option value="3k">Caminhada 3 km</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Camiseta</label>
              <select className={selectCls} value={padraoCamiseta}
                onChange={e => setPadraoCamiseta(e.target.value)}>
                {[ShirtSize.S, ShirtSize.M, ShirtSize.L, ShirtSize.XL, ShirtSize.XXL].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer bg-slate-800 p-2.5 rounded-lg w-full border border-slate-700">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-600 accent-emerald-500"
                  checked={marcarPago} onChange={e => setMarcarPago(e.target.checked)} />
                <span className="text-sm font-bold text-slate-300">Já pagas</span>
              </label>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3">
            Só entram nas linhas em que o campo veio vazio — o que estiver na lista é sempre respeitado.
            A lista <strong className="text-slate-500">não precisa</strong> trazer o tamanho da camiseta: quem vier sem fica com o tamanho acima, e dá para trocar linha a linha na conferência.
          </p>
        </div>

        {/* Texto colado */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ClipboardPaste size={14} /> Cole a lista aqui
            </label>
            <button onClick={() => setTexto(EXEMPLO)} className="text-xs font-bold text-yellow-400 hover:text-yellow-300">
              Preencher com um exemplo
            </button>
          </div>
          <textarea
            rows={12}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder={'Nome\tCPF\tNascimento\tSexo\tCamiseta\n\nou\n\nAna Paula Souza 111.222.333-44 10/04/1995 F M\nBruno Martins 222.333.444-55 03/02/1960 M GG'}
            className={`${inputCls} font-mono text-xs leading-relaxed resize-y`}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <p className="text-xs text-slate-600">
              Sem cabeçalho, a ordem esperada é: nome · CPF · nascimento · sexo · camiseta · modalidade · equipe · cidade · e-mail · telefone · responsável
            </p>
            <button
              onClick={interpretar}
              disabled={!texto.trim() || interpretando}
              className="bg-yellow-400 text-slate-900 px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50 shrink-0"
            >
              {interpretando ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
              {interpretando ? 'Interpretando...' : 'Interpretar lista'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ETAPA 2: revisar e gravar ---
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="text-yellow-400" size={20} /> Conferir antes de gravar
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {rows.length} {rows.length === 1 ? 'pessoa lida' : 'pessoas lidas'} · {formato}
            {usouIa && <span className="ml-2 inline-flex items-center gap-1 bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Sparkles size={9} /> IA</span>}
          </p>
        </div>
        <button
          onClick={() => { setEtapa('entrada'); setResultado(null); }}
          disabled={!!salvando}
          className="text-slate-400 hover:text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowLeft size={16} /> Voltar e colar outra lista
        </button>
      </div>

      {avisoIa && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200/90">{avisoIa}</p>
        </div>
      )}

      {resultado && (
        <div className={`rounded-xl p-4 border ${resultado.falhas.length ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          <p className={`font-bold text-sm flex items-center gap-2 ${resultado.falhas.length ? 'text-amber-400' : 'text-emerald-400'}`}>
            <CheckCircle size={16} />
            {resultado.salvos} {resultado.salvos === 1 ? 'inscrição cadastrada' : 'inscrições cadastradas'}
          </p>
          {resultado.falhas.length > 0 && (
            <div className="text-xs text-amber-200/90 mt-2">
              <p className="font-bold mb-1">{resultado.falhas.length} não {resultado.falhas.length === 1 ? 'entrou' : 'entraram'} e {resultado.falhas.length === 1 ? 'continua' : 'continuam'} na tabela abaixo:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {resultado.falhas.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/20 flex items-center justify-between">
          <div>
            <p className="text-emerald-400 font-bold text-xs uppercase">Prontas para gravar</p>
            <h3 className="text-2xl font-black text-white">{prontas}</h3>
          </div>
          <CheckCircle size={22} className="text-emerald-400" />
        </div>
        <div className={`bg-slate-900 p-4 rounded-xl border flex items-center justify-between ${comPendencia ? 'border-amber-500/30' : 'border-slate-800/60'}`}>
          <div>
            <p className={`font-bold text-xs uppercase ${comPendencia ? 'text-amber-400' : 'text-slate-500'}`}>Faltando algo</p>
            <h3 className="text-2xl font-black text-white">{comPendencia}</h3>
          </div>
          <AlertCircle size={22} className={comPendencia ? 'text-amber-400' : 'text-slate-600'} />
        </div>
      </div>

      {/* Tabela editável */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                {['Nome', 'CPF', 'Nascimento', 'Sexo', 'Camiseta', 'Prova', 'Equipe', 'Cidade', 'Responsável', 'Situação', ''].map(h => (
                  <th key={h} className="p-3 text-[11px] font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.length === 0 ? (
                <tr><td colSpan={11} className="p-10 text-center text-slate-600">
                  Nenhuma linha. Volte e cole a lista novamente.
                </td></tr>
              ) : rows.map((r, i) => {
                const p = pendenciasPorLinha[i];
                const idade = calcularIdade(r.birthDate);
                const menor = !Number.isNaN(idade) && idade < 18;
                return (
                  <tr key={r.id} className={p.length ? 'bg-amber-500/[0.04]' : 'hover:bg-slate-800/30'}>
                    <td className="p-2 min-w-[190px]">
                      <input className={cellCls} value={r.fullName} onChange={e => alterar(r.id, 'fullName', e.target.value)} placeholder="Nome completo" />
                    </td>
                    <td className="p-2 min-w-[140px]">
                      <input className={`${cellCls} font-mono`} value={r.cpf}
                        onChange={e => alterar(r.id, 'cpf', e.target.value)}
                        onBlur={e => alterar(r.id, 'cpf', normalizeCpf(e.target.value))} placeholder="000.000.000-00" />
                    </td>
                    <td className="p-2 min-w-[130px]">
                      <input type="date" className={cellSelectCls} value={/^\d{4}-\d{2}-\d{2}$/.test(r.birthDate) ? r.birthDate : ''}
                        onChange={e => alterar(r.id, 'birthDate', e.target.value)} />
                      {!Number.isNaN(idade) && <span className="block text-[10px] text-slate-500 px-2">{idade} anos</span>}
                    </td>
                    <td className="p-2 min-w-[110px]">
                      <select className={cellSelectCls} value={r.gender} onChange={e => alterar(r.id, 'gender', e.target.value)}>
                        <option value="">—</option>
                        <option value={Gender.MALE}>Masculino</option>
                        <option value={Gender.FEMALE}>Feminino</option>
                      </select>
                    </td>
                    <td className="p-2 min-w-[80px]">
                      <select className={cellSelectCls} value={r.shirtSize} onChange={e => alterar(r.id, 'shirtSize', e.target.value)}>
                        <option value="">—</option>
                        {[ShirtSize.S, ShirtSize.M, ShirtSize.L, ShirtSize.XL, ShirtSize.XXL].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <select className={cellSelectCls} value={r.modality} onChange={e => alterar(r.id, 'modality', e.target.value)}>
                        <option value="">—</option>
                        <option value="5k">5 km</option>
                        <option value="3k">3 km</option>
                      </select>
                    </td>
                    <td className="p-2 min-w-[150px]">
                      <input list="bulk-equipes" className={cellCls} value={r.teamName} onChange={e => alterar(r.id, 'teamName', e.target.value)} placeholder="Avulso" />
                    </td>
                    <td className="p-2 min-w-[150px]">
                      <input list="bulk-cidades" className={cellCls} value={r.city} onChange={e => alterar(r.id, 'city', e.target.value)} placeholder="Cidade" />
                    </td>
                    <td className="p-2 min-w-[160px]">
                      {menor ? (
                        <input className={cellCls} value={r.guardianName} onChange={e => alterar(r.id, 'guardianName', e.target.value)} placeholder="Obrigatório" />
                      ) : (
                        <span className="text-slate-700 text-xs px-2">—</span>
                      )}
                    </td>
                    {/* Largura fixa para o texto quebrar em linhas em vez de
                        empurrar a tabela e sair da tela */}
                    <td className="p-2 w-[180px] max-w-[180px]">
                      {p.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold">
                          <CheckCircle size={12} /> Pronta
                        </span>
                      ) : (
                        <span className="text-amber-400 text-[11px] leading-snug block whitespace-normal break-words">
                          Falta: {p.join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <button onClick={() => remover(r.id)} disabled={!!salvando}
                        className="text-slate-600 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-all disabled:opacity-40"
                        title="Tirar da lista">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <datalist id="bulk-equipes">{teams.map(t => <option key={t} value={t} />)}</datalist>
      <datalist id="bulk-cidades">{cities.map(c => <option key={c} value={c} />)}</datalist>

      {/* Gravar */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-400">
          {comPendencia > 0 && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <AlertCircle size={14} />
              {comPendencia} {comPendencia === 1 ? 'linha fica de fora' : 'linhas ficam de fora'} até completar o que falta.
            </span>
          )}
          {marcarPago && (
            <span className="flex items-center gap-1.5 text-emerald-400 mt-1">
              <CheckCircle size={14} /> Serão gravadas como <strong>pagas</strong>.
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {salvando && (
            <span className="text-sm font-bold text-yellow-400">
              Gravando… {salvando.feitos} de {salvando.total}
            </span>
          )}
          <button
            onClick={salvar}
            disabled={prontas === 0 || !!salvando}
            className="bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Cadastrar {prontas} {prontas === 1 ? 'inscrição' : 'inscrições'}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600 flex items-start gap-1.5">
        <FileText size={12} className="shrink-0 mt-0.5" />
        Cada linha vira uma inscrição igual à do formulário normal. Nada é gravado antes de você clicar em cadastrar.
      </p>
    </div>
  );
};
