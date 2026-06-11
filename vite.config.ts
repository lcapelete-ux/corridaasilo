import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (production/development)
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    base: '/', // Base na raiz para garantir compatibilidade com Netlify
    define: {
      // Define a variável de ambiente explicitamente para ser substituída no build
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})