import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutComponent } from '@shared/layout';
import { debouncedSearch } from '@shared/utils/debounced-search';
import { CustomerListItem, UsersApiService } from '@modules/users/services/users-api.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [LayoutComponent, RouterLink, DatePipe],
  templateUrl: './customers-list.component.html',
})
export class CustomersListComponent implements OnInit {
  private readonly api = inject(UsersApiService);

  protected readonly customers = signal<CustomerListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly search = signal('');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Comes from the server, not from local permissions: the API decides which
   * projection it sent, so the table can only render columns it actually received.
   */
  protected readonly viewerRole = signal<'Admin' | 'Partner'>('Partner');
  protected readonly showFullColumns = computed(() => this.viewerRole() === 'Admin');

  /** Partners can only search names, matching what the API will filter on. */
  protected readonly searchPlaceholder = computed(() =>
    this.showFullColumns() ? 'Search name or email...' : 'Search name...',
  );

  /** Keeps the empty-state colspan in step with the visible column count. */
  protected readonly columnCount = computed(() => (this.showFullColumns() ? 6 : 2));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const res = await this.api.getCustomers(this.page(), PAGE_SIZE, this.search());
      this.customers.set(res.items ?? []);
      this.totalCount.set(res.total_count ?? 0);
      this.totalPages.set(res.total_pages || 1);
      this.viewerRole.set(res.viewer_role ?? 'Partner');
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load users.');
      this.customers.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected readonly onSearchInput = debouncedSearch((value) => {
    this.search.set(value);
    this.page.set(1);
    this.load();
  });

  protected changePage(delta: number): void {
    const next = this.page() + delta;
    if (next >= 1 && next <= this.totalPages()) {
      this.page.set(next);
      this.load();
    }
  }
}
