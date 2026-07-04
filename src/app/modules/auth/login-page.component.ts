import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthApiService } from './services/admin-auth-api.service';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  protected readonly isLoading = signal(false);
  protected readonly isPasswordVisible = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly apiService = inject(AdminAuthApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected togglePassword(): void {
    this.isPasswordVisible.update((v) => !v);
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      const res = await this.apiService.login(email, password);
      this.authService.setToken(res.access_token);
      this.router.navigate(['']);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
