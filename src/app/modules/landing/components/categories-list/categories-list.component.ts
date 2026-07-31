import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { PermissionsService } from '@shared/services/permissions.service';
import { CategoriesService, AdminCategory } from '@shared/services/categories.service';
import { LanguageApiService, SystemLanguage } from '@shared/services/language-api.service';
import { languageScriptValidator } from '@shared/utils/language-script';
import { ConfirmationModalComponent } from '@shared/components/confirmation-modal';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [ConfirmationModalComponent, ReactiveFormsModule, UpperCasePipe],
  templateUrl: './categories-list.component.html',
})
export class CategoriesListComponent implements OnInit {
  protected readonly permissionsService = inject(PermissionsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly languageApi = inject(LanguageApiService);

  // Read straight off the shared store — the landing page reads the same signals,
  // so only one GET /api/admin/categories is issued between them.
  protected readonly categories = this.categoriesService.categories;
  protected readonly isLoading = this.categoriesService.isLoading;

  /** Fetch and delete failures surfaced in this card. */
  protected readonly errorMessage = signal<string | null>(null);

  // Delete confirmation state
  protected readonly isDeleteModalOpen = signal(false);
  protected readonly pendingDelete = signal<AdminCategory | null>(null);
  protected readonly deletingId = signal<number | null>(null);

  // ── Edit modal state ────────────────────────────────────────────────────────
  protected readonly isEditModalOpen = signal(false);
  protected readonly editingCategory = signal<AdminCategory | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly isLoadingTranslation = signal(false);
  protected readonly editErrorMessage = signal<string | null>(null);
  protected readonly editSuccessMessage = signal<string | null>(null);

  // Language selector — mirrors the product edit modal
  protected readonly languages = signal<SystemLanguage[]>([]);
  protected readonly editLang = signal<SystemLanguage | null>(null);
  protected readonly editLangMenuOpen = signal(false);

  protected readonly editForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    }),
  });

  constructor() {
    // Warns when the text doesn't match the selected language's script.
    this.editForm.controls.name.addValidators(
      languageScriptValidator(() => this.editLang()?.code ?? 'en'),
    );
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadCategories(), this.loadLanguages()]);
  }

  /** Cached: a no-op if the landing page already loaded it this visit. */
  protected async loadCategories(): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.categoriesService.load();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load categories.');
    }
  }

  /** The Refresh button should always hit the API, cache or not. */
  protected async refreshCategories(): Promise<void> {
    this.errorMessage.set(null);
    try {
      await this.categoriesService.reload();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load categories.');
    }
  }

  private async loadLanguages(): Promise<void> {
    try {
      const langs = await this.languageApi.getLanguages();
      this.languages.set(langs);
    } catch {
      // Non-fatal: without languages the modal just edits the default 'en'.
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#category-lang-wrapper')) {
      this.editLangMenuOpen.set(false);
    }
  }

  protected toggleEditLangMenu(): void {
    this.editLangMenuOpen.update((open) => !open);
  }

  // ── Edit flow ───────────────────────────────────────────────────────────────

  protected async openEditModal(category: AdminCategory): Promise<void> {
    this.editErrorMessage.set(null);
    this.editSuccessMessage.set(null);
    this.isSaving.set(false);
    this.editingCategory.set(category);

    // Start from 'en' (or whatever is available) on each fresh edit session.
    const langs = this.languages();
    this.editLang.set(langs.find((l) => l.code === 'en') ?? langs[0] ?? null);

    this.editForm.reset({ name: category.name });
    this.isEditModalOpen.set(true);

    await this.loadTranslation();
  }

  /** Reloads the name for the selected language, then re-runs the script check. */
  private async loadTranslation(): Promise<void> {
    const category = this.editingCategory();
    if (!category) return;

    this.isLoadingTranslation.set(true);
    try {
      const detail = await this.categoriesService.getCategory(
        category.id,
        this.editLang()?.code ?? 'en',
      );
      this.editForm.controls.name.setValue(detail.name ?? '');
    } catch {
      // No translation for this language yet — start blank so it can be filled in.
      this.editForm.controls.name.setValue('');
    } finally {
      this.isLoadingTranslation.set(false);
      this.editForm.controls.name.updateValueAndValidity();
    }
  }

  protected async selectEditLanguage(lang: SystemLanguage): Promise<void> {
    this.editLang.set(lang);
    this.editLangMenuOpen.set(false);
    this.editErrorMessage.set(null);
    this.editSuccessMessage.set(null);
    await this.loadTranslation();
  }

  protected closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingCategory.set(null);
    this.editLangMenuOpen.set(false);
  }

  protected async onSaveCategory(): Promise<void> {
    const category = this.editingCategory();
    if (!category) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.editErrorMessage.set(null);
    this.editSuccessMessage.set(null);

    try {
      // The service refetches the list, so the table reflects the new name.
      await this.categoriesService.updateCategory(
        category.id,
        this.editForm.controls.name.value.trim(),
        this.editLang()?.code ?? 'en',
      );
      this.editSuccessMessage.set('Category updated successfully!');
      setTimeout(() => this.closeEditModal(), 1000);
    } catch (err: any) {
      this.editErrorMessage.set(err.message || 'An error occurred while saving.');
    } finally {
      this.isSaving.set(false);
    }
  }

  // ── Delete flow ─────────────────────────────────────────────────────────────

  protected requestDelete(category: AdminCategory): void {
    this.pendingDelete.set(category);
    this.isDeleteModalOpen.set(true);
  }

  protected cancelDelete(): void {
    this.isDeleteModalOpen.set(false);
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const cat = this.pendingDelete();
    if (!cat) return;

    this.isDeleteModalOpen.set(false);
    this.deletingId.set(cat.id);
    try {
      // The service refetches internally, so every consumer of the store updates.
      await this.categoriesService.deleteCategory(cat.id);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to delete category.');
    } finally {
      this.deletingId.set(null);
      this.pendingDelete.set(null);
    }
  }
}
