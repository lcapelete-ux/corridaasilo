import React from 'react';
import { X, FileText, CheckCircle } from 'lucide-react';

// ============================================================================
// REGULAMENTO OFICIAL — 2ª Corrida Night Run · Asilo São Cristóvão
// Cada item vira um parágrafo; comece com "##" para virar um título de seção.
// ============================================================================
const REGULATION_TEXT: string[] = [
  '## 1. A Prova',
  'A CORRIDA DE RUA de 5 km e a CAMINHADA de 3 km, denominada 2ª Corrida Night Run – Asilo São Cristóvão, será realizada em 19/09/2026, na Praça Armando Salles de Oliveira, percorrendo as ruas e arredores da cidade de Laranjal Paulista – SP.',
  'A largada e a chegada serão na Praça Armando Salles de Oliveira, em Laranjal Paulista – SP, às 19:00 do dia 19/09/2026. O evento será realizado com qualquer condição climática.',
  'Modalidades: Corrida de 5 km e Caminhada de 3 km.',

  '## 2. Idade Mínima',
  'De acordo com a determinação da Confederação Brasileira de Atletismo, a idade mínima para atletas se inscreverem e participarem de corridas de rua é de 14 (quatorze) anos. A idade considerada é aquela que o atleta terá em 31 de dezembro de 2026.',

  '## 3. Participação de Menores',
  'Se o atleta for menor de 18 anos, será necessária autorização por escrito do pai ou responsável. No momento da inscrição deve ser informado o nome do responsável e, junto com o comprovante de pagamento, deve ser anexada a autorização assinada. Sem a autorização anexada, a inscrição do menor não será validada.',

  '## 4. Categorias',
  'A competição será disputada em duas categorias (Masculina e Feminina):',
  '• Categoria Geral Corrida 5K (Masculino e Feminino) — premiação do 1º ao 5º colocado.',
  '• Categoria Faixas Etárias da modalidade Corrida 5K (Masculino e Feminino) — premiação do 1º ao 3º colocado.',
  '• Categoria Geral Laranjal para Corrida 5K (Masculino e Feminino) — premiação do 1º ao 5º colocado.',
  '• Categoria Equipes (maior número de participantes inscritos) — premiação do 1º ao 3º colocado.',
  'Faixas etárias: 14 a 19, 20 a 24, 25 a 29, 30 a 34, 35 a 39, 40 a 44, 45 a 49, 50 a 54, 55 a 59, 60 a 64, 65 a 69 e 70+.',
  'Em hipótese alguma haverá dupla premiação; o atleta já premiado será excluído das demais premiações.',

  '## 5. Inscrições e Prazos',
  'As inscrições poderão ser realizadas até 05/09/2026 ou até atingir o limite de 500 atletas.',
  'Não serão permitidas trocas de inscrições no dia do evento. Não serão aceitas inscrições após a data prevista ou após o limite ser atingido, em hipótese alguma.',
  'A inscrição é pessoal e intransferível, não havendo possibilidade de transferência para outro atleta nem reembolso do valor pago.',

  '## 6. Kit de Participação',
  'Kit pré-prova (vinculado à inscrição): número de peito (uso obrigatório), chip de cronometragem (uso obrigatório) e camiseta alusiva ao evento para os primeiros 500 inscritos.',
  'Kit pós-prova (vinculado ao término): medalha promocional e personalizada, água e frutas.',
  'O chip de cronometragem é descartável e deverá ser amarrado no cordão do tênis, sendo sua correta utilização de responsabilidade do atleta.',

  '## 7. Regras Gerais da Corrida',
  'É obrigatório o uso do número de peito; qualquer mutilação do número implicará na desclassificação do atleta.',
  'O evento terá duração máxima de 1h30min, sendo a linha de chegada e seus serviços desativados após esse período.',
  'O atleta deverá observar o trajeto balizado, não sendo permitido qualquer meio auxiliar para obter vantagem ou cortar o percurso indicado. O atleta fora do trajeto poderá ser convidado a se retirar da competição.',

  '## 8. Responsabilidade e Uso de Imagem',
  'A participação do atleta é individual e por livre e espontânea vontade. Ao participar, o atleta assume total responsabilidade pelos dados fornecidos, aceita integralmente o regulamento e declara estar em condições de saúde e preparo para o evento.',
  'O atleta cede os direitos de uso de sua imagem para divulgação do evento, em qualquer mídia e tempo, sem ônus para a organização.',
  'A organização, patrocinadores, apoiadores e realizadores não se responsabilizam por perdas, danos, extravios ou prejuízos sofridos ou causados pelo atleta antes, durante ou depois do evento.',

  '## 9. Classificação',
  'A classificação será definida pela colocação (tempo / ordem de chegada) e publicada no site de inscrição da corrida. Não está autorizada a divulgação dos resultados por outros meios sem prévia autorização da organização.',

  '## 10. Cancelamento e Alterações',
  'Em caso de cancelamento por motivo de força maior (condições meteorológicas, determinações governamentais, etc.), a organização fica isenta de qualquer indenização além da devolução da taxa de inscrição. A organização poderá suspender ou prorrogar prazos e limitar o número de inscrições por necessidades técnicas ou estruturais, sem aviso prévio.',

  'Realização: Lar São Cristóvão · Laranjal Paulista/SP. Em caso de dúvidas, procure a organização do evento.',
];

interface RegulationModalProps {
  onClose: () => void;
  onAgree?: () => void; // marca a caixinha e fecha
}

export const RegulationModal: React.FC<RegulationModalProps> = ({ onClose, onAgree }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-slate-950 p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
          <h3 className="text-yellow-400 font-black italic text-lg uppercase tracking-wider flex items-center gap-2">
            <FileText size={20} /> Regulamento da Prova
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1"
            aria-label="Fechar regulamento"
          >
            <X size={22} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto text-slate-300 space-y-3 text-sm leading-relaxed">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
            2ª Corrida Noturna LSC · Laranjal Paulista/SP
          </p>
          {REGULATION_TEXT.map((block, i) =>
            block.startsWith('## ') ? (
              <h4 key={i} className="text-white font-bold text-base pt-2">{block.slice(3)}</h4>
            ) : (
              <p key={i}>{block}</p>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-all"
          >
            Fechar
          </button>
          {onAgree && (
            <button
              onClick={onAgree}
              className="px-6 py-2.5 bg-yellow-400 text-slate-900 rounded-lg font-bold text-sm hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/10"
            >
              <CheckCircle size={16} /> Li e estou de acordo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
