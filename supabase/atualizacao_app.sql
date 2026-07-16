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
--
-- Pode rodar mais de uma vez sem problema (idempotente).
-- ============================================================================

-- 1/2. Novas colunas em runners --------------------------------------------
alter table public.runners add column if not exists transferred_from text;
alter table public.runners add column if not exists transferred_at timestamptz;
alter table public.runners add column if not exists coupon_code text;
alter table public.runners add column if not exists coupon_discount numeric(10, 2);

comment on column public.runners.transferred_from is
  'Nome do titular anterior quando a inscrição foi transferida';
comment on column public.runners.coupon_discount is
  'Desconto em R$ aplicado pelo cupom da academia no momento da inscrição';

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

alter table public.team_coupons enable row level security;

-- Gestão dos cupons: somente admins (a tela Cupons é só de admin)
drop policy if exists "team_coupons_admin_all" on public.team_coupons;
create policy "team_coupons_admin_all" on public.team_coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- 4. Validação pública de cupom ----------------------------------------------
-- O formulário de inscrição busca o cupom pelo código digitado. security
-- definer: funciona para visitantes anônimos sem abrir a tabela inteira.
create or replace function public.find_coupon_by_code(p_code text)
returns table (id uuid, team_name text, code text, discount_type text, value numeric)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.team_name, c.code, c.discount_type, c.value
  from public.team_coupons c
  where upper(c.code) = upper(btrim(p_code));
$$;

grant execute on function public.find_coupon_by_code(text) to anon, authenticated;

-- 5. find_runner_by_cpf com equipe e cidade ----------------------------------
-- (drop necessário porque o tipo de retorno mudou)
drop function if exists public.find_runner_by_cpf(text);
create or replace function public.find_runner_by_cpf(p_cpf text)
returns table (
  id uuid,
  full_name text,
  cpf text,
  team_name text,
  city text,
  is_paid boolean,
  payment_proof text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.full_name, r.cpf, r.team_name, r.city, r.is_paid, r.payment_proof
  from public.runners r
  where regexp_replace(r.cpf, '\D', '', 'g') = regexp_replace(p_cpf, '\D', '', 'g');
$$;

grant execute on function public.find_runner_by_cpf(text) to anon, authenticated;

-- 6. E-mail opcional: única restrição vale apenas para e-mails preenchidos ---
drop index if exists public.runners_email_key;
create unique index if not exists runners_email_key
  on public.runners (lower(email))
  where email <> '';

-- ============================================================================
-- Resumo final
-- ============================================================================
select
  (select count(*) from public.runners)      as inscricoes,
  (select count(*) from public.team_coupons) as cupons,
  'Banco atualizado com sucesso!'            as status;
