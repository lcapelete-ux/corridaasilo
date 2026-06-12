-- ============================================================================
-- 2ª CORRIDA NOTURNA LSC – 5K  |  INSTALAÇÃO COMPLETA EM UM ÚNICO ARQUIVO
-- ============================================================================
-- Este arquivo faz TUDO de uma vez, na ordem certa:
--
--   1. Cria a estrutura do banco (tabelas, tipos, índices)
--   2. Cria as regras de segurança (RLS), iguais às permissões do app
--   3. Preenche as listas de equipes e cidades dos formulários
--   4. Cria os logins de administrador (marcelo e wilson) no Supabase Auth
--
-- COMO USAR:
--   1. EDITE as 2 senhas no "PASSO 0" logo abaixo  ← obrigatório!
--   2. No painel do Supabase, abra "SQL Editor"
--   3. Cole este arquivo INTEIRO e clique em "Run"
--   4. Pronto! O resultado final mostra um resumo do que foi criado.
--
-- Pode rodar mais de uma vez sem medo: o script não duplica nada e não
-- apaga dados existentes (ele é idempotente).
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PASSO 0 — EDITE AQUI (única parte que você precisa mexer)            ║
-- ║                                                                        ║
-- ║  Troque TROQUE-ESTA-SENHA pela senha desejada de cada administrador   ║
-- ║  (mínimo 4 caracteres; uma senha forte é recomendado). Se quiser,      ║
-- ║  troque também os e-mails — usar um e-mail real é recomendado, pois    ║
-- ║  permite recuperar a senha depois.                                     ║
-- ╚══════════════════════════════════════════════════════════════════════╝

drop table if exists pg_temp.setup_config;
create temp table setup_config (chave text primary key, valor text not null);

insert into setup_config (chave, valor) values
  ('marcelo_email', 'marcelo@corridalsc.com.br'),
  ('marcelo_senha', 'TROQUE-ESTA-SENHA'),
  ('wilson_email',  'wilson@corridalsc.com.br'),
  ('wilson_senha',  'TROQUE-ESTA-SENHA');

-- ─────────────────────────────────────────────────────────────────────────
--  Daqui para baixo NÃO é preciso mexer em nada.
-- ─────────────────────────────────────────────────────────────────────────


-- ----------------------------------------------------------------------------
-- 1. EXTENSÕES
-- ----------------------------------------------------------------------------
-- pgcrypto fornece crypt()/gen_salt() para gravar a senha já criptografada
-- (bcrypt), no mesmo formato que o Supabase Auth usa.

create extension if not exists pgcrypto with schema extensions;


-- ----------------------------------------------------------------------------
-- 2. TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------

do $$ begin
  create type public.gender as enum ('Masculino', 'Feminino');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shirt_size as enum ('P', 'M', 'G', 'GG', 'EXG');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sponsor_type as enum ('Camiseta', 'Medalha');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_category as enum ('Estrutura', 'Kit', 'Marketing', 'Premiação', 'Outros');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organizer_role as enum ('admin', 'team_leader');
exception when duplicate_object then null; end $$;


-- ----------------------------------------------------------------------------
-- 3. TABELAS DE REFERÊNCIA (equipes e cidades dos formulários)
-- ----------------------------------------------------------------------------
-- Alimentam os <select> do formulário de inscrição. Não possuem FK com
-- runners.team_name / runners.city para preservar o cadastro livre
-- (opção "Outra" no formulário).

create table if not exists public.teams (
  name text primary key
);

create table if not exists public.cities (
  name text primary key
);


-- ----------------------------------------------------------------------------
-- 4. ORGANIZADORES (ligados ao Supabase Auth)
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_organizers" do localStorage. A senha em
-- texto puro (Organizer.password) NÃO é replicada: a autenticação passa a
-- ser feita pelo Supabase Auth (auth.users), e esta tabela guarda apenas o
-- perfil/permissões de cada organizador.

create table if not exists public.organizers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  team_name text not null default 'Avulso',
  username text not null,
  role public.organizer_role not null default 'team_leader',
  phone text,
  created_at timestamptz not null default now()
);

