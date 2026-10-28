// URL de l'API en production (via reverse-proxy ou domaine API dédié)
export const environment = {
  production: true,
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
