import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
  HostListener,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { CurrencyPipe, UpperCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PermissionsService } from '@shared/services/permissions.service';
import { LanguageApiService, SystemLanguage } from '@shared/services/language-api.service';
import { languageScriptValidator } from '@shared/utils/language-script';

import {
  Subcategory,
  Category,
  CreateProductApiService,
  CreateProductResponse,
  PartDto,
} from '@modules/products/forms/components';

import { ConfirmationModalComponent } from '@shared/components/confirmation-modal';
import { LayoutComponent } from '@shared/layout';
import { ProductsListTableComponent } from '@modules/products/components/products-list-table';
import { CategoriesListComponent } from './components/categories-list';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    UpperCasePipe,
    ConfirmationModalComponent,
    LayoutComponent,
    ProductsListTableComponent,
    CategoriesListComponent,
  ],
  providers: [CreateProductApiService],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  protected readonly permissionsService = inject(PermissionsService);

  // Products state signals
  protected readonly products = signal<CreateProductResponse[]>([]);
  protected readonly productsCount = signal(0);
  protected readonly productsPage = signal(1);
  protected readonly productsTotalPages = signal(1);
  protected readonly productsSearch = signal('');
  protected readonly isProductsLoading = signal(false);
  protected readonly deletingProductId = signal<string | null>(null);
  protected readonly togglingDisplayProductId = signal<string | null>(null);
  protected readonly restoringProductId = signal<string | null>(null);

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

  // ponytail: language selector state for the edit modal — controls which translation is loaded/saved
  protected readonly languages = signal<SystemLanguage[]>([]);
  protected readonly editLang = signal<SystemLanguage | null>(null);
  protected readonly editLangMenuOpen = signal(false);

  // Form group definition
  protected readonly editForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    category: new FormControl<number | null>(null, { validators: [Validators.required] }),
    subcategory: new FormControl<number | null>(null),
    price: new FormControl<number | null>(null, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    imageUrls: new FormArray<FormControl<string>>([]),
    partIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  protected readonly selectedCategory = signal<number | null>(null);

  // ponytail: computed filtering subcategories by selected category ID
  protected readonly filteredSubcategories = computed(() => {
    const catId = this.selectedCategory();
    if (catId === null) return [];
    return this.subcategories().filter((sub) => sub.category_id === +catId);
  });

  private readonly productApiService = inject(CreateProductApiService);
  private readonly languageApi = inject(LanguageApiService);

  private readonly destroyRef = inject(DestroyRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#edit-lang-wrapper')) {
      this.editLangMenuOpen.set(false);
    }
  }

  toggleEditLangMenu(): void {
    this.editLangMenuOpen.update((v) => !v);
  }

  // ponytail: select a language, reload the product's translation row, then re-validate script
  async selectEditLanguage(lang: SystemLanguage): Promise<void> {
    this.editLang.set(lang);
    this.editLangMenuOpen.set(false);

    const productId = this.editingProductId();
    if (!productId) return;

    try {
      const product = await this.productApiService.getProduct(productId, lang.code);
      this.editForm.patchValue({
        title: product.title,
        subtitle: product.subtitle || '',
        description: product.description || '',
      });
    } catch {
      // non-fatal — translation may not exist yet for this language; clear fields so user fills them in
      this.editForm.patchValue({ title: '', subtitle: '', description: '' });
    }

    // re-run script validators with the new language code
    this.revalidateEditTextFields();
  }

  /** Re-runs the script validators on all translatable edit-form controls. */
  private revalidateEditTextFields(): void {
    this.editForm.controls.title.updateValueAndValidity();
    this.editForm.controls.subtitle.updateValueAndValidity();
    this.editForm.controls.description.updateValueAndValidity();
  }

  async ngOnInit(): Promise<void> {
    try {
      if (!this.permissionsService.permissions()) {
        await this.permissionsService.fetchPermissions();
      }
    } catch {
      // best effort
    }

    // Load initial metadata, product lists, and system languages in parallel
    await Promise.all([this.loadMetadata(), this.loadProducts(), this.loadLanguages()]);

    // ponytail: attach language-script validators to translatable edit-form fields
    const getEditLang = () => this.editLang()?.code ?? 'en';
    this.editForm.controls.title.addValidators(languageScriptValidator(getEditLang));
    this.editForm.controls.subtitle.addValidators(languageScriptValidator(getEditLang));
    this.editForm.controls.description.addValidators(languageScriptValidator(getEditLang));

    // ponytail: reset subcategory when category changes and track selection
    this.editForm.controls.category.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        this.selectedCategory.set(val);
        this.editForm.controls.subcategory.setValue(null);
      });
  }

  // ponytail: fetch system languages once; default to 'en' for the edit modal
  private async loadLanguages(): Promise<void> {
    try {
      const langs = await this.languageApi.getLanguages();
      this.languages.set(langs);
      const defaultLang = langs.find((l) => l.code === 'en') ?? langs[0] ?? null;
      this.editLang.set(defaultLang);
    } catch {
      // non-fatal
    }
  }

  // Load categories and subcategories
  private async loadMetadata(): Promise<void> {
    try {
      const [catsRes, subcatsRes] = await Promise.all([
        this.productApiService.getCategories(),
        this.productApiService.getSubcategories(),
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
      const res = await this.productApiService.getProducts(
        this.productsPage(),
        10,
        this.productsSearch(),
      );
      this.products.set(res.items || []);
      this.productsCount.set(res.total_count || 0);
      this.productsTotalPages.set(res.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to load products list.', err);
    } finally {
      this.isProductsLoading.set(false);
    }
  }

  protected onSearchChange(value: string): void {
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

  protected async restoreProduct(productId: string): Promise<void> {
    if (this.restoringProductId()) return;
    this.restoringProductId.set(productId);
    try {
      await this.productApiService.restoreProduct(productId);
      // Optimistic update so the row switches back immediately
      this.products.update((list) =>
        list.map((p) => (p.product_id === productId ? { ...p, is_deleted: false } : p)),
      );
      // Reload from server to confirm the DB change persisted
      await this.loadProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to restore product.');
    } finally {
      this.restoringProductId.set(null);
    }
  }

  protected async toggleProductDisplay(
    productId: string,
    currentIsDisplayed: boolean,
  ): Promise<void> {
    if (this.togglingDisplayProductId()) return;
    this.togglingDisplayProductId.set(productId);
    try {
      await this.productApiService.setProductDisplay(productId, !currentIsDisplayed);
      // Update local list optimistically
      this.products.update((list) =>
        list.map((p) =>
          p.product_id === productId ? { ...p, is_displayed: !currentIsDisplayed } : p,
        ),
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update product visibility.');
    } finally {
      this.togglingDisplayProductId.set(null);
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
        this.parts.update((existing) => [...existing, ...res.items]);
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
      control.setValue(current.filter((id) => id !== partId));
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

    // ponytail: reset language to 'en' (or first available) when opening a fresh edit session
    const langs = this.languages();
    const defaultLang = langs.find((l) => l.code === 'en') ?? langs[0] ?? null;
    this.editLang.set(defaultLang);

    try {
      // 1. Fetch product detail with connected parts in the selected language
      const product = await this.productApiService.getProduct(
        productId,
        this.editLang()?.code ?? 'en',
      );

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
      const filteredImages = val.imageUrls.filter((url) => !!url.trim());

      // ponytail: language determines which product_translations row is upserted on the backend
      await this.productApiService.updateProduct(productId, {
        title: val.title.trim(),
        subtitle: val.subtitle.trim() || undefined,
        description: val.description.trim() || undefined,
        category: val.category,
        subcategory: val.subcategory || undefined,
        price: val.price ?? 0,
        part_ids: val.partIds,
        image_urls: filteredImages,
        language: this.editLang()?.code ?? 'en',
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
}
