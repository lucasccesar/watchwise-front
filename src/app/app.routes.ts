import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/session/authenticated.guard';

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
      {
        path: 'community-guidelines',
        loadComponent: () =>
          import('./shared/route-placeholder/route-placeholder.component').then(
            (module) => module.RoutePlaceholderComponent,
          ),
        data: {
          titleKey: 'communityGuidelinesTitle',
          messageKey: 'communityGuidelinesMessage',
        },
      },
      {
        path: 'help-contact',
        loadComponent: () =>
          import('./shared/route-placeholder/route-placeholder.component').then(
            (module) => module.RoutePlaceholderComponent,
          ),
        data: { titleKey: 'helpContactTitle', messageKey: 'helpContactMessage' },
      },
    ],
  },
  {
    path: 'home',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        title: 'Início | Watchwise',
        loadComponent: () =>
          import('./features/home/pages/home/home.component').then(
            (module) => module.HomeComponent,
          ),
      },
    ],
  },
  // /explore remains unassigned for the future public presentation page.
];
