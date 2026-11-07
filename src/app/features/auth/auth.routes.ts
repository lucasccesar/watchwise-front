import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    title: 'Entrar | Watchwise',
    loadComponent: () =>
      import('./pages/login/login.component').then(
        (module) => module.LoginComponent,
      ),
  },
];
