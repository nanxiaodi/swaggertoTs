// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.js'), // 您的入口文件
      name: 'swaggerToTs', // 您的库的名称
      fileName: (format) => `my-library.${format}.js`
    },
    rollupOptions: {
      
    }
  }
});
