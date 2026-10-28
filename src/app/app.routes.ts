import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/public-layout.component').then(
        (module) => module.PublicLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
      {
        path: 'login',
        loadChildren: () =>
          import('./features/auth/auth.routes').then(
            (module) => module.AUTH_ROUTES,
          ),
      },
    ],
  },
  // /explore remains unassigned for the future public presentation page.
];