create unique index if not exists organizers_username_key
  on public.organizers (lower(username));

comment on table public.organizers is
  'Perfil de cada organizador/líder de equipe, 1:1 com auth.users';
comment on column public.organizers.role is
  'admin = acesso total; team_leader = acesso restrito à equipe em team_name';


-- ----------------------------------------------------------------------------
-- 5. CORREDORES (inscrições)
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_data" do localStorage.

create table if not exists public.runners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  cpf text not null,
  city text not null,
  birth_date date not null,
  age integer not null check (age >= 10),
  gender public.gender not null,
  team_name text not null default 'Avulso',
  shirt_size public.shirt_size not null default 'M',
  registration_date timestamptz not null default now(),
  is_paid boolean not null default false,
  payment_proof text,
  created_at timestamptz not null default now()
);

-- CPF único comparando apenas os dígitos: impede inscrição duplicada mesmo
-- que uma venha com máscara ("111.222.333-44") e outra sem ("11122233344").
create unique index if not exists runners_cpf_digits_key
  on public.runners (regexp_replace(cpf, '\D', '', 'g'));
create unique index if not exists runners_email_key
  on public.runners (lower(email));
create index if not exists runners_team_name_idx
  on public.runners (lower(team_name));

comment on column public.runners.payment_proof is
  'Comprovante de pagamento (imagem em base64/data URL), igual ao formato salvo hoje no localStorage';


-- ----------------------------------------------------------------------------
-- 6. PATROCINADORES / APOIADORES
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_sponsors" do localStorage.

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(10, 2) not null default 0,
  type public.sponsor_type not null,
  position text,
  is_paid boolean not null default false,
  receipt_image text,
  created_at timestamptz not null default now()
);

comment on column public.sponsors.position is
  'Posição/local de exibição (ex.: estampa da camiseta). "N/A" quando type <> Camiseta';
comment on column public.sponsors.receipt_image is
  'Comprovante de recebimento (imagem em base64/data URL)';


-- ----------------------------------------------------------------------------
-- 7. DESPESAS
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_expenses" do localStorage.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10, 2) not null default 0,
  category public.expense_category not null,
  date date not null,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 8. RECEITAS EXTRAS
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_extra_revenue" do localStorage.

create table if not exists public.extra_revenues (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10, 2) not null default 0,
  date date not null,
  category text,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 9. FUNÇÕES AUXILIARES (usadas nas políticas de RLS)
-- ----------------------------------------------------------------------------
-- security definer: executam com privilégios do "dono" da função, evitando
-- recursão infinita de RLS ao consultar a própria tabela organizers.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizers
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_team()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select team_name from public.organizers where id = auth.uid();
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.my_team() to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 10. PROVISIONAMENTO AUTOMÁTICO DE ORGANIZADORES
-- ----------------------------------------------------------------------------
-- Sempre que um usuário é criado no Supabase Auth (por este script, pelo
-- painel em Authentication > Add user, ou por supabase.auth.admin.createUser)
-- com "User Metadata" no formato
--   { "name": "...", "username": "...", "team_name": "...",
--     "role": "admin" | "team_leader", "phone": "..." }
-- este gatilho cria automaticamente o registro em public.organizers.

create or replace function public.handle_new_organizer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organizers (id, name, team_name, username, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'team_name', 'Avulso'),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.organizer_role, 'team_leader'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_organizer();


-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (mesmas permissões do app)
-- ----------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.cities enable row level security;
alter table public.organizers enable row level security;
alter table public.runners enable row level security;
alter table public.sponsors enable row level security;
alter table public.expenses enable row level security;
alter table public.extra_revenues enable row level security;

-- Teams / Cities: leitura pública (preenchem os <select> do formulário),
-- escrita apenas por admins.
drop policy if exists "teams_select_all" on public.teams;
create policy "teams_select_all" on public.teams
  for select using (true);
drop policy if exists "teams_admin_write" on public.teams;
create policy "teams_admin_write" on public.teams
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cities_select_all" on public.cities;
create policy "cities_select_all" on public.cities
  for select using (true);
drop policy if exists "cities_admin_write" on public.cities;
create policy "cities_admin_write" on public.cities
  for all using (public.is_admin()) with check (public.is_admin());

