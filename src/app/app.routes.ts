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
      {
        path: 'home',
        loadComponent: () =>
          import('./shared/route-placeholder/route-placeholder.component').then(
            (module) => module.RoutePlaceholderComponent,
          ),
        data: { titleKey: 'homeTitle', messageKey: 'homeMessage' },
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./shared/route-placeholder/route-placeholder.component').then(
            (module) => module.RoutePlaceholderComponent,
          ),
        data: { titleKey: 'registerTitle', messageKey: 'registerMessage' },
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./shared/route-placeholder/route-placeholder.component').then(
            (module) => module.RoutePlaceholderComponent,
          ),
        data: {
          titleKey: 'forgotPasswordTitle',
          messageKey: 'forgotPasswordMessage',
        },
      },
    ],
  },
  // /explore remains unassigned for the future public presentation page.
];
