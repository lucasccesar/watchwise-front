import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { messageCatalog } from '../../../../shared/i18n/messages';
import { AuthApiService } from '../../data-access/auth-api.service';

function maxUtf8Bytes(maxBytes: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value) return null;

    const actualBytes = new TextEncoder().encode(value).length;
    return actualBytes > maxBytes
      ? { maxUtf8Bytes: { maxBytes, actualBytes } }
      : null;
  };
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-signup',
  standalone: true,
  styleUrl: './signup.component.css',
  templateUrl: './signup.component.html',
})
export class SignupComponent {
  protected readonly copy = messageCatalog['pt-BR'].auth.signup;
  protected readonly showPassword = signal(false);
  protected readonly hasSubmitted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly registrationEmail = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(40),
        Validators.pattern(/^.*\S.*$/),
      ],
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
        Validators.pattern(/^[a-zA-Z0-9_.]+$/),
      ],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.maxLength(60),
      ],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        maxUtf8Bytes(72),
      ],
    }),
    terms: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  constructor(
    private readonly authApi: AuthApiService,
    private readonly router: Router,
  ) {}

  protected nameError(): string | null {
    const control = this.form.controls.name;
    if (!this.shouldShowError(control)) return null;
    if (control.hasError('required') || control.hasError('pattern')) {
      return this.copy.nameRequired;
    }
    if (control.hasError('maxlength')) return this.copy.nameTooLong;
    return null;
  }

  protected usernameError(): string | null {
    const control = this.form.controls.username;
    if (!this.shouldShowError(control)) return null;
    if (control.hasError('required')) return this.copy.usernameRequired;
    if (control.hasError('pattern')) return this.copy.usernameInvalid;
    if (control.hasError('minlength')) return this.copy.usernameTooShort;
    if (control.hasError('maxlength')) return this.copy.usernameTooLong;
    return null;
  }

  protected emailError(): string | null {
    const control = this.form.controls.email;
    if (!this.shouldShowError(control)) return null;
    if (control.hasError('required')) return this.copy.emailRequired;
    if (control.hasError('email')) return this.copy.emailInvalid;
    if (control.hasError('maxlength')) return this.copy.emailTooLong;
    return null;
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;
    if (!this.shouldShowError(control)) return null;
    if (control.hasError('required')) return this.copy.passwordRequired;
    if (control.hasError('minlength')) return this.copy.passwordTooShort;
    if (control.hasError('maxUtf8Bytes')) return this.copy.passwordTooLong;
    if (control.hasError('pattern')) return this.copy.passwordWeak;
    return null;
  }

  protected termsError(): string | null {
    const control = this.form.controls.terms;
    return this.shouldShowError(control) && control.hasError('required')
      ? this.copy.termsRequired
      : null;
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected normalizeUsername(event: Event): void {
    const input = event.target as HTMLInputElement;
    const username = input.value.replace(/^@+/, '');
    if (username !== input.value) {
      input.value = username;
      this.form.controls.username.setValue(username);
    }
  }

  protected clearStatus(): void {
    this.serverError.set(null);
    this.registrationEmail.set(null);
  }

  protected submit(): void {
    if (this.isSubmitting()) return;

    this.hasSubmitted.set(true);
    this.clearStatus();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, username, email, password } = this.form.getRawValue();
    const account = {
      username: username.trim(),
      name: name.trim(),
      email: email.trim(),
      password,
    };

    this.isSubmitting.set(true);
    this.authApi
      .register(account)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.registrationEmail.set(account.email),
        error: (error: unknown) => {
          if (this.isAlreadyAuthenticated(error)) {
            void this.router.navigateByUrl('/home');
            return;
          }
          this.serverError.set(this.messageFor(error));
        },
      });
  }

  private isAlreadyAuthenticated(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      error.status === 409 &&
      this.apiMessage(error) === 'Already authenticated'
    );
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return this.copy.accountConflict;
      if (error.status === 400) return this.copy.invalidRegistration;
      if (error.status === 429) return this.copy.tooManyAttempts;
      if (error.status === 0) return this.copy.connectionError;
    }
    return this.copy.genericError;
  }

  private apiMessage(error: HttpErrorResponse): string | null {
    const body = error.error as { message?: unknown } | null;
    return typeof body?.message === 'string' ? body.message : null;
  }

  private shouldShowError(control: FormControl): boolean {
    return control.touched || this.hasSubmitted();
  }
}
