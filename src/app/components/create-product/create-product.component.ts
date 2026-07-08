import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateProductApiService, PartDto } from './services/create-product-api.service';
import { Category } from '../create-category/services/create-category-api.service';
import { Subcategory } from '../create-subcategory/services/create-subcategory-api.service';

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [CreateProductApiService],
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.scss',
})
export class CreateProductComponent implements OnInit {
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    category: new FormControl<number | null>(null, { validators: [Validators.required] }),
    subcategory: new FormControl<number | null>(null),
    price: new FormControl<number | null>(null, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    imageUrls: new FormArray<FormControl<string>>([]),
    partIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  protected readonly parts = signal<PartDto[]>([]);
  protected readonly partsPage = signal(1);
  protected readonly isPartsLoading = signal(false);
  protected readonly partsSearch = signal('');
  protected readonly hasMoreParts = signal(true);

  protected readonly categories = signal<Category[]>([]);
  protected readonly subcategories = signal<Subcategory[]>([]);
  protected readonly selectedCategory = signal<number | null>(null);

  // ponytail: computed filtering subcategories by selected category ID
  protected readonly filteredSubcategories = computed(() => {
    const catId = this.selectedCategory();
    if (catId === null) return [];
    return this.subcategories().filter(sub => sub.category_id === catId);
  });

  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly apiService = inject(CreateProductApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.loadParts(true);
    this.loadMetadata();
    // ponytail: add a default empty image URL input
    this.addImageUrl();

    // ponytail: reset subcategory when category changes and track selection
    this.form.controls.category.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => {
        this.selectedCategory.set(val);
        this.form.controls.subcategory.setValue(null);
      });
  }

  get imageUrlsArray(): FormArray<FormControl<string>> {
    return this.form.get('imageUrls') as FormArray<FormControl<string>>;
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

  // ponytail: fetch categories and subcategories on initialization
  private async loadMetadata(): Promise<void> {
    try {
      const [catsRes, subcatsRes] = await Promise.all([
        this.apiService.getCategories(),
        this.apiService.getSubcategories()
      ]);
      this.categories.set(catsRes.items || []);
      this.subcategories.set(subcatsRes.items || []);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load categories/subcategories.');
    }
  }

  protected async loadParts(reset = false): Promise<void> {
    if (this.isPartsLoading()) return;
    this.isPartsLoading.set(true);

    const currentPage = reset ? 1 : this.partsPage();
    try {
      const res = await this.apiService.getParts(currentPage, 10, this.partsSearch());
      if (reset) {
        this.parts.set(res.items);
      } else {
        this.parts.update(existing => [...existing, ...res.items]);
      }
      this.hasMoreParts.set(currentPage < res.total_pages);
      this.partsPage.set(currentPage + 1);
    } catch (err: any) {
      console.error(err);
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
    const control = this.form.controls.partIds;
    const current = control.value;
    if (current.includes(partId)) {
      control.setValue(current.filter(id => id !== partId));
    } else {
      control.setValue([...current, partId]);
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const val = this.form.getRawValue();
    if (val.category === null) {
      this.errorMessage.set('Please select a category.');
      this.isLoading.set(false);
      return;
    }

    try {
      const filteredImages = val.imageUrls.filter(url => !!url.trim());

      await this.apiService.createProduct({
        title: val.title.trim(),
        subtitle: val.subtitle.trim() || undefined,
        description: val.description.trim() || undefined,
        category: val.category,
        subcategory: val.subcategory || undefined,
        price: val.price ?? 0,
        part_ids: val.partIds,
        image_urls: filteredImages
      });

      this.successMessage.set('Product created successfully.');
      this.form.reset();
      this.imageUrlsArray.clear();
      this.addImageUrl();
      this.selectedCategory.set(null);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred during product creation.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/']);
  }
}
