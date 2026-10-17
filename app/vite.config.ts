import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative asset paths, so one build works in the Capacitor apps and in the
// web preview at /overcomers/app/ (routing is hash-based, so no server rewrites).
export default defineConfig({
  base: './',
  plugins: [react()],
})
