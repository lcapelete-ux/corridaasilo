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
