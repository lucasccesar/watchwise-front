import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { messageCatalog } from '../../../../shared/i18n/messages';
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
      googleIdentity: unknown,
      session: unknown,
    ) => LoginComponent;
    const component = new LoginWithRouter(
      { login: () => of({ id: 'user-1', username: 'watchwise', email: 'user@example.com' }) },
      router,
      {},
      { setUser: vi.fn() },
    );
    const login = component as unknown as {
      form: {
        setValue(value: {
          identifier: string;
          password: string;
          rememberMe: boolean;
        }): void;
      };
      submit(): void;
    };

    login.form.setValue({
      identifier: 'user@example.com',
      password: 'valid-password',
      rememberMe: false,
    });
    login.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('defaults rememberMe to false and sends it with the identifier and password', () => {
    const authApi = {
      login: vi.fn().mockReturnValue(
        of({ id: 'user-1', username: 'watchwise', email: 'user@example.com' }),
      ),
    };
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    const LoginWithDependencies = LoginComponent as unknown as new (
      authApi: unknown,
      router: unknown,
      googleIdentity: unknown,
      session: unknown,
    ) => LoginComponent;
    const component = new LoginWithDependencies(authApi, router, {}, { setUser: vi.fn() });
    const login = component as unknown as {
      form: {
        contains(name: string): boolean;
        get(name: string): { value: boolean } | null;
        setValue(value: {
          identifier: string;
          password: string;
          rememberMe: boolean;
        }): void;
      };
      submit(): void;
    };

    expect(login.form.contains('rememberMe')).toBe(true);
    expect(login.form.get('rememberMe')?.value).toBe(true);
    login.form.setValue({
      identifier: 'lucas',
      password: 'valid-password',
      rememberMe: false,
    });
    login.submit();

    expect(authApi.login).toHaveBeenCalledWith({
      identifier: 'lucas',
      password: 'valid-password',
      rememberMe: false,
    });
  });

  it('uses the prototype copy for the 30-day checkbox without extra helper text', () => {
    const loginCopy = messageCatalog['pt-BR'].auth.login;

    expect(loginCopy.rememberLabel).toBe('Manter minha sessão por 30 dias');
    expect('rememberNote' in loginCopy).toBe(false);
  });
});
