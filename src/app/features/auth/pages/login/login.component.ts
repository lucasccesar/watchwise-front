import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApiService } from '../../data-access/auth-api.service';
import { AuthSessionService } from '../../../../core/session/session.service';
import { GoogleIdentityService } from '../../data-access/google-identity.service';
import { GOOGLE_OAUTH_CLIENT_ID } from '../../auth.config';
import { messageCatalog } from '../../../../shared/i18n/messages';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  standalone: true,
  styleUrl: './login.component.css',
  templateUrl: './login.component.html',
})
export class LoginComponent implements AfterViewInit {
  protected readonly copy = messageCatalog['pt-BR'].auth.login;
  protected readonly googleClientId = GOOGLE_OAUTH_CLIENT_ID;
  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly hasSubmitted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  @ViewChild('googleButtonHost')
  private googleButtonHost?: ElementRef<HTMLDivElement>;

  protected readonly form = new FormGroup({
    identifier: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    rememberMe: new FormControl(false, { nonNullable: true }),
  });

  constructor(
    private readonly authApi: AuthApiService,
    private readonly router: Router,
    private readonly googleIdentity: GoogleIdentityService,
    private readonly session: AuthSessionService,
  ) {}

  ngAfterViewInit(): void {
    const buttonHost = this.googleButtonHost?.nativeElement;
    if (!this.googleClientId || !buttonHost) {
      return;
    }

    void this.googleIdentity
      .renderButton(buttonHost, this.googleClientId, (idToken) =>
        this.authenticateWithGoogle(idToken),
      )
      .catch(() => this.serverError.set(this.copy.googleLoadError));
  }

  protected identifierError(): string | null {
    const control = this.form.controls.identifier;
    if (!control.touched && !this.hasSubmitted()) {
      return null;
    }
    if (control.hasError('required')) {
      return this.copy.identifierRequired;
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
    const { identifier, password, rememberMe } = this.form.getRawValue();

    this.authApi
      .login({ identifier: identifier.trim(), password, rememberMe })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (user) => {
          this.session.setUser(user);
          void this.router.navigateByUrl('/home');
        },
        error: (error: unknown) => {
          if (this.isAlreadyAuthenticated(error)) {
            void this.router.navigateByUrl('/home');
            return;
          }
          this.serverError.set(this.messageFor(error));
        },
      });
  }

  private authenticateWithGoogle(idToken: string): void {
    if (this.isSubmitting()) {
      return;
    }

    this.clearStatus();
    this.isSubmitting.set(true);
    this.authApi
      .loginWithGoogle(idToken)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (user) => {
          this.session.setUser(user);
          void this.router.navigateByUrl('/home');
        },
        error: (error: unknown) => {
          if (this.isAlreadyAuthenticated(error)) {
            void this.router.navigateByUrl('/home');
            return;
          }
          this.serverError.set(this.messageFor(error, 'google'));
        },
      });
  }

  private isAlreadyAuthenticated(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 409;
  }

  private messageFor(
    error: unknown,
    provider: 'password' | 'google' = 'password',
  ): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return provider === 'google'
          ? this.copy.googleAuthError
          : this.copy.invalidCredentials;
      }
      if (error.status === 404 && provider === 'google') {
        return this.copy.googleAccountNotFound;
      }
      if (error.status === 429) {
        return this.copy.tooManyAttempts;
      }
      if (error.status === 0) {
        return this.copy.connectionError;
      }
    }
    return this.copy.genericError;
  }
}