-- Organizers: admin vê/gerencia todos; cada organizador vê o próprio perfil.
drop policy if exists "organizers_select_admin" on public.organizers;
create policy "organizers_select_admin" on public.organizers
  for select using (public.is_admin());
drop policy if exists "organizers_select_self" on public.organizers;
create policy "organizers_select_self" on public.organizers
  for select using (id = auth.uid());
drop policy if exists "organizers_admin_write" on public.organizers;
create policy "organizers_admin_write" on public.organizers
  for all using (public.is_admin()) with check (public.is_admin());

-- Runners:
--  - Qualquer pessoa (mesmo anônima) pode se inscrever, mas uma inscrição
--    anônima sempre nasce com is_paid = false e sem comprovante.
--  - Admin: acesso total.
--  - Líder de equipe: lê/edita apenas os corredores da própria equipe,
--    incluindo o status de pagamento (igual ao app atual). Não exclui.
drop policy if exists "runners_public_insert" on public.runners;
create policy "runners_public_insert" on public.runners
  for insert
  with check (
    public.is_admin()
    or lower(team_name) = lower(public.my_team())
    or (is_paid = false and (payment_proof is null or payment_proof = ''))
  );

drop policy if exists "runners_select_admin" on public.runners;
create policy "runners_select_admin" on public.runners
  for select using (public.is_admin());
drop policy if exists "runners_select_own_team" on public.runners;
create policy "runners_select_own_team" on public.runners
  for select using (lower(team_name) = lower(public.my_team()));

drop policy if exists "runners_update_admin" on public.runners;
create policy "runners_update_admin" on public.runners
  for update using (public.is_admin());
drop policy if exists "runners_update_own_team" on public.runners;
create policy "runners_update_own_team" on public.runners
  for update using (lower(team_name) = lower(public.my_team()));

drop policy if exists "runners_delete_admin" on public.runners;
create policy "runners_delete_admin" on public.runners
  for delete using (public.is_admin());

-- Sponsors / Expenses / Extra revenues: gestão financeira restrita a admins
-- (igual à navegação do App.tsx, que só mostra essas telas para admin).
drop policy if exists "sponsors_admin_all" on public.sponsors;
create policy "sponsors_admin_all" on public.sponsors
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all" on public.expenses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "extra_revenues_admin_all" on public.extra_revenues;
create policy "extra_revenues_admin_all" on public.extra_revenues
  for all using (public.is_admin()) with check (public.is_admin());


-- ----------------------------------------------------------------------------
-- 12. ENVIO DE COMPROVANTE PELO CPF (tela "Já me inscrevi")
-- ----------------------------------------------------------------------------
-- Usadas pela tela "Já me inscrevi, enviar comprovante" (ProofUploadScreen)
-- para localizar e atualizar a própria inscrição pelo CPF, sem expor a
-- tabela runners inteira a usuários anônimos. A comparação ignora a máscara
-- (pontos e traço), então "111.222.333-44" encontra "11122233344".

