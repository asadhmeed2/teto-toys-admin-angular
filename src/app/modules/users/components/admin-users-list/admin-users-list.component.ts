import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutComponent } from '@shared/layout';
import { debouncedSearch } from '@shared/utils/debounced-search';
import { AdminUserListItem, UsersApiService } from '@modules/users/services/users-api.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [LayoutComponent, RouterLink, DatePipe],
  templateUrl: './admin-users-list.component.html',
})
export class AdminUsersListComponent implements OnInit {
  private readonly api = inject(UsersApiService);

  protected readonly users = signal<AdminUserListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly search = signal('');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const res = await this.api.getAdminUsers(this.page(), PAGE_SIZE, this.search());
      this.users.set(res.items ?? []);
      this.totalCount.set(res.total_count ?? 0);
      this.totalPages.set(res.total_pages || 1);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load admin users.');
      this.users.set([]);
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
