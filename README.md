# 2ª Corrida Noturna LSC – Sistema de Gestão

Sistema completo de gestão da **2ª Corrida Noturna LSC** (Laranjal Paulista/SP):
inscrições públicas, envio de comprovante de pagamento (PIX), dashboard
financeiro, gestão de corredores, equipes, patrocinadores, despesas, receitas
extras e organizadores.

> Evento: **19/09/2026 · 19h · Praça Armando Sales de Oliveira – Laranjal Paulista/SP**
> Categorias: 5K corrida e 3K caminhada

## Stack

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) (build)
- [Tailwind CSS](https://tailwindcss.com/) (estilos, via PostCSS)
- [Recharts](https://recharts.org/) (gráficos do dashboard)
- [Gemini API](https://ai.google.dev/) (sugestões de nomes de equipe — opcional)
- Persistência local via `localStorage` (sem backend)

## Rodando localmente

**Pré-requisito:** Node.js 18+

```bash
npm install
npm run dev
```

Para o build de produção:

```bash
npm run build    # gera a pasta dist/
npm run preview  # serve o build localmente
```

### Chave da API Gemini (opcional)

As funções de IA (gerar nomes de equipe) são opcionais. Para ativá-las, crie um
arquivo `.env.local` na raiz:

```
GEMINI_API_KEY=sua_chave_aqui
```

Sem a chave, o app funciona normalmente com sugestões pré-definidas.

### Upload de comprovantes (Cloudinary)

Comprovantes de pagamento (e autorização de menores) são enviados para o
Cloudinary — não ficam no Supabase, para não estourar a cota gratuita do
banco com centenas de arquivos. Sem estas variáveis, o envio de comprovante
fica indisponível. No `.env` (ou `.env.local`) na raiz:

```
VITE_CLOUDINARY_CLOUD_NAME=gdvxqrfr
VITE_CLOUDINARY_UPLOAD_PRESET=runners_payment_proof_unsigned
```

O preset precisa existir no Cloudinary (Settings → Upload → Upload presets)
marcado como **Unsigned** — é o que permite o navegador enviar o arquivo
direto, sem expor a API secret. Os mesmos valores já estão configurados no
`netlify.toml` e no workflow do GitHub Pages (`.github/workflows/deploy.yml`);
não são segredos (o preset unsigned é feito para ficar público no bundle).

### Mapa 3D do percurso (Mapbox)

A tela "Ver mapa do percurso" (botão na página inicial) mostra o traçado
oficial em um mapa 3D animado. Ela usa o Mapbox GL e precisa de um **token de
acesso** do Mapbox na variável `VITE_MAPBOX_TOKEN`:

```
VITE_MAPBOX_TOKEN=pk.seu_token_aqui
```

Como obter (plano gratuito atende bem um evento):
1. Crie uma conta em [mapbox.com](https://account.mapbox.com/).
2. Copie o **Default public token** (começa com `pk.`) ou crie um novo.
3. (Recomendado) Restrinja o token por URL (URL restrictions) para o domínio
   do site, já que ele fica visível no bundle — é assim que tokens públicos do
   Mapbox funcionam.

Sem o token, o site continua funcionando normalmente: o botão abre uma tela
"Mapa em configuração" com os dados do percurso (5,05 km, +81 m de elevação) e
a chamada para inscrição, sem quebrar nada.

O percurso vem de um GPX (Strava) pré-processado em `components/course/courseData.ts`
(coordenadas + distância acumulada + elevação), para não parsear XML no
navegador. A biblioteca do mapa é carregada **sob demanda** (lazy) — só quem
abre o percurso baixa o Mapbox, mantendo a página inicial leve.

## Deploy (Netlify)

O `netlify.toml` já está configurado: build com `npm run build` e publicação da
pasta `dist/`, com redirect de SPA. Basta conectar o repositório no Netlify.

## Estrutura

```
├── App.tsx                  # Roteamento entre as telas (landing, inscrição, admin…)
├── components/
│   ├── LandingPage.tsx      # Tela inicial pública (hero do evento + CTA)
│   ├── RegistrationForm.tsx # Formulário de inscrição
│   ├── ProofUploadScreen.tsx# Envio de comprovante por CPF
│   ├── Dashboard.tsx        # Painel financeiro (admin)
│   └── …                    # Demais telas de gestão
├── services/
│   ├── storageService.ts    # Persistência em localStorage
│   └── geminiService.ts     # Integração com a Gemini API
└── types.ts                 # Tipos do domínio
```

## Acessos

- **Inscrição pública:** tela inicial → "Fazer Inscrição Agora"
- **Envio de comprovante:** tela inicial → "Já me inscrevi, enviar comprovante"
- **Área restrita (admin/líderes de equipe):** botão "Área Restrita" no topo
