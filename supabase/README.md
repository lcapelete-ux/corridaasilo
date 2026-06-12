# Banco de dados — 2ª Corrida Noturna LSC (Supabase)

Este diretório contém **um único arquivo de instalação**, o
[`setup_completo.sql`](./setup_completo.sql), que monta todo o banco do
sistema de inscrições em um projeto [Supabase](https://supabase.com)
(PostgreSQL + Auth + RLS), substituindo o armazenamento atual em
`localStorage` (`services/storageService.ts`).

## Instalação (3 passos)

1. **Edite as senhas**: abra o `setup_completo.sql` e, no **PASSO 0** (topo
   do arquivo), troque `TROQUE-ESTA-SENHA` por uma senha forte para o
   `marcelo` e outra para o `wilson`. Se quiser, troque também os e-mails —
   um e-mail real é recomendado, pois permite recuperar a senha depois.
2. No painel do projeto Supabase, abra o **SQL Editor**.
3. Cole o arquivo **inteiro** e clique em **Run**. O resultado mostra um
   resumo do que foi criado.

Pronto. O script faz tudo: estrutura, regras de segurança, listas de
equipes/cidades dos formulários **e os dois logins de administrador** no
Supabase Auth (e-mail já confirmado, senha criptografada com bcrypt).

Observações:

- **Pode rodar mais de uma vez** sem medo: o script é idempotente — não
  duplica nada e não apaga dados existentes.
- Se aparecer o erro **"SENHA NÃO DEFINIDA"**, é porque o PASSO 0 não foi
  editado. Defina as senhas e rode o arquivo inteiro de novo.
- O script **não troca a senha** de um login que já existe. Para trocar uma
  senha depois, use **Authentication → Users → (usuário) → Reset password**
  no painel.

## Criando mais logins depois (ex.: líderes de equipe)

No SQL Editor, rode:

```sql
select public.admin_create_login(
  'ana@exemplo.com',      -- e-mail de login
  'SenhaForteDaAna1',     -- senha (mínimo 8 caracteres)
  'Ana Silva',            -- nome
  'ana',                  -- usuário
  'Tribo',                -- equipe que ela lidera
  'team_leader',          -- papel: 'admin' ou 'team_leader'
  '(15) 99999-0000'       -- telefone (opcional)
);
```

- `role = 'admin'`: acesso total (equivalente aos logins mestre atuais).
- `role = 'team_leader'`: acesso restrito aos corredores da equipe indicada
  (equivalente aos organizadores cadastrados em "Organizadores" no app).

Alternativa pelo painel: **Authentication → Users → Add user**, preenchendo
o campo **User Metadata** com
`{ "name": "...", "username": "...", "team_name": "...", "role": "team_leader", "phone": "..." }`
— o gatilho `on_auth_user_created` cria o perfil em `public.organizers`
automaticamente nos dois caminhos.

> Segurança: `admin_create_login` só funciona no SQL Editor ou com a
> `service_role` key. Os papéis usados pelo site (`anon`/`authenticated`)
> são explicitamente bloqueados de executá-la.

## Por que as senhas antigas não foram migradas

O sistema atual tem dois logins "mestre" fixos no código (`marcelo` /
`wilson`, senha `1234`) e organizadores com senha em **texto puro** no
`localStorage` (`Organizer.password`). Isso é uma falha de segurança grave
e **não foi replicado**: a autenticação passa a ser feita pelo módulo
**Auth** do Supabase (hash bcrypt, recuperação de senha etc.). No app, a
tela de login (`LoginScreen.tsx`) deve passar a chamar
`supabase.auth.signInWithPassword({ email, password })` em vez da
comparação de usuário/senha em texto puro feita hoje.

## Estrutura das tabelas

| Tabela           | Equivalente no localStorage       | Descrição                                               |
|------------------|-----------------------------------|---------------------------------------------------------|
| `organizers`     | `runtrack_5k_organizers`          | Perfis dos organizadores/líderes (1:1 com `auth.users`) |
| `runners`        | `runtrack_5k_data`                | Inscrições dos corredores                               |
| `sponsors`       | `runtrack_5k_sponsors`            | Patrocinadores/apoiadores                               |
| `expenses`       | `runtrack_5k_expenses`            | Despesas do evento                                      |
| `extra_revenues` | `runtrack_5k_extra_revenue`       | Receitas extras                                         |
| `teams`          | `PREDEFINED_TEAMS` (hardcoded)    | Lista de equipes para o formulário                      |
| `cities`         | `PREDEFINED_CITIES` (hardcoded)   | Lista de cidades para o formulário                      |

Os nomes das colunas usam `snake_case` (padrão Postgres). Ao integrar com o
frontend (que usa `camelCase`), faça a conversão na camada de serviço — por
exemplo `full_name` ↔ `fullName`, `team_name` ↔ `teamName`, etc.

O CPF é único **comparando apenas os dígitos**: `111.222.333-44` e
`11122233344` contam como a mesma inscrição.

## Regras de acesso (RLS)

- **Cadastro de corredor**: qualquer pessoa pode se inscrever, mesmo sem
  login (igual ao formulário público hoje). Inscrições anônimas são forçadas
  a nascer com `is_paid = false` e sem `payment_proof`.
- **Admin** (`role = 'admin'`): acesso total — corredores, patrocinadores,
  despesas, receitas extras, organizadores e listas de equipes/cidades.
- **Líder de equipe** (`role = 'team_leader'`): vê e edita apenas os
  corredores da própria equipe (`team_name`), incluindo o status de
  pagamento — igual a `canEditFinancials` em `RunnerList.tsx`. Não pode
  excluir corredores (exclusão é restrita a admin) nem mover/criar corredor
  em outra equipe.
- **Envio de comprovante** ("Já me inscrevi, enviar comprovante" /
  `ProofUploadScreen.tsx`): em vez de consultar a tabela `runners`
  diretamente (o que exigiria expor CPFs/e-mails de todos os corredores ao
  público), use as funções — a busca ignora a máscara do CPF:
  - `find_runner_by_cpf(p_cpf text)` — localiza a inscrição pelo CPF.
  - `attach_payment_proof(p_cpf text, p_proof text)` — anexa o comprovante.

  Exemplo via `supabase-js`:

  ```ts
  const { data } = await supabase.rpc('find_runner_by_cpf', { p_cpf: cpf });
  await supabase.rpc('attach_payment_proof', { p_cpf: cpf, p_proof: base64Image });
  ```

## Comprovantes e recibos (imagens)

Por simplicidade, `runners.payment_proof` e `sponsors.receipt_image`
continuam como texto (base64/data URL) — o mesmo formato salvo hoje no
localStorage. Assim, a migração do frontend fica mais simples (não é preciso
configurar Storage para começar a usar).

Se o volume/tamanho das imagens crescer muito, considere migrar para o
[Supabase Storage](https://supabase.com/docs/guides/storage) (buckets como
`payment-proofs` e `sponsor-receipts`) e trocar essas colunas por um caminho
de arquivo (ex.: `payment_proof_path`).

## Operações administrativas/back-office

Scripts de back-office (relatórios, importações em massa, etc.) podem usar a
**service_role key** do Supabase, que ignora todas as políticas de RLS acima.
Nunca exponha essa chave no frontend — use apenas em ambientes server-side.
