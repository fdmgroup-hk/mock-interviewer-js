import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), basicSsl()],
    server: {
        proxy: {
            '/api/nim': {
                target: 'https://integrate.api.nvidia.com/v1',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/api\/nim/, ''),
            },
        },
    },
})
