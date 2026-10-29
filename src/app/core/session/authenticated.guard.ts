import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthSessionService } from './session.service';

export const authenticatedGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  return session.ensureUser().pipe(
    map((user) => (user ? true : router.parseUrl('/login'))),
  );
};
