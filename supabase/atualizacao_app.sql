-- ============================================================================
-- ATUALIZAÇÃO DO BANCO — 2ª Corrida Noturna LSC
-- ============================================================================
-- Rode este arquivo INTEIRO no Supabase (SQL Editor > New query > Run)
-- DEPOIS de já ter rodado o setup_completo.sql.
--
-- Ele adiciona o que o site passou a usar desde o setup inicial:
--   1. Colunas de transferência de inscrição (transferred_from/transferred_at)
--   2. Colunas de cupom aplicado na inscrição (coupon_code/coupon_discount)
--   3. Tabela team_coupons (cupons de desconto por academia) + RLS
--   4. RPC find_coupon_by_code (validação pública de cupom no formulário)
--   5. find_runner_by_cpf passa a retornar também equipe e cidade
--   6. E-mail deixa de ser único quando vazio (e-mail é opcional na inscrição)
--   7. RPC get_login_email — permite entrar só com o usuário (sem digitar
--      o e-mail completo) na tela de login
--   8. admin_create_login passa a ser chamável pelo próprio site (tela
--      Organizadores), não só pelo SQL Editor — continua exigindo admin
--   9. Líder de equipe não pode mais confirmar pagamento e só transfere
--      inscrição dentro do prazo definido pelo admin (tabela app_settings)
--
-- Pode rodar mais de uma vez sem problema (idempotente).
-- ============================================================================

-- 1/2. Novas colunas em runners --------------------------------------------
alter table public.runners add column if not exists transferred_from text;
alter table public.runners add column if not exists transferred_at timestamptz;
alter table public.runners add column if not exists coupon_code text;
alter table public.runners add column if not exists coupon_discount numeric(10, 2);
alter table public.runners add column if not exists phone text;
-- Modalidade: '5k' corrida (padrão) ou '3k' caminhada
alter table public.runners add column if not exists modality text default '5k';
-- Menor de 18: nome do responsável (na inscrição) e autorização assinada
-- (anexada junto ao comprovante). Exigência do regulamento.
alter table public.runners add column if not exists guardian_name text;
alter table public.runners add column if not exists authorization_doc text;

comment on column public.runners.transferred_from is
  'Nome do titular anterior quando a inscrição foi transferida';
comment on column public.runners.coupon_discount is
  'Desconto em R$ aplicado pelo cupom da academia no momento da inscrição';
comment on column public.runners.phone is
  'Telefone de contato do atleta';
comment on column public.runners.modality is
  'Modalidade: 5k (corrida) ou 3k (caminhada)';
comment on column public.runners.guardian_name is
  'Nome do pai/mãe/responsável — obrigatório para atletas menores de 18 anos';
comment on column public.runners.authorization_doc is
  'Autorização assinada do responsável (base64), anexada junto ao comprovante';

