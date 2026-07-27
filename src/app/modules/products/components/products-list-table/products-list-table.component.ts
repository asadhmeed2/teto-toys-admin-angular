import { Component, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CreateProductResponse } from '@modules/products/forms/components';

// Wait this long after the last keystroke before hitting the API
const SEARCH_DEBOUNCE_MS = 350;

@Component({
  selector: 'app-products-list-table',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './products-list-table.component.html',
})
export class ProductsListTableComponent {
  // ── Inputs ──────────────────────────────────────────────────────────────────
  readonly products = input<CreateProductResponse[]>([]);
  readonly categoryMap = input<Record<number, string>>({});
  readonly productsPage = input(1);
  readonly productsTotalPages = input(1);
  readonly isLoading = input(false);
  readonly deletingProductId = input<string | null>(null);
  readonly togglingDisplayProductId = input<string | null>(null);
  readonly restoringProductId = input<string | null>(null);
  readonly excludeDeleted = input(false);

  // ── Outputs ─────────────────────────────────────────────────────────────────
  readonly searchChange = output<string>();
  readonly excludeDeletedChange = output<boolean>();
  readonly pageChange = output<number>(); // +1 or -1 delta
  readonly editProduct = output<string>(); // productId
  readonly previewImage = output<string>(); // image url
  readonly displayToggle = output<{ productId: string; currentIsDisplayed: boolean }>();
  readonly productDelete = output<{ id: string; title: string }>();
  readonly productRestore = output<string>(); // productId

  private readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        // Skip redundant reloads when the text ends up unchanged (e.g. type then undo)
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.searchChange.emit(value));
  }

  onSearchInput(event: Event): void {
    this.searchInput$.next((event.target as HTMLInputElement).value);
  }

  onExcludeDeletedChange(event: Event): void {
    this.excludeDeletedChange.emit((event.target as HTMLInputElement).checked);
  }
}
