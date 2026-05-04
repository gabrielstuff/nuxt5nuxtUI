export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  icon: {
    provider: 'iconify',
    serverBundle: false,
  },
  future: { compatibilityVersion: 5 },
  experimental: { nitroAutoImports: true },
  sourcemap: { client: true },
})
