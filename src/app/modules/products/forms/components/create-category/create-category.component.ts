import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';
import { LanguageApiService, SystemLanguage } from '@shared/services/language-api.service';
import { CategoriesService } from '@shared/services/categories.service';
import { languageScriptValidator } from '@shared/utils/language-script';
import { CreateCategoryApiService } from './services/create-category-api.service';

@Component({
  selector: 'app-create-category',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-category.component.html',
  styleUrl: './create-category.component.scss',
})
export class CreateCategoryComponent implements OnInit {
  private readonly apiService = inject(CreateCategoryApiService);
  private readonly languageApi = inject(LanguageApiService);
  private readonly categoriesService = inject(CategoriesService);
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

  // Language selector — the name is stored per language, same as products.
  protected readonly languages = signal<SystemLanguage[]>([]);
  protected readonly selectedLanguage = signal<SystemLanguage | null>(null);

  constructor() {
    this.categoryForm.controls.name.addValidators(
      languageScriptValidator(() => this.selectedLanguage()?.code ?? 'en'),
    );
  }

  async ngOnInit(): Promise<void> {
    try {
      const langs = await this.languageApi.getLanguages();
      this.languages.set(langs);
      this.selectedLanguage.set(langs.find((l) => l.code === 'en') ?? langs[0] ?? null);
    } catch {
      // Non-fatal: falls back to 'en' on submit.
    }
  }

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
    const language = this.selectedLanguage()?.code ?? 'en';

    try {
      const result = await this.apiService.createCategory(name, language);
      this.successMessage.set(`Category "${result.name}" created successfully!`);
      this.categoryForm.reset();

      // Drop the cached list so the dashboard shows the new category on arrival.
      this.categoriesService.clear();

      // ponytail: Redirect to dashboard after a short delay so they see success state
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1500);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred while creating category.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
