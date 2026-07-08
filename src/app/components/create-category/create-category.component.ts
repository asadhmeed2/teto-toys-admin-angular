import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CreateCategoryApiService } from './services/create-category-api.service';

@Component({
  selector: 'app-create-category',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-category.component.html',
  styleUrl: './create-category.component.scss',
})
export class CreateCategoryComponent {
  private readonly apiService = inject(CreateCategoryApiService);
  private readonly router = inject(Router);

  protected readonly categoryForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
  });

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // ponytail: Category submission handler utilizing async/await and signals
  async onSubmit(): Promise<void> {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const name = this.categoryForm.controls.name.value;

    try {
      const result = await this.apiService.createCategory(name);
      this.successMessage.set(`Category "${result.name}" created successfully!`);
      this.categoryForm.reset();
      
      // ponytail: Redirect to dashboard after a short delay so they see success state
      setTimeout(() => {
        this.router.navigate(['/landing']);
      }, 1500);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred while creating category.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
