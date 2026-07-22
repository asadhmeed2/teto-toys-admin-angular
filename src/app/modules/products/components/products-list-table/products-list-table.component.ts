import { Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CreateProductResponse } from '@modules/products/forms/components';

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

  // ── Outputs ─────────────────────────────────────────────────────────────────
  readonly searchChange = output<string>();
  readonly pageChange = output<number>(); // +1 or -1 delta
  readonly editProduct = output<string>(); // productId
  readonly previewImage = output<string>(); // image url
  readonly displayToggle = output<{ productId: string; currentIsDisplayed: boolean }>();
  readonly productDelete = output<{ id: string; title: string }>();
  readonly productRestore = output<string>(); // productId

  onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }
}
