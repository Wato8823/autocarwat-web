import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'connexion',
    title: 'Connexion — AutoCarWat',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'inscription',
    title: 'Créer un compte — AutoCarWat',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layouts/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      {
        path: '',
        title: 'Administration · Tableau de bord — AutoCarWat',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'paiements',
        title: 'Administration · Paiements — AutoCarWat',
        loadComponent: () =>
          import('./features/admin/payments/admin-payments').then(m => m.AdminPayments),
      },
      {
        path: 'commandes',
        title: 'Administration · Commandes — AutoCarWat',
        loadComponent: () =>
          import('./features/admin/orders/admin-orders').then(m => m.AdminOrders),
      },
      {
        path: 'catalogue',
        title: 'Administration · Catalogue — AutoCarWat',
        loadComponent: () =>
          import('./features/admin/catalog/admin-catalog').then(m => m.AdminCatalog),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/shop-layout/shop-layout').then(m => m.ShopLayout),
    children: [
      {
        path: '',
        title: 'AutoCarWat — Pièces détachées auto au Cameroun',
        loadComponent: () => import('./features/shop/home/home').then(m => m.Home),
      },
      {
        path: 'pieces',
        title: 'Catalogue des pièces — AutoCarWat',
        loadComponent: () => import('./features/shop/catalog/catalog').then(m => m.Catalog),
      },
      {
        path: 'pieces/:id',
        title: 'Détail de la pièce — AutoCarWat',
        loadComponent: () =>
          import('./features/shop/part-detail/part-detail').then(m => m.PartDetail),
      },
      {
        path: 'panier',
        title: 'Mon panier — AutoCarWat',
        loadComponent: () => import('./features/shop/cart/cart').then(m => m.Cart),
      },
      {
        path: 'commande',
        title: 'Finaliser ma commande — AutoCarWat',
        canActivate: [authGuard],
        loadComponent: () => import('./features/shop/checkout/checkout').then(m => m.Checkout),
      },
      {
        path: 'commandes',
        title: 'Mes commandes — AutoCarWat',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/shop/orders/orders-list').then(m => m.OrdersList),
      },
      {
        path: 'commandes/:id',
        title: 'Suivi de commande — AutoCarWat',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/shop/orders/order-detail').then(m => m.OrderDetail),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
