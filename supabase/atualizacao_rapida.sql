-- ============================================================================
-- ATUALIZAÇÃO RÁPIDA — remessa, marcação colorida, limite de vagas, isenção,
-- flyer inicial e aviso de inscrições encerradas
-- ============================================================================
-- Rode este arquivo INTEIRO no SQL Editor do Supabase. Ele é curto de
-- propósito: só cria as colunas que essas telas precisam.
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

-- Flyer em tela cheia mostrado antes da vinheta de largada, ao abrir o site
-- — antes de qualquer outra coisa. Serve para avisos do momento (ex.: data e
-- local da retirada de kit). O conteúdo vem todo na imagem.
alter table public.app_settings add column if not exists kit_flyer_enabled boolean not null default false;
alter table public.app_settings add column if not exists kit_flyer_image_url text;

-- Aviso manual mostrado no lugar do formulário quando as inscrições estão
-- encerradas (prazo já passou). O WhatsApp é opcional: quando preenchido, a
-- tela mostra um botão que já abre a conversa com esse número.
alter table public.app_settings add column if not exists closed_notice_message text;
alter table public.app_settings add column if not exists closed_notice_whatsapp text;


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
comment on column public.app_settings.kit_flyer_enabled is
  'Liga/desliga o flyer em tela cheia mostrado antes da vinheta de largada';
comment on column public.app_settings.kit_flyer_image_url is
  'Imagem do flyer inicial (URL no Cloudinary)';
comment on column public.app_settings.closed_notice_message is
  'Aviso manual mostrado no lugar do formulário quando as inscrições estão encerradas (vazio = texto padrão)';
comment on column public.app_settings.closed_notice_whatsapp is
  'WhatsApp para contato mostrado junto do aviso de inscrições encerradas (vazio = sem botão)';


-- Confirmação: mostra como está a fila de envio agora
select
  count(*)                                                   as total_inscritos,
  count(*) filter (where is_paid)                            as pagos,
  count(*) filter (where is_paid and sent_batch is null)      as prontos_para_enviar,
  count(*) filter (where sent_batch is not null)              as ja_enviados,
  coalesce(max(sent_batch), 0)                                as ultima_remessa,
  count(*) filter (where marker is not null)                  as com_marcacao,
  count(*) filter (where free_reason = 'patrocinio')          as vagas_patrocinio,
  count(*) filter (where free_reason = 'cortesia')            as cortesias,
  (select kit_flyer_enabled from public.app_settings limit 1) as flyer_inicial_ligado,
  (select closed_notice_message is not null or closed_notice_whatsapp is not null
     from public.app_settings limit 1)                        as aviso_encerramento_configurado
from public.runners;
