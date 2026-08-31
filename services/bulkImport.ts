// Interpretação de uma lista de inscrições colada pelo admin (planilha, texto
// do WhatsApp, CSV). Este arquivo é o interpretador determinístico: sempre
// funciona, sem depender de IA. A IA (geminiService) entra por cima, para
// textos bagunçados que não seguem colunas — e cai aqui quando não há chave
// ou a chamada falha.

import { Gender, ShirtSize, RaceModality } from '../types';
import { MIN_AGE } from '../constants';

// Uma linha interpretada, ainda crua: tudo texto, para o admin revisar e
// corrigir antes de salvar. A validação vira "pendências" na tela.
export interface BulkRow {
  id: string;
  fullName: string;
  cpf: string;
  birthDate: string;      // yyyy-mm-dd
  gender: string;
  shirtSize: string;
  modality: string;
  teamName: string;
  city: string;
  email: string;
  phone: string;
  guardianName: string;
}

export const emptyRow = (): BulkRow => ({
  id: crypto.randomUUID(),
  fullName: '', cpf: '', birthDate: '', gender: '', shirtSize: '',
  modality: '', teamName: '', city: '', email: '', phone: '', guardianName: '',
});

// --- Normalizadores ---------------------------------------------------------

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const normalizeCpf = (v: string): string => {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length !== 11) return v.trim();
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const normalizePhone = (v: string): string => {
  const d = (v || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return (v || '').trim();
};

// Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd e dd/mm/aa (vira 19xx/20xx).
export const normalizeDate = (v: string): string => {
  const s = (v || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return s;
  const dia = m[1].padStart(2, '0');
  const mes = m[2].padStart(2, '0');
  let ano = m[3];
  if (ano.length === 2) {
    // 2 dígitos: acima do ano corrente vira 19xx (ninguém nasce no futuro)
    const n = Number(ano);
    const limite = Number(String(new Date().getFullYear()).slice(2));
    ano = n <= limite ? `20${ano}` : `19${ano}`;
  }
  return `${ano}-${mes}-${dia}`;
};

export const normalizeGender = (v: string): string => {
  const s = semAcento(v);
  if (!s) return '';
  if (/^(m|masc|masculino|homem|h)$/.test(s)) return Gender.MALE;
  if (/^(f|fem|feminino|mulher)$/.test(s)) return Gender.FEMALE;
  return v.trim();
};

export const normalizeShirt = (v: string): string => {
  const s = semAcento(v).replace(/\s|-/g, '');
  if (!s) return '';
  const mapa: Record<string, string> = {
    p: ShirtSize.S, pp: ShirtSize.S, s: ShirtSize.S, small: ShirtSize.S,
    m: ShirtSize.M, medio: ShirtSize.M, medium: ShirtSize.M,
    g: ShirtSize.L, l: ShirtSize.L, grande: ShirtSize.L, large: ShirtSize.L,
    gg: ShirtSize.XL, xl: ShirtSize.XL, xg: ShirtSize.XL,
    exg: ShirtSize.XXL, xxl: ShirtSize.XXL, ggg: ShirtSize.XXL, xxg: ShirtSize.XXL,
  };
  return mapa[s] || v.trim().toUpperCase();
};

export const normalizeModality = (v: string): string => {
  const s = semAcento(v).replace(/\s/g, '');
  if (!s) return '';
  if (/(^|\D)3k|caminh/.test(s)) return '3k';
  if (/(^|\D)5k|corrid/.test(s)) return '5k';
  return '';
};

// --- Interpretação do texto colado -----------------------------------------

// Nomes de coluna reconhecidos no cabeçalho (sem acento, minúsculo)
const COLUNAS: { campo: keyof BulkRow; nomes: string[] }[] = [
  { campo: 'fullName', nomes: ['nome', 'nomecompleto', 'atleta', 'participante', 'corredor'] },
  { campo: 'cpf', nomes: ['cpf', 'documento'] },
  { campo: 'birthDate', nomes: ['nascimento', 'datanascimento', 'datadenascimento', 'nasc', 'dtnascimento'] },
  { campo: 'gender', nomes: ['sexo', 'genero'] },
  { campo: 'shirtSize', nomes: ['camiseta', 'tamanho', 'camisa', 'tamanhocamiseta'] },
  { campo: 'modality', nomes: ['modalidade', 'prova', 'percurso', 'distancia'] },
  { campo: 'teamName', nomes: ['equipe', 'academia', 'time', 'grupo', 'assessoria'] },
  { campo: 'city', nomes: ['cidade', 'municipio'] },
  { campo: 'email', nomes: ['email', 'e-mail'] },
  { campo: 'phone', nomes: ['telefone', 'celular', 'whatsapp', 'fone', 'tel'] },
  { campo: 'guardianName', nomes: ['responsavel', 'nomeresponsavel', 'pai', 'mae'] },
];

// Ordem assumida quando não há cabeçalho. É a mesma mostrada na tela.
const ORDEM_PADRAO: (keyof BulkRow)[] = [
  'fullName', 'cpf', 'birthDate', 'gender', 'shirtSize', 'modality',
  'teamName', 'city', 'email', 'phone', 'guardianName',
];

const detectarSeparador = (linhas: string[]): string => {
  const candidatos = ['\t', ';', '|', ','];
  let melhor = '\t';
  let melhorNota = -1;
  for (const sep of candidatos) {
    // Boa separação = aparece em quase toda linha, com contagem estável
    const contagens = linhas.map(l => l.split(sep).length - 1).filter(n => n > 0);
    if (contagens.length < Math.max(1, Math.ceil(linhas.length * 0.6))) continue;
    const media = contagens.reduce((a, b) => a + b, 0) / contagens.length;
    const variacao = contagens.reduce((a, b) => a + Math.abs(b - media), 0) / contagens.length;
    const nota = media - variacao * 2;
    if (nota > melhorNota) { melhorNota = nota; melhor = sep; }
  }
  return melhor;
};

const mapearCabecalho = (celulas: string[]): (keyof BulkRow | null)[] | null => {
  const mapeadas = celulas.map(c => {
    const chave = semAcento(c).replace(/[\s_.]/g, '');
    const achou = COLUNAS.find(col => col.nomes.includes(chave));
    return achou ? achou.campo : null;
  });
  // Só trata como cabeçalho se reconheceu nome e pelo menos mais uma coluna
  const reconhecidas = mapeadas.filter(Boolean).length;
  return reconhecidas >= 2 && mapeadas.includes('fullName') ? mapeadas : null;
};

const aplicarNormalizacao = (row: BulkRow): BulkRow => ({
  ...row,
  fullName: row.fullName.trim().replace(/\s+/g, ' '),
  cpf: normalizeCpf(row.cpf),
  birthDate: normalizeDate(row.birthDate),
  gender: normalizeGender(row.gender),
  shirtSize: normalizeShirt(row.shirtSize),
  modality: normalizeModality(row.modality),
  teamName: row.teamName.trim(),
  city: row.city.trim(),
  email: row.email.trim().toLowerCase(),
  phone: normalizePhone(row.phone),
  guardianName: row.guardianName.trim(),
});

// Linha sem separador ("João Silva 123.456.789-00 12/05/1990 M G"): tenta
// achar CPF, data e os códigos soltos, e o que sobrar vira nome.
const interpretarLinhaSolta = (linha: string): BulkRow => {
  const row = emptyRow();
  let resto = linha;

  const cpf = resto.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
  if (cpf) { row.cpf = cpf[0]; resto = resto.replace(cpf[0], ' '); }

  const data = resto.match(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}/);
  if (data) { row.birthDate = data[0]; resto = resto.replace(data[0], ' '); }

  const email = resto.match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/);
  if (email) { row.email = email[0]; resto = resto.replace(email[0], ' '); }

  const tel = resto.match(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/);
  if (tel) { row.phone = tel[0]; resto = resto.replace(tel[0], ' '); }

  // Tokens curtos soltos: tamanho de camiseta, sexo, modalidade
  const tokens = resto.split(/[\s,;|]+/).filter(Boolean);
  const sobra: string[] = [];
  for (const t of tokens) {
    const s = semAcento(t);
    if (!row.modality && normalizeModality(t)) { row.modality = t; continue; }
    if (!row.gender && /^(m|f|masc|fem|masculino|feminino)$/.test(s)) { row.gender = t; continue; }
    if (!row.shirtSize && /^(pp|p|m|g|gg|ggg|exg|xg|xl|xxl)$/.test(s)) { row.shirtSize = t; continue; }
    sobra.push(t);
  }
  row.fullName = sobra.join(' ').replace(/\s+/g, ' ').trim();
  return row;
};

