import { fileURLToPath, URL } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Tải tệp .env dựa trên chế độ (development, production).
    // fileURLToPath(new URL('.', import.meta.url)) chỉ định thư mục gốc để tìm tệp .env.
    // '' (chuỗi rỗng) cho phép tải tất cả các biến, không chỉ những biến có tiền tố VITE_.
    // FIX: Replaced `process.cwd()` to resolve TypeScript error "Property 'cwd' does not exist on type 'Process'".
    const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');

    return {
      base: '/kulai/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Xác định các hằng số toàn cục sẽ được thay thế tại thời điểm build.
      define: {
        // Dòng này sẽ thay thế mọi lần xuất hiện của `process.env.API_KEY` trong mã nguồn
        // bằng giá trị của `env.GEMINI_API_KEY` từ môi trường (tệp .env hoặc GitHub Secrets).
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      }
    };
});
