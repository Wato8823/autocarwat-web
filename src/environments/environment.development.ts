// En développement : /api est redirigé vers http://127.0.0.1:8000/api via proxy.conf.json
// Si le backend Laravel n'est pas lancé, le mode démo prend automatiquement le relais.
export const environment = {
  production: false,
  apiUrl: '/api',
  demoFallback: true,
  merchant: {
    orangeMoney: {
      number: '699 45 12 80',
      code: '#150*47*882301#',
      holder: 'AUTOCARWAT SARL',
    },
    mtnMomo: {
      number: '677 88 23 10',
      code: '*126*4*642190#',
      holder: 'AUTOCARWAT SARL',
    },
  },
};
