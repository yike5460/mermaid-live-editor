import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        fs: {
            allow: ['.']
        }
    },
    define: {
        // Cloudflare bindings for development
        'process.env.CLOUDFLARE_AI': JSON.stringify(true)
    }
}); 