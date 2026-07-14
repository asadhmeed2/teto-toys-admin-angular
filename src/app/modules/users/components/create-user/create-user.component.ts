import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateUserApiService } from './services/create-user-api.service';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [CreateUserApiService],
  templateUrl: './create-user.component.html',
  styleUrl: './create-user.component.scss',
})
export class CreateUserComponent {
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    role: new FormControl('Partner', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly apiService = inject(CreateUserApiService);
  private readonly router = inject(Router);

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const val = this.form.getRawValue();
      await this.apiService.createUser({
        email: val.email,
        password: val.password,
        first_name: val.firstName,
        last_name: val.lastName,
        role: val.role,
      });

      this.successMessage.set('User created successfully.');
      this.form.reset({ role: 'Partner' });
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred during user creation.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/']);
  }
}