// Interpreta o texto colado. Devolve as linhas e como foram lidas, para a
// tela poder explicar ao admin o que aconteceu.
export const parseBulkText = (texto: string): { rows: BulkRow[]; formato: string } => {
  const linhas = (texto || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
  if (linhas.length === 0) return { rows: [], formato: 'vazio' };

  const sep = detectarSeparador(linhas);
  const temSeparador = linhas.some(l => l.includes(sep));

  if (!temSeparador) {
    const rows = linhas.map(l => aplicarNormalizacao({ ...interpretarLinhaSolta(l), id: crypto.randomUUID() }));
    return { rows, formato: 'linha livre (sem separador)' };
  }

  const matriz = linhas.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));
  const mapa = mapearCabecalho(matriz[0]);
  const corpo = mapa ? matriz.slice(1) : matriz;
  const ordem = mapa || ORDEM_PADRAO;

  const rows = corpo
    .filter(cels => cels.some(c => c))
    .map(cels => {
      const row = emptyRow();
      cels.forEach((valor, i) => {
        const campo = ordem[i];
        if (campo && campo !== 'id') (row as any)[campo] = valor;
      });
      return aplicarNormalizacao(row);
    });

  const nomeSep = sep === '\t' ? 'tabulação (planilha)' : `"${sep}"`;
  return { rows, formato: `colunas separadas por ${nomeSep}${mapa ? ', com cabeçalho' : ', sem cabeçalho'}` };
};

