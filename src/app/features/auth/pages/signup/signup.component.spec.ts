import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  function createSignup() {
    const authApi = { register: vi.fn(() => of(undefined)) };
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    const SignupWithDependencies = SignupComponent as unknown as new (
      authApi: unknown,
      router: unknown,
    ) => SignupComponent;
    const component = new SignupWithDependencies(authApi, router);
    return component as unknown as {
      authApi: typeof authApi;
      router: typeof router;
      form: {
        controls: {
          name: {
            setValue(value: string): void;
            markAsTouched(): void;
          };
          username: {
            setValue(value: string): void;
            markAsTouched(): void;
          };
          email: { setValue(value: string): void };
          password: {
            setValue(value: string): void;
            markAsTouched(): void;
          };
          terms: { setValue(value: boolean): void };
        };
        valid: boolean;
        setValue(value: {
          name: string;
          username: string;
          email: string;
          password: string;
          terms: boolean;
        }): void;
      };
      usernameError(): string | null;
      nameError(): string | null;
      passwordError(): string | null;
      serverError(): string | null;
      registrationEmail(): string | null;
      submit(): void;
    };
  }

  it('requires all profile fields, a valid password and terms acceptance', () => {
    const signup = createSignup();

    expect(signup.form.valid).toBe(false);

    signup.form.controls.name.setValue('Maria Silva');
    signup.form.controls.username.setValue('maria.silva');
    signup.form.controls.email.setValue('maria@example.com');
    signup.form.controls.password.setValue('Watchwise1');
    expect(signup.form.valid).toBe(false);

    signup.form.controls.terms.setValue(true);
    expect(signup.form.valid).toBe(true);
  });

  it('rejects a name containing only whitespace', () => {
    const signup = createSignup();
    signup.form.controls.name.setValue('   ');
    signup.form.controls.name.markAsTouched();

    expect(signup.form.valid).toBe(false);
    expect(signup.nameError()).toBe('Informe seu nome.');
  });

  it('explains invalid usernames and passwords in Portuguese', () => {
    const signup = createSignup();

    signup.form.controls.username.setValue('a?');
    signup.form.controls.password.setValue('short');
    signup.form.controls.username.markAsTouched();
    signup.form.controls.password.markAsTouched();

    expect(signup.usernameError()).toBe(
      'Use apenas letras, números, pontos e sublinhados no usuário.',
    );
    expect(signup.passwordError()).toBe('Use pelo menos 8 caracteres.');
  });

  it('enforces the API password complexity and UTF-8 byte limit', () => {
    const signup = createSignup();
    const password = signup.form.controls.password;

    password.setValue('weakpass');
    password.markAsTouched();
    expect(signup.passwordError()).toBe(
      'Inclua uma letra maiúscula, uma minúscula e um número.',
    );

    password.setValue(`Aa1${'😀'.repeat(18)}`);
    expect(signup.passwordError()).toBe(
      'A senha não pode ultrapassar 72 bytes.',
    );
  });

  it('sends the API payload and confirms that email verification was requested', () => {
    const signup = createSignup();
    signup.form.setValue({
      name: ' Maria Silva ',
      username: 'maria.silva',
      email: 'maria@example.com',
      password: 'SecurePass1',
      terms: true,
    });

    signup.submit();

    expect(signup.authApi.register).toHaveBeenCalledWith({
      username: 'maria.silva',
      name: 'Maria Silva',
      email: 'maria@example.com',
      password: 'SecurePass1',
    });
    expect(signup.registrationEmail()).toBe('maria@example.com');
    expect(signup.router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('maps duplicate account and rate-limit responses to Portuguese', () => {
    const signup = createSignup();
    signup.form.setValue({
      name: 'Maria Silva',
      username: 'maria.silva',
      email: 'maria@example.com',
      password: 'SecurePass1',
      terms: true,
    });
    signup.authApi.register.mockImplementationOnce(() =>
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );
    signup.submit();
    expect(signup.serverError()).toBe(
      'Este email ou nome de usuário já está em uso.',
    );

    signup.authApi.register.mockImplementationOnce(() =>
      throwError(() => new HttpErrorResponse({ status: 429 })),
    );
    signup.submit();
    expect(signup.serverError()).toBe(
      'Muitas tentativas de cadastro. Aguarde um pouco e tente novamente.',
    );
  });

  it('returns an already authenticated user to home', () => {
    const signup = createSignup();
    signup.form.setValue({
      name: 'Maria Silva',
      username: 'maria.silva',
      email: 'maria@example.com',
      password: 'SecurePass1',
      terms: true,
    });
    signup.authApi.register.mockImplementationOnce(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Already authenticated' },
          }),
      ),
    );

    signup.submit();

    expect(signup.router.navigateByUrl).toHaveBeenCalledWith('/home');
  });
});
