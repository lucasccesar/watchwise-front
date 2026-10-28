import { Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { messageCatalog } from '../../../../shared/i18n/messages';

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
  protected readonly submitMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40)],
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
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    terms: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  protected nameError(): string | null {
    const control = this.form.controls.name;
    if (!this.shouldShowError(control)) return null;
    if (control.hasError('required')) return this.copy.nameRequired;
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
    return null;
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;
    if (!this.shouldShowError(control)) return null;
    if (control.hasError('required')) return this.copy.passwordRequired;
    if (control.hasError('minlength')) return this.copy.passwordTooShort;
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
    this.submitMessage.set(null);
  }

  protected submit(): void {
    this.hasSubmitted.set(true);
    this.clearStatus();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitMessage.set(this.copy.registrationUnavailable);
  }

  private shouldShowError(control: FormControl): boolean {
    return control.touched || this.hasSubmitted();
  }
}
