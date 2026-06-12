-- ============================================================================
-- 2ª Corrida Noturna LSC - 5K | Banco de dados completo (Supabase / PostgreSQL)
-- ============================================================================
-- Como usar:
--   1. Crie um projeto em https://supabase.com
--   2. Abra o "SQL Editor" do projeto
--   3. Cole o conteúdo deste arquivo e clique em "Run"
--   4. Em seguida rode o arquivo seed.sql (opcional, dados de referência)
--   5. Leia o README.md para criar os usuários administradores/organizadores
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------

create type public.gender as enum ('Masculino', 'Feminino');
create type public.shirt_size as enum ('P', 'M', 'G', 'GG', 'EXG');
create type public.sponsor_type as enum ('Camiseta', 'Medalha');
create type public.expense_category as enum ('Estrutura', 'Kit', 'Marketing', 'Premiação', 'Outros');
create type public.organizer_role as enum ('admin', 'team_leader');


-- ----------------------------------------------------------------------------
-- 2. TABELAS DE REFERÊNCIA (times e cidades dos formulários)
-- ----------------------------------------------------------------------------
-- Alimentam os <select> do formulário de inscrição. Não possuem FK com
-- runners.team_name / runners.city / organizers.team_name para preservar
-- o cadastro livre (opção "Outra" no formulário).

create table public.teams (
  name text primary key
);

create table public.cities (
  name text primary key
);


-- ----------------------------------------------------------------------------
-- 3. ORGANIZADORES (ligados ao Supabase Auth)
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_organizers" do localStorage. A senha em
-- texto puro (Organizer.password) NÃO é replicada: a autenticação passa a
-- ser feita pelo Supabase Auth (auth.users), e esta tabela guarda apenas o
-- perfil/permissões de cada organizador.

create table public.organizers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  team_name text not null default 'Avulso',
  username text not null,
  role public.organizer_role not null default 'team_leader',
  phone text,
  created_at timestamptz not null default now()
);

create unique index organizers_username_key on public.organizers (lower(username));

comment on table public.organizers is 'Perfil de cada organizador/líder de equipe, 1:1 com auth.users';
comment on column public.organizers.role is 'admin = acesso total; team_leader = acesso restrito à equipe em team_name';


-- ----------------------------------------------------------------------------
-- 4. CORREDORES (inscrições)
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_data" do localStorage.

create table public.runners (
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

create unique index runners_cpf_key on public.runners (cpf);
create unique index runners_email_key on public.runners (lower(email));
create index runners_team_name_idx on public.runners (lower(team_name));

comment on column public.runners.payment_proof is 'Comprovante de pagamento (imagem em base64/data URL), igual ao formato salvo hoje no localStorage';


-- ----------------------------------------------------------------------------
-- 5. PATROCINADORES / APOIADORES
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_sponsors" do localStorage.

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(10, 2) not null default 0,
  type public.sponsor_type not null,
  position text,
  is_paid boolean not null default false,
  receipt_image text,
  created_at timestamptz not null default now()
);

comment on column public.sponsors.position is 'Posição/local de exibição (ex.: estampa da camiseta). "N/A" quando type <> Camiseta';
comment on column public.sponsors.receipt_image is 'Comprovante de recebimento (imagem em base64/data URL)';


-- ----------------------------------------------------------------------------
-- 6. DESPESAS
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_expenses" do localStorage.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10, 2) not null default 0,
  category public.expense_category not null,
  date date not null,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 7. RECEITAS EXTRAS
-- ----------------------------------------------------------------------------
-- Substitui a tabela "runtrack_5k_extra_revenue" do localStorage.

create table public.extra_revenues (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10, 2) not null default 0,
  date date not null,
  category text,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 8. FUNÇÕES AUXILIARES (usadas nas políticas de RLS)
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
-- 9. PROVISIONAMENTO AUTOMÁTICO DE ORGANIZADORES
-- ----------------------------------------------------------------------------
-- Ao criar um usuário no Supabase Auth (Dashboard > Authentication > Add user,
-- ou supabase.auth.admin.createUser), preencha "raw_user_meta_data" (campo
-- "User Metadata" no painel) com:
--   { "name": "...", "username": "...", "team_name": "...", "role": "admin" | "team_leader", "phone": "..." }
-- Este gatilho cria automaticamente o registro correspondente em
-- public.organizers.

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
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_organizer();


-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
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
create policy "teams_select_all" on public.teams
  for select using (true);
create policy "teams_admin_write" on public.teams
  for all using (public.is_admin()) with check (public.is_admin());

create policy "cities_select_all" on public.cities
  for select using (true);
create policy "cities_admin_write" on public.cities
  for all using (public.is_admin()) with check (public.is_admin());

-- Organizers: admin vê/gerencia todos; cada organizador vê o próprio perfil.
create policy "organizers_select_admin" on public.organizers
  for select using (public.is_admin());
create policy "organizers_select_self" on public.organizers
  for select using (id = auth.uid());
create policy "organizers_admin_write" on public.organizers
  for all using (public.is_admin()) with check (public.is_admin());

-- Runners:
--  - Qualquer pessoa (mesmo anônima) pode se inscrever, mas uma inscrição
--    anônima sempre nasce com is_paid = false e sem comprovante.
--  - Admin: acesso total.
--  - Líder de equipe: acesso (leitura/edição) apenas aos corredores da
--    própria equipe, incluindo status de pagamento (igual ao app atual).
create policy "runners_public_insert" on public.runners
  for insert
  with check (
    public.is_admin()
    or lower(team_name) = lower(public.my_team())
    or (is_paid = false and (payment_proof is null or payment_proof = ''))
  );

create policy "runners_select_admin" on public.runners
  for select using (public.is_admin());
create policy "runners_select_own_team" on public.runners
  for select using (lower(team_name) = lower(public.my_team()));

create policy "runners_update_admin" on public.runners
  for update using (public.is_admin());
create policy "runners_update_own_team" on public.runners
  for update using (lower(team_name) = lower(public.my_team()));

create policy "runners_delete_admin" on public.runners
  for delete using (public.is_admin());

-- Sponsors / Expenses / Extra revenues: gestão financeira é restrita a admins
-- (igual à navegação do App.tsx, que só mostra essas telas para admin).
create policy "sponsors_admin_all" on public.sponsors
  for all using (public.is_admin()) with check (public.is_admin());

create policy "expenses_admin_all" on public.expenses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "extra_revenues_admin_all" on public.extra_revenues
  for all using (public.is_admin()) with check (public.is_admin());


-- ----------------------------------------------------------------------------
-- 11. FUNÇÕES RPC PARA ENVIO DE COMPROVANTE (acesso anônimo via CPF)
-- ----------------------------------------------------------------------------
-- Usadas pela tela "Já me inscrevi, enviar comprovante" (ProofUploadScreen)
-- para localizar e atualizar a própria inscrição pelo CPF, sem expor a
-- tabela runners inteira a usuários anônimos.

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
  where r.cpf = p_cpf;
$$;

create or replace function public.attach_payment_proof(p_cpf text, p_proof text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.runners
  set payment_proof = p_proof
  where cpf = p_cpf;

  if not found then
    raise exception 'CPF não encontrado';
  end if;
end;
$$;

grant execute on function public.find_runner_by_cpf(text) to anon, authenticated;
grant execute on function public.attach_payment_proof(text, text) to anon, authenticated;
