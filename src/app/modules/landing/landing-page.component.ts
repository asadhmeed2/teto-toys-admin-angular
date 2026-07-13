import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../shared/services/auth.service';
import { PermissionsService } from '../../shared/services/permissions.service';
import { AdminAuthApiService } from '../auth/services/admin-auth-api.service';
import { CreateProductApiService, CreateProductResponse, PartDto } from '../../components/create-product';
import { Category } from '../../components/create-category/services/create-category-api.service';
import { Subcategory } from '../../components/create-subcategory/services/create-subcategory-api.service';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, ConfirmationModalComponent],
  providers: [CreateProductApiService],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  protected readonly isLoggingOut = signal(false);
  protected readonly isMenuOpen = signal(false);
  protected readonly permissionsService = inject(PermissionsService);

  // Products state signals
  protected readonly products = signal<CreateProductResponse[]>([]);
  protected readonly productsCount = signal(0);
  protected readonly productsPage = signal(1);
  protected readonly productsTotalPages = signal(1);
  protected readonly productsSearch = signal('');
  protected readonly isProductsLoading = signal(false);
  protected readonly deletingProductId = signal<string | null>(null);

  // Category & Subcategory lookup lists
  protected readonly categories = signal<Category[]>([]);
  protected readonly categoryMap = signal<Record<number, string>>({});
  protected readonly subcategories = signal<Subcategory[]>([]);

  // Parts list state signals
  protected readonly parts = signal<PartDto[]>([]);
  protected readonly partsPage = signal(1);
  protected readonly isPartsLoading = signal(false);
  protected readonly partsSearch = signal('');
  protected readonly hasMoreParts = signal(true);

  // Modal control signals
  protected readonly isEditModalOpen = signal(false);
  protected readonly editingProductId = signal<string | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly editErrorMessage = signal<string | null>(null);
  protected readonly editSuccessMessage = signal<string | null>(null);

  protected readonly isImageModalOpen = signal(false);
  protected readonly previewImageUrl = signal<string>('');

  // Delete confirmation modal signals
  protected readonly isDeleteModalOpen = signal(false);
  protected readonly pendingDeleteProduct = signal<{ id: string; title: string } | null>(null);

  // Form group definition
  protected readonly editForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    category: new FormControl<number | null>(null, { validators: [Validators.required] }),
    subcategory: new FormControl<number | null>(null),
    price: new FormControl<number | null>(null, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    imageUrls: new FormArray<FormControl<string>>([]),
    partIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  protected readonly selectedCategory = signal<number | null>(null);

  // ponytail: computed filtering subcategories by selected category ID
  protected readonly filteredSubcategories = computed(() => {
    const catId = this.selectedCategory();
    if (catId === null) return [];
    return this.subcategories().filter(sub => sub.category_id === +catId);
  });

  private readonly authService = inject(AuthService);
  private readonly authApiService = inject(AdminAuthApiService);
  private readonly productApiService = inject(CreateProductApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected toggleMenu(): void {
    this.isMenuOpen.update(open => !open);
  }

  async ngOnInit(): Promise<void> {
    try {
      if (!this.permissionsService.permissions()) {
        await this.permissionsService.fetchPermissions();
      }
    } catch {
      // best effort
    }

    // Load initial metadata and product lists
    await Promise.all([
      this.loadMetadata(),
      this.loadProducts()
    ]);

    // ponytail: reset subcategory when category changes and track selection
    this.editForm.controls.category.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        this.selectedCategory.set(val);
        this.editForm.controls.subcategory.setValue(null);
      });
  }

  // Load categories and subcategories
  private async loadMetadata(): Promise<void> {
    try {
      const [catsRes, subcatsRes] = await Promise.all([
        this.productApiService.getCategories(),
        this.productApiService.getSubcategories()
      ]);
      const catsList = catsRes.items || [];
      this.categories.set(catsList);
      this.subcategories.set(subcatsRes.items || []);

      const map: Record<number, string> = {};
      for (const cat of catsList) {
        map[cat.id] = cat.name;
      }
      this.categoryMap.set(map);
    } catch (err: any) {
      console.error('Failed to load categories/subcategories.', err);
    }
  }

  // Fetch paginated products list
  protected async loadProducts(): Promise<void> {
    if (this.isProductsLoading()) return;
    this.isProductsLoading.set(true);

    try {
      const res = await this.productApiService.getProducts(this.productsPage(), 10, this.productsSearch());
      this.products.set(res.items || []);
      this.productsCount.set(res.total_count || 0);
      this.productsTotalPages.set(res.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to load products list.', err);
    } finally {
      this.isProductsLoading.set(false);
    }
  }

  protected onProductsSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.productsSearch.set(value);
    this.productsPage.set(1);
    this.loadProducts();
  }

  protected changeProductsPage(delta: number): void {
    const next = this.productsPage() + delta;
    if (next >= 1 && next <= this.productsTotalPages()) {
      this.productsPage.set(next);
      this.loadProducts();
    }
  }

  protected deleteProduct(productId: string, title: string): void {
    this.pendingDeleteProduct.set({ id: productId, title });
    this.isDeleteModalOpen.set(true);
  }

  protected cancelDeleteProduct(): void {
    this.isDeleteModalOpen.set(false);
    this.pendingDeleteProduct.set(null);
  }

  protected async confirmDeleteProduct(): Promise<void> {
    const pending = this.pendingDeleteProduct();
    if (!pending) return;

    this.isDeleteModalOpen.set(false);
    this.deletingProductId.set(pending.id);
    try {
      await this.productApiService.deleteProduct(pending.id);
      await this.loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    } finally {
      this.deletingProductId.set(null);
      this.pendingDeleteProduct.set(null);
    }
  }

  // Image preview modal methods
  protected openImagePreview(url: string): void {
    this.previewImageUrl.set(url);
    this.isImageModalOpen.set(true);
  }

  protected closeImagePreview(): void {
    this.isImageModalOpen.set(false);
    this.previewImageUrl.set('');
  }

  // Form array helper
  get imageUrlsArray(): FormArray<FormControl<string>> {
    return this.editForm.get('imageUrls') as FormArray<FormControl<string>>;
  }

  protected addImageUrl(): void {
    this.imageUrlsArray.push(new FormControl('', { nonNullable: true }));
  }

  protected removeImageUrl(index: number): void {
    this.imageUrlsArray.removeAt(index);
    if (this.imageUrlsArray.length === 0) {
      this.addImageUrl();
    }
  }

  // Parts list paginated lazy loading
  protected async loadParts(reset = false): Promise<void> {
    if (this.isPartsLoading()) return;
    this.isPartsLoading.set(true);

    const currentPage = reset ? 1 : this.partsPage();
    try {
      const res = await this.productApiService.getParts(currentPage, 10, this.partsSearch());
      if (reset) {
        this.parts.set(res.items);
      } else {
        this.parts.update(existing => [...existing, ...res.items]);
      }
      this.hasMoreParts.set(currentPage < res.total_pages);
      this.partsPage.set(currentPage + 1);
    } catch (err: any) {
      console.error('Failed to load parts.', err);
    } finally {
      this.isPartsLoading.set(false);
    }
  }

  protected onPartsSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.partsSearch.set(value);
    this.loadParts(true);
  }

  protected loadMoreParts(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.loadParts();
  }

  protected togglePartSelection(partId: string): void {
    const control = this.editForm.controls.partIds;
    const current = control.value;
    if (current.includes(partId)) {
      control.setValue(current.filter(id => id !== partId));
    } else {
      control.setValue([...current, partId]);
    }
  }

  // Edit action
  protected async openEditModal(productId: string): Promise<void> {
    this.editErrorMessage.set(null);
    this.editSuccessMessage.set(null);
    this.isSaving.set(false);
    this.editingProductId.set(productId);

    try {
      // 1. Fetch product detail with connected parts
      const product = await this.productApiService.getProduct(productId);

      // 2. Setup forms values
      this.editForm.patchValue({
        title: product.title,
        subtitle: product.subtitle || '',
        description: product.description || '',
        category: product.category,
        subcategory: product.subcategory || null,
        price: product.price,
        partIds: product.part_ids || [],
      });

      this.selectedCategory.set(product.category);

      // Populate Image URLs
      this.imageUrlsArray.clear();
      if (product.image_urls && product.image_urls.length > 0) {
        for (const url of product.image_urls) {
          this.imageUrlsArray.push(new FormControl(url, { nonNullable: true }));
        }
      } else {
        this.addImageUrl();
      }

      // Load parts selector items
      await this.loadParts(true);

      // Open Modal
      this.isEditModalOpen.set(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load product details.');
    }
  }

  protected closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingProductId.set(null);
  }

  // Save changes
  protected async onSaveProduct(): Promise<void> {
    const productId = this.editingProductId();
    if (!productId || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.editErrorMessage.set(null);
    this.editSuccessMessage.set(null);

    const val = this.editForm.getRawValue();
    if (val.category === null) {
      this.editErrorMessage.set('Please select a category.');
      this.isSaving.set(false);
      return;
    }

    try {
      const filteredImages = val.imageUrls.filter(url => !!url.trim());

      await this.productApiService.updateProduct(productId, {
        title: val.title.trim(),
        subtitle: val.subtitle.trim() || undefined,
        description: val.description.trim() || undefined,
        category: val.category,
        subcategory: val.subcategory || undefined,
        price: val.price ?? 0,
        part_ids: val.partIds,
        image_urls: filteredImages
      });

      this.editSuccessMessage.set('Product updated successfully!');
      
      // Reload products list
      await this.loadProducts();

      // Close modal after delay
      setTimeout(() => {
        this.closeEditModal();
      }, 1000);
    } catch (err: any) {
      this.editErrorMessage.set(err.message || 'An error occurred while saving.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    await this.authApiService.logout();
    this.authService.clearToken();
    this.permissionsService.clearPermissions();
    this.router.navigate(['/login']);
  }

  protected navigateToCreateUser(): void {
    this.router.navigate(['/create-user']);
  }

  protected navigateToCreateProduct(): void {
    this.router.navigate(['/create-product']);
  }

  protected navigateToCreatePart(): void {
    this.router.navigate(['/create-part']);
  }

  protected navigateToCreateCategory(): void {
    this.router.navigate(['/create-category']);
  }

  protected navigateToCreateSubcategory(): void {
    this.router.navigate(['/create-subcategory']);
  }
}
