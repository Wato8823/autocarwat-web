import { Routes } from '@angular/router';
import { adminGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layouts/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      { path: '', loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.Dashboard) },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/shop-layout/shop-layout').then(m => m.ShopLayout),
    children: [
      { path: '', loadComponent: () => import('./features/shop/home/home').then(m => m.Home) },
    ],
  },
  { path: '**', redirectTo: '' },
];
