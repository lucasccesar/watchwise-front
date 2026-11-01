import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/session/authenticated.guard';
import { movieMessages } from './features/content/i18n/movie.messages';

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
          import('./features/auth/pages/password-recovery/password-recovery.component').then(
            (module) => module.PasswordRecoveryComponent,
          ),
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('./shared/public-info/public-info.component').then(
            (module) => module.PublicInfoComponent,
          ),
        data: { publicPage: 'terms' },
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./shared/public-info/public-info.component').then(
            (module) => module.PublicInfoComponent,
          ),
        data: { publicPage: 'privacy' },
      },
      {
        path: 'community-guidelines',
        loadComponent: () =>
          import('./shared/public-info/public-info.component').then(
            (module) => module.PublicInfoComponent,
          ),
        data: { publicPage: 'guidelines' },
      },
      {
        path: 'help-contact',
        loadComponent: () =>
          import('./shared/public-info/public-info.component').then(
            (module) => module.PublicInfoComponent,
          ),
        data: { publicPage: 'help' },
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
  {
    path: 'users/:username',
    canActivate: [authenticatedGuard],
    title: 'Perfil | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { profileSection: 'profile' },
        loadComponent: () =>
          import('./features/profile/pages/profile/profile.component').then(
            (module) => module.ProfileComponent,
          ),
      },
      {
        path: 'episode-ratings-map/:seriesTmdbId',
        data: { profileSection: 'episode-ratings-map-show' },
        loadComponent: () =>
          import('./features/profile/pages/profile/profile.component').then(
            (module) => module.ProfileComponent,
          ),
      },
      {
        path: 'followers',
        title: 'Seguidores | Watchwise',
        data: { connectionsMode: 'followers' },
        loadComponent: () =>
          import('./features/profile/pages/connections/connections.component').then(
            (module) => module.ConnectionsComponent,
          ),
      },
      {
        path: 'following',
        title: 'Seguindo | Watchwise',
        data: { connectionsMode: 'following' },
        loadComponent: () =>
          import('./features/profile/pages/connections/connections.component').then(
            (module) => module.ConnectionsComponent,
          ),
      },
      ...[
        ['progress', 'progress', 'Progresso do perfil'],
        ['history', 'history', 'Histórico do perfil'],
        ['reviews', 'reviews', 'Avaliações do perfil'],
        ['lists', 'lists', 'Listas do perfil'],
        ['watchlist', 'watchlist', 'Watchlist do perfil'],
        ['picks', 'picks', 'Picks do perfil'],
        ['episode-ratings-map', 'episode-ratings-map', 'Mapa de notas de episódios'],
        ['month-in-review', 'month-in-review', 'Retrospectiva mensal'],
        ['year-in-review', 'year-in-review', 'Retrospectiva anual'],
        ['all-time-stats', 'all-time-stats', 'Estatísticas gerais'],
      ].map(([path, profileSection, title]) => ({
        path,
        data: { profileSection },
        title: title + ' | Watchwise',
        loadComponent: () =>
          import('./features/profile/pages/profile/profile.component').then(
            (module) => module.ProfileComponent,
          ),
      })),
    ],
  },
  {
    path: 'settings',
    canActivate: [authenticatedGuard],
    title: 'Configurações | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/settings/pages/settings/settings.component').then(
            (module) => module.SettingsComponent,
          ),
      },
    ],
  },
  {
    path: 'diary/reviews',
    canActivate: [authenticatedGuard],
    title: 'Resenhas | Diário | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        data: { mode: 'reviews' },
        loadComponent: () =>
          import('./features/diary/pages/diary/diary.component').then(
            (module) => module.DiaryComponent,
          ),
      },
    ],
  },
  {
    path: 'diary/entry/:entryId',
    canActivate: [authenticatedGuard],
    title: 'Resenha | Diário | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/diary/pages/review-detail/review-detail.component').then(
            (module) => module.DiaryReviewDetailComponent,
          ),
      },
    ],
  },
  {
    path: 'diary',
    canActivate: [authenticatedGuard],
    title: 'Diário | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/diary/pages/diary/diary.component').then(
            (module) => module.DiaryComponent,
          ),
      },
    ],
  },
  {
    path: 'progress',
    canActivate: [authenticatedGuard],
    title: 'Progresso | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        data: { profileSection: 'progress' },
        loadComponent: () =>
          import('./features/profile/pages/profile/profile.component').then(
            (module) => module.ProfileComponent,
          ),
      },
    ],
  },
  {
    path: 'watchlist',
    canActivate: [authenticatedGuard],
    title: 'Watchlist | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/watchlist/pages/watchlist/watchlist.component').then(
            (module) => module.WatchlistComponent,
          ),
      },
    ],
  },
  {
    path: 'calendar',
    canActivate: [authenticatedGuard],
    title: 'Calendário | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/calendar/pages/calendar/calendar.component').then(
            (module) => module.CalendarComponent,
          ),
      },
    ],
  },
  {
    path: 'lists/community',
    canActivate: [authenticatedGuard],
    title: 'Listas da comunidade | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', data: { mode: 'community' }, loadComponent: () => import('./features/lists/pages/lists/lists.component').then((module) => module.ListsComponent) }],
  },
  {
    path: 'lists',
    canActivate: [authenticatedGuard],
    title: 'Listas | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/lists/pages/lists/lists.component').then((module) => module.ListsComponent) }],
  },
  {
    path: 'lists/:listId/progress',
    canActivate: [authenticatedGuard],
    title: 'Progresso da lista | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/lists/pages/list-progress/list-progress.component').then((module) => module.ListProgressComponent) }],
  },
  {
    path: 'lists/:listId',
    canActivate: [authenticatedGuard],
    title: 'Lista | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/lists/pages/list-detail/list-detail.component').then((module) => module.ListDetailComponent) }],
  },
  {
    path: 'games/play/:gameType',
    canActivate: [authenticatedGuard],
    title: 'Desafio diário | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/games/pages/game-play/game-play.component').then((module) => module.GamePlayComponent) }],
  },
  {
    path: 'games/ranking',
    canActivate: [authenticatedGuard],
    title: 'Ranking de jogos | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/games/pages/game-ranking/game-ranking.component').then((module) => module.GameRankingComponent) }],
  },
  {
    path: 'games/day/:challengeDate',
    canActivate: [authenticatedGuard],
    title: 'Jogos | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/games/pages/games/games.component').then((module) => module.GamesComponent) }],
  },
  {
    path: 'games',
    canActivate: [authenticatedGuard],
    title: 'Jogos | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/games/pages/games/games.component').then((module) => module.GamesComponent) }],
  },
  {
    path: 'picks/create',
    canActivate: [authenticatedGuard],
    title: 'Criar modelo | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/picks/pages/pick-create/pick-create.component').then((module) => module.PickCreateComponent) }],
  },
  {
    path: 'picks/import',
    canActivate: [authenticatedGuard],
    title: 'Importar modelo | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/picks/pages/pick-import/pick-import.component').then((module) => module.PickImportComponent) }],
  },
  {
    path: 'picks/templates',
    canActivate: [authenticatedGuard],
    title: 'Modelos de escolhas | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', pathMatch: 'full', loadComponent: () => import('./features/picks/pages/picks-explore/picks-explore.component').then((module) => module.PicksExploreComponent) }],
  },
  {
    path: 'picks/templates/:templateId/new',
    canActivate: [authenticatedGuard],
    title: 'Nova escolha | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/picks/pages/pick-fill/pick-fill.component').then((module) => module.PickFillComponent) }],
  },
  {
    path: 'picks/templates/:templateId',
    canActivate: [authenticatedGuard],
    title: 'Modelo de escolhas | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/picks/pages/pick-template/pick-template.component').then((module) => module.PickTemplateComponent) }],
  },
  {
    path: 'picks/:pickId',
    canActivate: [authenticatedGuard],
    title: 'Escolha | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/picks/pages/pick-detail/pick-detail.component').then((module) => module.PickDetailComponent) }],
  },
  {
    path: 'picks',
    canActivate: [authenticatedGuard],
    title: 'Escolhas | Watchwise',
    loadComponent: () => import('./layout/authenticated-layout.component').then((module) => module.AuthenticatedLayoutComponent),
    children: [{ path: '', loadComponent: () => import('./features/picks/pages/picks-explore/picks-explore.component').then((module) => module.PicksExploreComponent) }],
  },
  {
    path: 'social',
    canActivate: [authenticatedGuard],
    title: 'Social | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/social/pages/social/social.component').then(
            (module) => module.SocialComponent,
          ),
      },
    ],
  },
  {
    path: 'notifications',
    canActivate: [authenticatedGuard],
    title: 'Notificações | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/notifications/pages/notifications/notifications.component').then(
            (module) => module.NotificationsComponent,
          ),
      },
    ],
  },
  {
    path: 'trending',
    canActivate: [authenticatedGuard],
    title: 'Em alta | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/trending/pages/trending/trending.component').then(
            (module) => module.TrendingComponent,
          ),
      },
    ],
  },
  {
    path: 'content/movie/:tmdbId',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        title: movieMessages['pt-BR'].pageTitle,
        loadComponent: () =>
          import('./features/content/pages/movie/movie.component').then(
            (module) => module.MovieComponent,
          ),
      },
    ],
  },
  {
    path: 'content/series/:tmdbId/season/:seasonNumber/episode/:episodeNumber',
    canActivate: [authenticatedGuard],
    title: 'Episódio | Watchwise',
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/content/pages/episode/episode.component').then(
            (module) => module.EpisodeComponent,
          ),
      },
    ],
  },
  {
    path: 'content/series/:tmdbId',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./layout/authenticated-layout.component').then(
        (module) => module.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: '',
        title: 'Série | Watchwise',
        loadComponent: () =>
          import('./features/content/pages/series/series.component').then(
            (module) => module.SeriesComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./layout/public-layout.component').then(
        (module) => module.PublicLayoutComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./shared/not-found/not-found.component').then(
            (module) => module.NotFoundComponent,
          ),
      },
    ],
  },
  // /explore remains unassigned for the future public presentation page.
];
