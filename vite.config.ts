import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/kulai/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  // Xác định các hằng số toàn cục sẽ được thay thế tại thời điểm build.
  // Vite sẽ tự động thay thế `process.env.GEMINI_API_KEY` bằng biến môi trường
  // được cung cấp trong lệnh build (ví dụ: trong tệp deploy.yml).
  define: {
    // Đây là cách làm trực tiếp và đáng tin cậy nhất cho GitHub Actions.
    'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    }
  }
});
