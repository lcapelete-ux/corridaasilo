/// <reference types="vite/client" />

// Substituído em tempo de build pelo `define` do vite.config.ts
declare const process: {
  env: {
    API_KEY?: string
  }
}
