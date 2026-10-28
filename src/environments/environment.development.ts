// Le proxy de développement redirige /api et /storage vers Laravel.
export const environment = {
  production: false,
  apiUrl: '/api',
  // La démo doit être activée explicitement : une panne de l'API ne simule jamais un paiement.
  demoEnabled: true,
};
