import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  function createSignup() {
    const component = new SignupComponent();
    return component as unknown as {
      form: {
        controls: {
          name: { setValue(value: string): void };
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
      };
      usernameError(): string | null;
      passwordError(): string | null;
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
});
