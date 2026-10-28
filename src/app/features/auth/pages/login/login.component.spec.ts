import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { LoginComponent } from './login.component';

describe('LoginComponent API errors', () => {
  it('shows a localized rate-limit message after too many attempts', () => {
    const component = new LoginComponent({} as never);
    const readMessage = (component as unknown as {
      messageFor(error: unknown): string;
    }).messageFor.bind(component);

    expect(readMessage(new HttpErrorResponse({ status: 429 }))).toBe(
      'Muitas tentativas. Aguarde um pouco e tente novamente.',
    );
  });

  it('navigates to home after password authentication succeeds', () => {
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    const LoginWithRouter = LoginComponent as unknown as new (
      authApi: unknown,
      router: unknown,
    ) => LoginComponent;
    const component = new LoginWithRouter(
      { login: () => of({ id: 'user-1', username: 'watchwise', email: 'user@example.com' }) },
      router,
    );
    const login = component as unknown as {
      form: { setValue(value: { email: string; password: string }): void };
      submit(): void;
    };

    login.form.setValue({ email: 'user@example.com', password: 'valid-password' });
    login.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });
});
