// Vault is a client-only SPA — all storage is in IndexedDB/localStorage.
// SSR would fail because browser APIs don't exist on the server.
export const ssr = false
export const prerender = false
