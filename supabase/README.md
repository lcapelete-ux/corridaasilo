# Banco de dados — 2ª Corrida Noturna LSC (Supabase)

Este diretório contém o schema completo para rodar o sistema de inscrições
em um projeto [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS),
substituindo o armazenamento atual em `localStorage` (`services/storageService.ts`).

## 1. Criar o projeto

1. Crie um projeto em https://supabase.com (ou use um já existente).
2. Abra **SQL Editor** no painel do projeto.

## 2. Rodar o schema

1. Cole o conteúdo de `schema.sql` e clique em **Run**.
   - Cria os tipos enumerados, as tabelas, as funções auxiliares, o gatilho
     de provisionamento de organizadores e todas as políticas de RLS.
2. Cole o conteúdo de `seed.sql` e clique em **Run**.
   - Preenche `teams` e `cities` com os valores já usados nos formulários
     (`PREDEFINED_TEAMS` / `PREDEFINED_CITIES`).

## 3. Criar os usuários administradores e líderes de equipe

O sistema atual tem dois logins "mestre" fixos no código (`marcelo` / `wilson`,
senha `1234`) e organizadores com senha em **texto puro** guardados no
`localStorage` (`Organizer.password`). **Isso não foi replicado neste schema**
— é uma falha de segurança grave e o Supabase já resolve isso pelo módulo
**Auth** (hash de senha, recuperação de senha, etc).

Para cada organizador (incluindo `marcelo` e `wilson`):

1. Vá em **Authentication > Users > Add user** no painel do Supabase.
2. Informe um e-mail (real ou "técnico", ex.: `marcelo@corridalsc.com.br`) e
   defina uma senha forte.
3. No campo **User Metadata**, adicione um JSON parecido com:

   ```json
   {
     "name": "Marcelo",
     "username": "marcelo",
     "team_name": "Avulso",
     "role": "admin",
     "phone": "(15) 99999-0000"
   }
   ```

   - `role`: `"admin"` (acesso total, equivalente aos logins mestre atuais)
     ou `"team_leader"` (acesso restrito à equipe indicada em `team_name`,
     equivalente aos organizadores cadastrados em "Organizadores").

4. Ao salvar, o gatilho `on_auth_user_created` cria automaticamente o
   registro correspondente em `public.organizers`.

No app, a tela de login (`LoginScreen.tsx`) deve passar a chamar
`supabase.auth.signInWithPassword({ email, password })` em vez da comparação
de usuário/senha em texto puro feita hoje.

## 4. Estrutura das tabelas

| Tabela           | Equivalente no localStorage    | Descrição                                            |
|------------------|---------------------------------|-------------------------------------------------------|
| `organizers`     | `runtrack_5k_organizers`         | Perfis dos organizadores/líderes (1:1 com `auth.users`) |
| `runners`        | `runtrack_5k_data`                | Inscrições dos corredores                              |
| `sponsors`       | `runtrack_5k_sponsors`            | Patrocinadores/apoiadores                              |
| `expenses`       | `runtrack_5k_expenses`            | Despesas do evento                                     |
| `extra_revenues` | `runtrack_5k_extra_revenue`       | Receitas extras                                        |
| `teams`          | `PREDEFINED_TEAMS` (hardcoded)    | Lista de equipes para o formulário                     |
| `cities`         | `PREDEFINED_CITIES` (hardcoded)   | Lista de cidades para o formulário                     |

Os nomes das colunas usam `snake_case` (padrão Postgres). Ao integrar com o
frontend (que usa `camelCase`), faça a conversão na camada de serviço — por
exemplo `full_name` ↔ `fullName`, `team_name` ↔ `teamName`, etc.

## 5. Regras de acesso (RLS)

- **Cadastro de corredor**: qualquer pessoa pode se inscrever, mesmo sem
  login (igual ao formulário público hoje). Inscrições anônimas são forçadas
  a nascer com `is_paid = false` e sem `payment_proof`.
- **Admin** (`role = 'admin'`): acesso total — corredores, patrocinadores,
  despesas, receitas extras e organizadores.
- **Líder de equipe** (`role = 'team_leader'`): vê e edita apenas os
  corredores da própria equipe (`team_name`), incluindo o status de
  pagamento — igual a `canEditFinancials` em `RunnerList.tsx`. Não pode
  excluir corredores (exclusão é restrita a admin) nem mover um corredor
  para outra equipe.
- **Envio de comprovante** ("Já me inscrevi, enviar comprovante" /
  `ProofUploadScreen.tsx`): em vez de consultar a tabela `runners`
  diretamente (o que exigiria expor CPFs/e-mails de todos os corredores ao
  público), use as funções:
  - `find_runner_by_cpf(p_cpf text)` — localiza a inscrição pelo CPF exato.
  - `attach_payment_proof(p_cpf text, p_proof text)` — anexa o comprovante
    à inscrição correspondente.

  Exemplo via `supabase-js`:

  ```ts
  const { data } = await supabase.rpc('find_runner_by_cpf', { p_cpf: cpf });
  await supabase.rpc('attach_payment_proof', { p_cpf: cpf, p_proof: base64Image });
  ```

## 6. Comprovantes e recibos (imagens)

Por simplicidade, `runners.payment_proof` e `sponsors.receipt_image`
continuam como texto (base64/data URL) — o mesmo formato salvo hoje no
localStorage. Assim, a migração do frontend fica mais simples (não é preciso
configurar Storage para começar a usar).

Se o volume/tamanho das imagens crescer muito, considere migrar para o
[Supabase Storage](https://supabase.com/docs/guides/storage) (buckets como
`payment-proofs` e `sponsor-receipts`) e trocar essas colunas por um caminho
de arquivo (ex.: `payment_proof_path`).

## 7. Operações administrativas/back-office

Scripts de back-office (relatórios, importações em massa, etc.) podem usar a
**service_role key** do Supabase, que ignora todas as políticas de RLS acima.
Nunca exponha essa chave no frontend — use apenas em ambientes server-side.
