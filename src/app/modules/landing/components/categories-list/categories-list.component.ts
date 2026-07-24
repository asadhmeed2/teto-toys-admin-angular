import { Component, inject, signal, OnInit } from '@angular/core';
import { PermissionsService } from '@shared/services/permissions.service';
import { ConfirmationModalComponent } from '@shared/components/confirmation-modal';
import {
  AdminCategoriesApiService,
  AdminCategory,
} from './services/admin-categories-api.service';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [ConfirmationModalComponent],
  templateUrl: './categories-list.component.html',
})
export class CategoriesListComponent implements OnInit {
  protected readonly permissionsService = inject(PermissionsService);
  private readonly categoriesApi = inject(AdminCategoriesApiService);

  protected readonly categories = signal<AdminCategory[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Delete confirmation state
  protected readonly isDeleteModalOpen = signal(false);
  protected readonly pendingDelete = signal<AdminCategory | null>(null);
  protected readonly deletingId = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
  }

  protected async loadCategories(): Promise<void> {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const res = await this.categoriesApi.getCategories();
      this.categories.set(res.items);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load categories.');
    } finally {
      this.isLoading.set(false);
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
      await this.categoriesApi.deleteCategory(cat.id);
      // Remove from local list immediately
      this.categories.update((list) => list.filter((c) => c.id !== cat.id));
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to delete category.');
    } finally {
      this.deletingId.set(null);
      this.pendingDelete.set(null);
    }
  }
}
