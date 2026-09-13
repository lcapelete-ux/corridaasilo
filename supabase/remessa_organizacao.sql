-- ============================================================================
-- Remessa para a organização da prova — 2 colunas, nada mais
-- ============================================================================
-- Rode este arquivo INTEIRO no SQL Editor do Supabase. Ele é curto de
-- propósito: só cria as duas colunas que a marcação de remessa precisa.
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

comment on column public.runners.sent_batch is
  'Número da remessa enviada à organização (vazio = ainda não enviado)';
comment on column public.runners.sent_at is
  'Quando o atleta entrou na remessa enviada à organização';

-- Confirmação: mostra como está a fila de envio agora
select
  count(*)                                                   as total_inscritos,
  count(*) filter (where is_paid)                            as pagos,
  count(*) filter (where is_paid and sent_batch is null)      as prontos_para_enviar,
  count(*) filter (where sent_batch is not null)              as ja_enviados,
  coalesce(max(sent_batch), 0)                                as ultima_remessa
from public.runners;
