import { Component, inject, signal, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateProductApiService, PartDto } from './services/create-product-api.service';

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
    category: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subcategory: new FormControl('', { nonNullable: true }),
    price: new FormControl<number | null>(null, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    imageUrls: new FormArray<FormControl<string>>([]),
    partIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  protected readonly parts = signal<PartDto[]>([]);
  protected readonly partsPage = signal(1);
  protected readonly isPartsLoading = signal(false);
  protected readonly partsSearch = signal('');
  protected readonly hasMoreParts = signal(true);

  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly apiService = inject(CreateProductApiService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.loadParts(true);
    // ponytail: add a default empty image URL input
    this.addImageUrl();
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

    try {
      const val = this.form.getRawValue();
      const filteredImages = val.imageUrls.filter(url => !!url.trim());

      await this.apiService.createProduct({
        title: val.title.trim(),
        subtitle: val.subtitle.trim() || undefined,
        description: val.description.trim() || undefined,
        category: val.category.trim(),
        subcategory: val.subcategory.trim() || undefined,
        price: val.price ?? 0,
        part_ids: val.partIds,
        image_urls: filteredImages
      });

      this.successMessage.set('Product created successfully.');
      this.form.reset();
      this.imageUrlsArray.clear();
      this.addImageUrl();
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