-- 3. Cupons de desconto por academia ----------------------------------------
create table if not exists public.team_coupons (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  code text not null,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  value numeric(10, 2) not null check (value > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists team_coupons_code_key
  on public.team_coupons (upper(code));

-- Cupom pode ser bloqueado pelo admin: some do botão de aplicar e deixa de
-- ser aceito (nem digitado nem pelo botão do líder).
alter table public.team_coupons add column if not exists blocked boolean not null default false;
comment on column public.team_coupons.blocked is
  'Quando true, o cupom fica inativo: não aparece para aplicar nem é aceito';

-- Cupom geral: vale para qualquer pessoa que digitar, sem precisar de equipe.
alter table public.team_coupons add column if not exists is_global boolean not null default false;
comment on column public.team_coupons.is_global is
  'Quando true, o cupom é válido para todos (independe da equipe selecionada)';

alter table public.team_coupons enable row level security;

-- Gestão dos cupons: somente admins (a tela Cupons é só de admin)
drop policy if exists "team_coupons_admin_all" on public.team_coupons;
create policy "team_coupons_admin_all" on public.team_coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- Líder de equipe pode LER os cupons da própria academia (para o botão de
-- aplicar na inscrição manual). Continua sem poder criar/editar/excluir.
drop policy if exists "team_coupons_select_own_team" on public.team_coupons;
create policy "team_coupons_select_own_team" on public.team_coupons
  for select using (lower(team_name) = lower(public.my_team()));

-- 4. Validação pública de cupom ----------------------------------------------
-- O formulário de inscrição busca o cupom pelo código digitado. security
-- definer: funciona para visitantes anônimos sem abrir a tabela inteira.
-- Cupom bloqueado não é retornado (equivale a "não encontrado").
-- Retorna is_global: quando true, o cupom vale para qualquer equipe.
-- (drop necessário porque o tipo de retorno mudou)
drop function if exists public.find_coupon_by_code(text);
create or replace function public.find_coupon_by_code(p_code text)
returns table (id uuid, team_name text, code text, discount_type text, value numeric, is_global boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.team_name, c.code, c.discount_type, c.value, coalesce(c.is_global, false)
  from public.team_coupons c
  where upper(c.code) = upper(btrim(p_code))
    and coalesce(c.blocked, false) = false;
$$;

grant execute on function public.find_coupon_by_code(text) to anon, authenticated;

-- 5. find_runner_by_cpf com equipe, cidade e dados de menor de idade ---------
-- (drop necessário porque o tipo de retorno mudou)
-- Passa a retornar birth_date (para a tela de comprovante saber se é menor),
-- guardian_name e se já existe autorização anexada.
drop function if exists public.find_runner_by_cpf(text);
create or replace function public.find_runner_by_cpf(p_cpf text)
returns table (
  id uuid,
  full_name text,
  cpf text,
  team_name text,
  city text,
  is_paid boolean,
  payment_proof text,
  birth_date date,
  guardian_name text,
  has_authorization boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.full_name, r.cpf, r.team_name, r.city, r.is_paid, r.payment_proof,
         r.birth_date, r.guardian_name,
         (r.authorization_doc is not null and r.authorization_doc <> '') as has_authorization
  from public.runners r
  where regexp_replace(r.cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');
$$;

grant execute on function public.find_runner_by_cpf(text) to anon, authenticated;

-- 5b. attach_payment_proof aceita a autorização do menor (3º parâmetro) e a
--     EXIGE quando o atleta tem menos de 18 anos na data da prova. Defesa no
--     banco: mesmo que a tela falhe, um menor não fica sem autorização.
drop function if exists public.attach_payment_proof(text, text);
drop function if exists public.attach_payment_proof(text, text, text);
create or replace function public.attach_payment_proof(
  p_cpf text,
  p_proof text,
  p_authorization text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birth date;
  v_has_auth boolean;
  v_is_minor boolean;
begin
  if p_proof is null or p_proof = '' then
    raise exception 'Comprovante vazio';
  end if;

  select birth_date,
         (authorization_doc is not null and authorization_doc <> '')
    into v_birth, v_has_auth
  from public.runners
  where regexp_replace(cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g')
  limit 1;

  if not found then
    raise exception 'CPF não encontrado';
  end if;

  v_is_minor := v_birth is not null
    and extract(year from age(date '2026-09-19', v_birth)) < 18;

  -- Menor de 18: exige a autorização (a nova enviada agora ou uma já anexada)
  if v_is_minor
     and (p_authorization is null or p_authorization = '')
     and not coalesce(v_has_auth, false) then
    raise exception 'Atleta menor de 18 anos: é obrigatório anexar a autorização do responsável junto com o comprovante.';
  end if;

  update public.runners
  set payment_proof = p_proof,
      authorization_doc = coalesce(nullif(p_authorization, ''), authorization_doc)
  where regexp_replace(cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');
end;
$$;

grant execute on function public.attach_payment_proof(text, text, text) to anon, authenticated;

-- 6. E-mail opcional: única restrição vale apenas para e-mails preenchidos ---
drop index if exists public.runners_email_key;
create unique index if not exists runners_email_key
  on public.runners (lower(email))
  where email <> '';

-- 7. Login pelo usuário (sem digitar o e-mail completo) -----------------------
-- A tela de login aceita usuário OU e-mail. Quando vem só o usuário, esta
-- função devolve o e-mail de login correspondente (organizers -> auth.users).
create or replace function public.get_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.organizers o
  join auth.users u on u.id = o.id
  where lower(o.username) = lower(btrim(p_username))
  limit 1;
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;

-- 8. Criação de login de organizador diretamente pelo site --------------------
-- Antes só rodava pelo SQL Editor (service_role). Agora a verificação de
-- admin é feita DENTRO da função: se quem chama tem uma sessão autenticada
-- (site), precisa ser admin; se não tem sessão (SQL Editor / service_role,
-- como no setup_completo.sql), continua liberado como antes — por isso o
-- "PASSO 15" do setup e chamadas manuais no SQL Editor continuam funcionando.
create or replace function public.admin_create_login(
  p_email text,
  p_password text,
  p_name text,
  p_username text,
  p_team_name text default 'Avulso',
  p_role text default 'team_leader',
  p_phone text default null
)
returns text
language plpgsql
security definer
set search_path = extensions, public
as $$
declare
  v_user_id uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Apenas administradores podem criar logins de acesso.';
  end if;

  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'E-mail inválido: "%"', coalesce(p_email, '(vazio)');
  end if;

  if p_password is null
     or btrim(p_password) = 'TROQUE-ESTA-SENHA'
     or length(btrim(p_password)) < 4 then
    raise exception 'Senha inválida: use no mínimo 4 caracteres.';
  end if;

  if p_role not in ('admin', 'team_leader') then
    raise exception 'Papel inválido: "%" (use admin ou team_leader)', p_role;
  end if;

  -- Já existe? Não mexe (não troca senha nem papel por aqui).
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(p_email);

  if v_user_id is not null then
    return 'Já existia, nada alterado: ' || p_email;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'name', p_name,
      'username', p_username,
      'team_name', coalesce(p_team_name, 'Avulso'),
      'role', p_role,
      'phone', p_phone
    ),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', lower(p_email),
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    v_user_id::text,
    now(), now(), now()
  );

  return 'Criado: ' || p_email || ' (' || p_role || ')';
end;
$$;

-- Site (usuário autenticado) pode chamar — a checagem de admin é interna.
-- SQL Editor/service_role continua podendo (auth.uid() é nulo nesse contexto).
revoke all on function public.admin_create_login(text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.admin_create_login(text, text, text, text, text, text, text)
  to authenticated, service_role;

-- 9. Regras de líder de equipe: sem confirmar pagamento, transferência com prazo
-- ----------------------------------------------------------------------------

-- 9a. Cadastro manual pelo líder sempre nasce como pendente (a confirmação de
--     pagamento é sempre do admin, nunca de quem está cadastrando)
drop policy if exists "runners_public_insert" on public.runners;
create policy "runners_public_insert" on public.runners
  for insert
  with check (
    public.is_admin()
    or (lower(team_name) = lower(public.my_team()) and is_paid = false)
    or (is_paid = false and (payment_proof is null or payment_proof = ''))
  );

-- 9b. Configuração de transferência (definida pelo admin): prazo final e/ou
--     bloqueio manual imediato. Tabela de uma linha só (singleton).
create table if not exists public.app_settings (
  id boolean primary key default true,
  transfer_deadline date,
  transfers_blocked boolean not null default false,
  race_group_name text default '2ª CORRIDA NOTURNA LSC',
  promo_deadline date default '2026-08-23',
  registration_deadline date default '2026-09-05',
  constraint app_settings_singleton check (id)
);
insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- Adiciona colunas se ainda não existirem (bancos criados antes destas features)
alter table public.app_settings add column if not exists race_group_name text default '2ª CORRIDA NOTURNA LSC';
alter table public.app_settings add column if not exists promo_deadline date default '2026-08-23';
alter table public.app_settings add column if not exists registration_deadline date default '2026-09-05';

comment on column public.app_settings.promo_deadline is
  'Data final do lote promocional (desconto) exibida na página inicial';
comment on column public.app_settings.registration_deadline is
  'Data final das inscrições (definida pelo admin); depois dela o formulário público fecha';

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings
  for select using (true);
drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write" on public.app_settings
  for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.can_transfer_registrations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not coalesce((select transfers_blocked from public.app_settings limit 1), false)
    and (
      (select transfer_deadline from public.app_settings limit 1) is null
      or current_date <= (select transfer_deadline from public.app_settings limit 1)
    );
$$;

grant execute on function public.can_transfer_registrations() to anon, authenticated;

-- 9c. Trigger: aplica as duas regras diretamente no banco (defesa em
--     profundidade — a interface já esconde esses controles para o líder,
--     mas a regra vale mesmo que alguém tente contornar a tela). Admin
--     nunca é afetado.
create or replace function public.enforce_runner_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_transfer boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  -- Confirmação de pagamento é exclusiva do admin: reverte silenciosamente
  if new.is_paid is distinct from old.is_paid then
    new.is_paid := old.is_paid;
  end if;

  -- "Transferir" = trocar o titular (nome ou CPF), mesmo critério usado
  -- pela tela de transferência para marcar transferred_from/transferred_at
  v_is_transfer := (
    new.full_name is distinct from old.full_name or
    new.cpf is distinct from old.cpf
  );

  if v_is_transfer and not public.can_transfer_registrations() then
    raise exception 'Prazo para transferência de inscrições encerrado. Fale com a organização.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_runner_update_rules on public.runners;
create trigger trg_enforce_runner_update_rules
  before update on public.runners
  for each row execute function public.enforce_runner_update_rules();

-- 10. Permissões de tela + Entrega de Kits ----------------------------------
-- O admin pode "liberar telas" da área restrita para um organizador, gravando
-- as chaves das telas em organizers.permissions (ex.: {'kits'}).
alter table public.organizers add column if not exists permissions text[] not null default '{}';
comment on column public.organizers.permissions is
  'Telas da área restrita liberadas pelo admin para este usuário (ex.: kits)';

-- Controle de entrega do kit por atleta
alter table public.runners add column if not exists kit_delivered boolean not null default false;
alter table public.runners add column if not exists kit_delivered_at timestamptz;
comment on column public.runners.kit_delivered is
  'Kit já entregue ao atleta (baixa feita na tela de Entrega de Kits)';

-- Caller tem permissão para uma tela? Admin sempre; ou consta em permissions.
create or replace function public.has_view_permission(p_view text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.organizers o
    where o.id = auth.uid() and p_view = any(o.permissions)
  );
$$;
grant execute on function public.has_view_permission(text) to authenticated;

-- Lista os atletas para a tela de kits (admin ou quem tem a permissão 'kits').
-- security definer: enxerga todos os atletas, não só os da própria equipe.
create or replace function public.list_kit_runners()
returns table (
  id uuid, full_name text, cpf text, team_name text,
  modality text, shirt_size text, is_paid boolean,
  kit_delivered boolean, kit_delivered_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.full_name, r.cpf, r.team_name,
         r.modality, r.shirt_size, r.is_paid,
         r.kit_delivered, r.kit_delivered_at
  from public.runners r
  where public.has_view_permission('kits')
  order by r.full_name;
$$;
grant execute on function public.list_kit_runners() to authenticated;

-- Dá baixa (ou desfaz) na entrega do kit de um atleta.
create or replace function public.set_kit_delivered(p_runner_id uuid, p_delivered boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_view_permission('kits') then
    raise exception 'Sem permissão para dar baixa em kits.';
  end if;
  update public.runners
     set kit_delivered = p_delivered,
         kit_delivered_at = case when p_delivered then now() else null end
   where id = p_runner_id;
  if not found then
    raise exception 'Atleta não encontrado.';
  end if;
end;
$$;
grant execute on function public.set_kit_delivered(uuid, boolean) to authenticated;

-- 11. Logos de patrocinadores exibidos no rodapé do site --------------------
-- Leitura pública (o rodapé é visto por visitante anônimo) e escrita só admin,
-- mesmo padrão de teams/app_settings. Imagem em base64 (data URL), como os
-- demais uploads do app.
create table if not exists public.sponsor_logos (
  id uuid primary key default gen_random_uuid(),
  name text,
  image_data text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.sponsor_logos enable row level security;

drop policy if exists "sponsor_logos_select_all" on public.sponsor_logos;
create policy "sponsor_logos_select_all" on public.sponsor_logos
  for select using (true);
drop policy if exists "sponsor_logos_admin_write" on public.sponsor_logos;
create policy "sponsor_logos_admin_write" on public.sponsor_logos
  for all using (public.is_admin()) with check (public.is_admin());

-- 12. "Já paguei, mas não consigo enviar o comprovante agora" ---------------
-- Aviso que o próprio atleta registra na tela de comprovante quando não tem
-- como anexar o arquivo agora. NÃO confirma o pagamento sozinho — só sinaliza
-- pro admin checar manualmente. Some automaticamente se um comprovante de
-- verdade for enviado depois.
alter table public.runners add column if not exists paid_no_proof boolean not null default false;
alter table public.runners add column if not exists paid_no_proof_at timestamptz;
comment on column public.runners.paid_no_proof is
  'Atleta avisou que já pagou mas não conseguiu enviar o comprovante agora (aguarda checagem manual do admin)';

-- find_runner_by_cpf passa a informar também esse aviso (a tela usa isso pra
-- mostrar "você já avisou" e não deixar avisar de novo à toa).
drop function if exists public.find_runner_by_cpf(text);
create or replace function public.find_runner_by_cpf(p_cpf text)
returns table (
  id uuid,
  full_name text,
  cpf text,
  team_name text,
  city text,
  is_paid boolean,
  payment_proof text,
  birth_date date,
  guardian_name text,
  has_authorization boolean,
  paid_no_proof boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.full_name, r.cpf, r.team_name, r.city, r.is_paid, r.payment_proof,
         r.birth_date, r.guardian_name,
         (r.authorization_doc is not null and r.authorization_doc <> '') as has_authorization,
         r.paid_no_proof
  from public.runners r
  where regexp_replace(r.cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');
$$;

grant execute on function public.find_runner_by_cpf(text) to anon, authenticated;

-- Registra o aviso. security definer + validação do CPF, mesmo padrão de
-- attach_payment_proof (tela pública, sem login).
create or replace function public.report_paid_without_proof(p_cpf text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.runners
     set paid_no_proof = true,
         paid_no_proof_at = now()
   where regexp_replace(cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');
  if not found then
    raise exception 'CPF não encontrado';
  end if;
end;
$$;

grant execute on function public.report_paid_without_proof(text) to anon, authenticated;

-- attach_payment_proof passa a limpar o aviso quando um comprovante de
-- verdade é enviado (o atleta resolveu o problema sozinho).
drop function if exists public.attach_payment_proof(text, text);
drop function if exists public.attach_payment_proof(text, text, text);
create or replace function public.attach_payment_proof(
  p_cpf text,
  p_proof text,
  p_authorization text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birth date;
  v_has_auth boolean;
  v_is_minor boolean;
begin
  if p_proof is null or p_proof = '' then
    raise exception 'Comprovante vazio';
  end if;

  select birth_date,
         (authorization_doc is not null and authorization_doc <> '')
    into v_birth, v_has_auth
  from public.runners
  where regexp_replace(cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g')
  limit 1;

  if not found then
    raise exception 'CPF não encontrado';
  end if;

  v_is_minor := v_birth is not null
    and extract(year from age(date '2026-09-19', v_birth)) < 18;

  if v_is_minor
     and (p_authorization is null or p_authorization = '')
     and not coalesce(v_has_auth, false) then
    raise exception 'Atleta menor de 18 anos: é obrigatório anexar a autorização do responsável junto com o comprovante.';
  end if;

  update public.runners
     set payment_proof = p_proof,
         authorization_doc = coalesce(nullif(p_authorization, ''), authorization_doc),
         paid_no_proof = false
  where regexp_replace(cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');
end;
$$;

grant execute on function public.attach_payment_proof(text, text, text) to anon, authenticated;

-- 13. Telas liberadas já na criação do login (antes só dava pra liberar
--     editando o organizador depois de criado) --------------------------------

-- Gatilho que cria o registro em organizers passa a ler "permissions" do
-- metadata também (fica '{}' se não vier nada, igual antes).
create or replace function public.handle_new_organizer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organizers (id, name, team_name, username, role, phone, permissions)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'team_name', 'Avulso'),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.organizer_role, 'team_leader'),
    new.raw_user_meta_data->>'phone',
    coalesce(
      (select array_agg(v) from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'permissions', '[]'::jsonb)) as v),
      '{}'
    )
  )
  on conflict do nothing;
  return new;
end;
$$;

-- admin_create_login passa a receber as telas liberadas (8º parâmetro).
-- (drop necessário: mudou a lista de parâmetros)
drop function if exists public.admin_create_login(text, text, text, text, text, text, text);
create or replace function public.admin_create_login(
  p_email text,
  p_password text,
  p_name text,
  p_username text,
  p_team_name text default 'Avulso',
  p_role text default 'team_leader',
  p_phone text default null,
  p_permissions text[] default '{}'
)
returns text
language plpgsql
security definer
set search_path = extensions, public
as $$
declare
  v_user_id uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Apenas administradores podem criar logins de acesso.';
  end if;

  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'E-mail inválido: "%"', coalesce(p_email, '(vazio)');
  end if;

  if p_password is null
     or btrim(p_password) = 'TROQUE-ESTA-SENHA'
     or length(btrim(p_password)) < 4 then
    raise exception 'Senha inválida: use no mínimo 4 caracteres.';
  end if;

  if p_role not in ('admin', 'team_leader') then
    raise exception 'Papel inválido: "%" (use admin ou team_leader)', p_role;
  end if;

  -- Já existe? Não mexe (não troca senha nem papel por aqui).
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(p_email);

  if v_user_id is not null then
    return 'Já existia, nada alterado: ' || p_email;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'name', p_name,
      'username', p_username,
      'team_name', coalesce(p_team_name, 'Avulso'),
      'role', p_role,
      'phone', p_phone,
      'permissions', coalesce(to_jsonb(p_permissions), '[]'::jsonb)
    ),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', lower(p_email),
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    v_user_id::text,
    now(), now(), now()
  );

  return 'Criado: ' || p_email || ' (' || p_role || ')';
end;
$$;

revoke all on function public.admin_create_login(text, text, text, text, text, text, text, text[])
  from public, anon;
grant execute on function public.admin_create_login(text, text, text, text, text, text, text, text[])
  to authenticated, service_role;

-- 14. Idoso 60+ pode abrir mão da meia-inscrição para ajudar o Lar São
--     Cristóvão (paga o valor cheio com um desconto de apoiador, em vez da
--     meia-inscrição automática) -------------------------------------------
alter table public.runners add column if not exists senior_full_price boolean not null default false;
comment on column public.runners.senior_full_price is
  'Atleta 60+ que optou por pagar o valor cheio (com desconto de apoiador) em vez da meia-inscrição automática, para ajudar o Lar São Cristóvão';

-- 15. Contribuição extra opcional (ex.: 60+ que escolheu a meia-inscrição mas
--     quis ajudar com um valor à parte, antes de ir pro Pix) ----------------
alter table public.runners add column if not exists extra_donation numeric(10, 2);
comment on column public.runners.extra_donation is
  'Contribuição extra opcional somada à inscrição (ex.: 60+ que pagou meia mas quis ajudar com um valor à parte)';

-- 16. Semeia a tabela "cities" com as cidades que até agora estavam fixas no
--     código do formulário. A tabela já existia desde o setup_completo.sql
--     (mesmo padrão de "teams"), mas nunca tinha sido usada pelo app — o
--     admin agora gerencia essa lista pela tela "Cidades".
insert into public.cities (name) values
  ('Laranjal Paulista'), ('Cerquilho'), ('Cesário Lange'), ('Conchas'),
  ('Jumirim'), ('Pereiras'), ('Tiete')
on conflict (name) do nothing;

-- ============================================================================
-- Resumo final
-- ============================================================================
select
  (select count(*) from public.runners)      as inscricoes,
  (select count(*) from public.team_coupons) as cupons,
  (select count(*) from public.organizers)   as organizadores,
  (select count(*) from public.cities)       as cidades,
  'Banco atualizado com sucesso!'            as status;
