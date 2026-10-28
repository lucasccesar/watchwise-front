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
          import('./features/auth/pages/signup/signup.component').then(
            (module) => module.SignupComponent,
          ),
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
      {
        path: 'terms',
        loadComponent: () =>
          import('./shared/route-placeholder/route-placeholder.component').then(
            (module) => module.RoutePlaceholderComponent,
          ),
        data: { titleKey: 'termsTitle', messageKey: 'termsMessage' },
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./shared/route-placeholder/route-placeholder.component').then(
            (module) => module.RoutePlaceholderComponent,
          ),
        data: { titleKey: 'privacyTitle', messageKey: 'privacyMessage' },
      },
    ],
  },
  // /explore remains unassigned for the future public presentation page.
];