// --- Validação --------------------------------------------------------------

export const calcularIdade = (nascimento: string, referencia = new Date()): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return NaN;
  const [a, m, d] = nascimento.split('-').map(Number);
  let idade = referencia.getFullYear() - a;
  const mesAtual = referencia.getMonth() + 1;
  if (mesAtual < m || (mesAtual === m && referencia.getDate() < d)) idade--;
  return idade;
};

const GENEROS: string[] = [Gender.MALE, Gender.FEMALE];
const TAMANHOS: string[] = [ShirtSize.S, ShirtSize.M, ShirtSize.L, ShirtSize.XL, ShirtSize.XXL];

// Devolve a lista de pendências da linha. Vazia = pronta para salvar.
export const validarLinha = (
  row: BulkRow,
  contexto: { cpfsExistentes: Set<string>; cpfsNaLista: Map<string, number> }
): string[] => {
  const p: string[] = [];
  if (!row.fullName || row.fullName.split(/\s+/).length < 2) p.push('nome completo');

  const digitos = row.cpf.replace(/\D/g, '');
  if (digitos.length !== 11) p.push('CPF');
  else if (contexto.cpfsExistentes.has(digitos)) p.push('CPF já inscrito');
  else if ((contexto.cpfsNaLista.get(digitos) || 0) > 1) p.push('CPF repetido na lista');

  const idade = calcularIdade(row.birthDate);
  if (Number.isNaN(idade)) p.push('data de nascimento');
  else if (idade < MIN_AGE) p.push(`idade mínima ${MIN_AGE} anos`);
  else if (idade < 18 && !row.guardianName) p.push('nome do responsável (menor de 18)');

  if (!GENEROS.includes(row.gender)) p.push('sexo');
  // Camiseta não trava o lote: a academia costuma mandar a lista sem tamanho e
  // acertar depois. Em branco, entra a camiseta padrão escolhida na tela — que
  // é o mesmo que o banco usaria (a coluna é enum obrigatório, sem "vazio").
  if (row.shirtSize && !TAMANHOS.includes(row.shirtSize)) p.push('camiseta inválida');
  if (row.modality !== '5k' && row.modality !== '3k') p.push('modalidade');
  if (!row.city) p.push('cidade');
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) p.push('e-mail inválido');

  return p;
};

// Índice de CPFs repetidos dentro da própria lista
export const contarCpfs = (rows: BulkRow[]): Map<string, number> => {
  const m = new Map<string, number>();
  for (const r of rows) {
    const d = r.cpf.replace(/\D/g, '');
    if (d.length === 11) m.set(d, (m.get(d) || 0) + 1);
  }
  return m;
};

// Aplica os padrões escolhidos pelo admin (equipe, cidade, modalidade) nas
// linhas em que o campo veio vazio. Nunca sobrescreve o que a lista trouxe.
export const aplicarPadroes = (
  rows: BulkRow[],
  padroes: { teamName?: string; city?: string; modality?: RaceModality; shirtSize?: string }
): BulkRow[] =>
  rows.map(r => ({
    ...r,
    teamName: r.teamName || padroes.teamName || '',
    city: r.city || padroes.city || '',
    modality: r.modality || padroes.modality || '',
    shirtSize: r.shirtSize || padroes.shirtSize || '',
  }));
