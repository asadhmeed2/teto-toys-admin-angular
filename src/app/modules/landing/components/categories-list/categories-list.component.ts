import { Component, inject, signal, OnInit } from '@angular/core';
import { PermissionsService } from '@shared/services/permissions.service';
import { CategoriesService, AdminCategory } from '@shared/services/categories.service';
import { ConfirmationModalComponent } from '@shared/components/confirmation-modal';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [ConfirmationModalComponent],
  templateUrl: './categories-list.component.html',
})
export class CategoriesListComponent implements OnInit {
  protected readonly permissionsService = inject(PermissionsService);
  private readonly categoriesService = inject(CategoriesService);

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

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
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
