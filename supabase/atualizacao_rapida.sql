-- ============================================================================
-- ATUALIZAÇÃO RÁPIDA — remessa para a organização + marcação colorida
-- ============================================================================
-- Rode este arquivo INTEIRO no SQL Editor do Supabase. Ele é curto de
-- propósito: só cria as colunas destas duas funções.
--
-- Não apaga nada, não mexe em inscrição nenhuma e pode ser rodado de novo sem
-- problema (usa "if not exists").
--
-- Para que serve: quando você gera o arquivo para a organização, os atletas
-- daquele envio ficam marcados com o número da remessa e a data. Assim a
-- próxima remessa pega só quem entrou (ou pagou) depois — sem risco de mandar
-- a mesma pessoa duas vezes ou esquecer alguém.

alter table public.runners add column if not exists sent_batch smallint;
alter table public.runners add column if not exists sent_at timestamptz;

-- Marcação colorida: o organizador seleciona atletas na lista e pinta com uma
-- cor para se organizar (pagamento novo, inscrição nova, conferir...). O nome
-- de cada cor é escolhido por ele e fica em app_settings.marker_labels.
alter table public.runners add column if not exists marker text;
alter table public.app_settings add column if not exists marker_labels jsonb not null default '{}'::jsonb;

-- Limite de vagas mostrado no painel. É um alvo do organizador: ele aumenta
-- quando decide abrir mais inscrições. Não fecha o formulário sozinho — quem
-- fecha as inscrições continua sendo o prazo.
alter table public.app_settings add column if not exists max_athletes int not null default 500;

-- Inscrição zerada: por que não houve pagamento. 'patrocinio' vem com
-- sponsor_id preenchido (a vaga entrou no acordo com aquele patrocinador);
-- 'cortesia' é cortesia da organização. Vazio = inscrição normal.
alter table public.runners add column if not exists free_reason text;
alter table public.runners add column if not exists sponsor_id uuid references public.sponsors(id) on delete set null;
alter table public.runners drop constraint if exists runners_free_reason_check;
alter table public.runners add constraint runners_free_reason_check
  check (free_reason is null or free_reason in ('patrocinio', 'cortesia'));


comment on column public.runners.sent_batch is
  'Número da remessa enviada à organização (vazio = ainda não enviado)';
comment on column public.runners.sent_at is
  'Quando o atleta entrou na remessa enviada à organização';
comment on column public.runners.marker is
  'Marcação colorida do organizador (verde, azul, amarelo, laranja, vermelho, roxo)';
comment on column public.app_settings.marker_labels is
  'Nome que o organizador deu para cada cor de marcação';
comment on column public.app_settings.max_athletes is
  'Limite de vagas exibido no painel (alvo do organizador, não bloqueia inscrição)';
comment on column public.runners.free_reason is
  'Motivo da inscrição zerada: patrocinio (com sponsor_id) ou cortesia';
comment on column public.runners.sponsor_id is
  'Patrocinador que cobre esta vaga, quando free_reason = patrocinio';


-- Confirmação: mostra como está a fila de envio agora
select
  count(*)                                                   as total_inscritos,
  count(*) filter (where is_paid)                            as pagos,
  count(*) filter (where is_paid and sent_batch is null)      as prontos_para_enviar,
  count(*) filter (where sent_batch is not null)              as ja_enviados,
  coalesce(max(sent_batch), 0)                                as ultima_remessa,
  count(*) filter (where marker is not null)                  as com_marcacao,
  count(*) filter (where free_reason = 'patrocinio')          as vagas_patrocinio,
  count(*) filter (where free_reason = 'cortesia')            as cortesias
from public.runners;