create or replace function public.find_runner_by_cpf(p_cpf text)
returns table (
  id uuid,
  full_name text,
  cpf text,
  is_paid boolean,
  payment_proof text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.full_name, r.cpf, r.is_paid, r.payment_proof
  from public.runners r
  where regexp_replace(r.cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');
$$;

create or replace function public.attach_payment_proof(p_cpf text, p_proof text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_proof is null or p_proof = '' then
    raise exception 'Comprovante vazio';
  end if;

  update public.runners
  set payment_proof = p_proof
  where regexp_replace(cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');

  if not found then
    raise exception 'CPF não encontrado';
  end if;
end;
$$;

grant execute on function public.find_runner_by_cpf(text) to anon, authenticated;
grant execute on function public.attach_payment_proof(text, text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 13. LISTAS DOS FORMULÁRIOS (equipes e cidades)
-- ----------------------------------------------------------------------------

insert into public.teams (name) values
  ('Avulso'),
  ('Ai que Fome (Tiete)'),
  ('Alcatéia'),
  ('Ecort (Tiete)'),
  ('Luso'),
  ('Runners Sempre Jovens'),
  ('Spazio'),
  ('Team Dani'),
  ('Time Runners (Tiete)'),
  ('Tribo')
on conflict (name) do nothing;

insert into public.cities (name) values
  ('Laranjal Paulista'),
  ('Cerquilho'),
  ('Cesário Lange'),
  ('Conchas'),
  ('Jumirim'),
  ('Pereiras'),
  ('Tiete')
on conflict (name) do nothing;


-- ----------------------------------------------------------------------------
-- 14. CRIAÇÃO DE LOGINS (Supabase Auth) DIRETO POR SQL
-- ----------------------------------------------------------------------------
-- admin_create_login cria um usuário completo no Supabase Auth (e-mail já
-- confirmado, senha criptografada com bcrypt) e o gatilho da seção 10 cria o
-- perfil em public.organizers. Só pode ser executada pelo SQL Editor ou com
-- a service_role key — nunca pelo site (anon/authenticated são bloqueados).
--
-- Para criar mais logins depois (ex.: um líder de equipe), rode no SQL Editor:
--
--   select public.admin_create_login(
--     'ana@exemplo.com',      -- e-mail de login
--     'SenhaForteDaAna1',     -- senha (mínimo 4 caracteres)
--     'Ana Silva',            -- nome
--     'ana',                  -- usuário
--     'Tribo',                -- equipe que ela lidera
--     'team_leader',          -- papel: 'admin' ou 'team_leader'
--     '(15) 99999-0000'       -- telefone (opcional)
--   );

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
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'E-mail inválido: "%"', coalesce(p_email, '(vazio)');
  end if;

  if p_password is null
     or btrim(p_password) = 'TROQUE-ESTA-SENHA'
     or length(btrim(p_password)) < 4 then
    raise exception 'SENHA NÃO DEFINIDA para %. Volte ao "PASSO 0 — EDITE AQUI" no topo do arquivo, escreva a senha desejada (mínimo 4 caracteres) e rode o arquivo inteiro de novo.', p_email;
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

-- Segurança: o site (anon/authenticated) NUNCA pode criar logins.
revoke all on function public.admin_create_login(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_create_login(text, text, text, text, text, text, text)
  to service_role;


-- ----------------------------------------------------------------------------
-- 15. CRIA OS DOIS ADMINISTRADORES (com os dados do PASSO 0)
-- ----------------------------------------------------------------------------

do $$
declare
  v_msg text;
begin
  select public.admin_create_login(
    (select valor from pg_temp.setup_config where chave = 'marcelo_email'),
    (select valor from pg_temp.setup_config where chave = 'marcelo_senha'),
    'Marcelo', 'marcelo', 'Avulso', 'admin', null
  ) into v_msg;
  raise notice '%', v_msg;

  select public.admin_create_login(
    (select valor from pg_temp.setup_config where chave = 'wilson_email'),
    (select valor from pg_temp.setup_config where chave = 'wilson_senha'),
    'Wilson', 'wilson', 'Avulso', 'admin', null
  ) into v_msg;
  raise notice '%', v_msg;
end $$;


-- ----------------------------------------------------------------------------
-- 16. RESUMO FINAL (aparece como resultado do "Run")
-- ----------------------------------------------------------------------------

select item, valor from (
  values
    (1, 'Equipes no formulário',  (select count(*)::text from public.teams)),
    (2, 'Cidades no formulário',  (select count(*)::text from public.cities)),
    (3, 'Logins de organizador',  (select count(*)::text from public.organizers)),
    (4, 'Administradores',        (select coalesce(string_agg(o.username || ' <' || u.email || '>', ', '), '(nenhum)')
                                     from public.organizers o
                                     join auth.users u on u.id = o.id
                                    where o.role = 'admin')),
    (5, 'Líderes de equipe',      (select coalesce(string_agg(o.username || ' → ' || o.team_name, ', '), '(nenhum ainda)')
                                     from public.organizers o
                                    where o.role = 'team_leader')),
    (6, 'Corredores inscritos',   (select count(*)::text from public.runners))
) as resumo (ordem, item, valor)
order by ordem;
