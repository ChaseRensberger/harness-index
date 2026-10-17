import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { harnessCatalog } from './catalog/vite.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    harnessCatalog(),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
