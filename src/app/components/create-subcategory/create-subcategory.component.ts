import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CreateSubcategoryApiService } from './services/create-subcategory-api.service';
import { Category } from '../create-category/services/create-category-api.service';

@Component({
  selector: 'app-create-subcategory',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-subcategory.component.html',
  styleUrl: './create-subcategory.component.scss',
})
export class CreateSubcategoryComponent implements OnInit {
  private readonly apiService = inject(CreateSubcategoryApiService);
  private readonly router = inject(Router);

  protected readonly subcategoryForm = new FormGroup({
    categoryId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
  });

  protected readonly categories = signal<Category[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
  }

  // ponytail: Load list of parent categories for selector
  private async loadCategories(): Promise<void> {
    try {
      const response = await this.apiService.getCategories();
      this.categories.set(response.items || []);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load parent categories.');
    }
  }

  // ponytail: Subcategory submission handler utilizing async/await and signals
  async onSubmit(): Promise<void> {
    if (this.subcategoryForm.invalid) {
      this.subcategoryForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const categoryId = this.subcategoryForm.controls.categoryId.value;
    const name = this.subcategoryForm.controls.name.value;

    try {
      const result = await this.apiService.createSubcategory(categoryId, name);
      this.successMessage.set(`Subcategory "${result.name}" created successfully under category "${categoryId}"!`);
      this.subcategoryForm.reset();

      setTimeout(() => {
        this.router.navigate(['/landing']);
      }, 1500);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred while creating subcategory.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
