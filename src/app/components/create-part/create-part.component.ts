import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CreatePartApiService } from './services/create-part-api.service';

@Component({
  selector: 'app-create-part',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [CreatePartApiService],
  templateUrl: './create-part.component.html',
  styleUrl: './create-part.component.scss',
})
export class CreatePartComponent {
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    price: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    imageUrls: new FormArray<FormControl<string>>([]),
  });

  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly apiService = inject(CreatePartApiService);
  private readonly router = inject(Router);

  get imageUrlsArray(): FormArray<FormControl<string>> {
    return this.form.controls.imageUrls;
  }

  protected addImageUrlInput(): void {
    // ponytail: push new image url control to FormArray
    this.imageUrlsArray.push(new FormControl('', { nonNullable: true }));
  }

  protected removeImageUrlInput(index: number): void {
    // ponytail: remove image url control from FormArray
    this.imageUrlsArray.removeAt(index);
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
      const urls = val.imageUrls.filter(url => !!url.trim());
      
      await this.apiService.createPart({
        title: val.title,
        description: val.description || undefined,
        price: val.price,
        image_urls: urls.length > 0 ? urls : undefined,
      });

      this.successMessage.set('Part created successfully.');
      this.form.reset({ title: '', description: '', price: 0 });
      this.imageUrlsArray.clear();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'An error occurred during part creation.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/']);
  }
}
