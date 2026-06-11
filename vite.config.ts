import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (production/development)
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    base: './', // Caminhos relativos: funciona no GitHub Pages (/corridaasilo/) e em qualquer host
    define: {
      // Aceita API_KEY ou GEMINI_API_KEY (nome usado no painel do AI Studio/Netlify);
      // sem chave vira string vazia e as funções de IA usam o fallback offline
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY || '')
    }
  }
})