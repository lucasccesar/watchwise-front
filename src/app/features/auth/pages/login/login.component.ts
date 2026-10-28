import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../data-access/auth-api.service';
import { messageCatalog } from '../../../../shared/i18n/messages';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  standalone: true,
  styleUrl: './login.component.css',
  templateUrl: './login.component.html',
})
export class LoginComponent {
  protected readonly copy = messageCatalog['pt-BR'].auth.login;
  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly hasSubmitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly loginSucceeded = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor(private readonly authApi: AuthApiService) {}

  protected emailError(): string | null {
    const control = this.form.controls.email;
    if (!control.touched && !this.hasSubmitted()) {
      return null;
    }
    if (control.hasError('required')) {
      return this.copy.emailRequired;
    }
    if (control.hasError('email')) {
      return this.copy.emailInvalid;
    }
    return null;
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;
    if ((control.touched || this.hasSubmitted()) && control.hasError('required')) {
      return this.copy.passwordRequired;
    }
    return null;
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected clearStatus(): void {
    this.serverError.set(null);
    this.loginSucceeded.set(false);
  }

  protected submit(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.hasSubmitted.set(true);
    this.clearStatus();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.authApi
      .login({ identifier: email.trim(), password })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.loginSucceeded.set(true),
        error: (error: unknown) => this.serverError.set(this.messageFor(error)),
      });
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return this.copy.invalidCredentials;
      }
      if (error.status === 0) {
        return this.copy.connectionError;
      }
    }
    return this.copy.genericError;
  }
}
