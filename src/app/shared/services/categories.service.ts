import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@shared/config/api.config';
import { parseHttpError } from '@shared/utils/error';

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  number_of_active_products: number;
}

/** Single-category response; `language` echoes which translation the name came from. */
export interface AdminCategoryDetail extends AdminCategory {
  language: string;
}

export interface AdminCategoriesResponse {
  items: AdminCategory[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Single owner of the admin categories list.
 *
 * Previously the landing page and the categories list each fetched
 * GET /api/admin/categories independently on init, firing two identical
 * requests on every visit. Both now read this one cached signal, and
 * concurrent load() callers share a single in-flight request.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/admin/categories`;

  private readonly _categories = signal<AdminCategory[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  private hasLoaded = false;
  private inFlight: Promise<AdminCategory[]> | null = null;

  readonly categories = this._categories.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /** id -> name, for table columns and dropdowns. */
  readonly categoryMap = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const cat of this._categories()) {
      map[cat.id] = cat.name;
    }
    return map;
  });

  /**
   * Fetches once, then serves from cache. Callers that land while a request is
   * already in flight await that same request instead of starting another —
   * this is what collapses the duplicate call.
   */
  async load(): Promise<AdminCategory[]> {
    if (this.hasLoaded) return this._categories();
    if (this.inFlight) return this.inFlight;
    return this.fetch();
  }

  /**
   * Refetches, ignoring the cache — for page mounts and after mutations.
   *
   * If a request is already in flight it joins that one rather than starting a
   * second: a fetch that began moments ago is already fresh. This is what lets
   * the landing page reload() on every visit while its categories-list child
   * load()s, and still produce exactly one request whichever mounts first.
   */
  async reload(): Promise<AdminCategory[]> {
    if (this.inFlight) return this.inFlight;
    this.hasLoaded = false;
    return this.fetch();
  }

  private fetch(): Promise<AdminCategory[]> {
    this._isLoading.set(true);
    this._error.set(null);

    this.inFlight = (async () => {
      try {
        const params = new HttpParams().set('page', '1').set('pageSize', '100');
        const res = await firstValueFrom(
          this.http.get<AdminCategoriesResponse>(this.baseUrl, { params, withCredentials: true }),
        );
        const items = res.items ?? [];
        this._categories.set(items);
        this.hasLoaded = true;
        return items;
      } catch (err) {
        const parsed = parseHttpError(err, 'Failed to fetch categories');
        this._error.set(parsed.message);
        throw parsed;
      } finally {
        this._isLoading.set(false);
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  /**
   * Single category with its name resolved for `language` (falls back to 'en').
   * Used by the edit modal, including when the admin switches language mid-edit.
   */
  async getCategory(categoryId: number, language = 'en'): Promise<AdminCategoryDetail> {
    try {
      const params = new HttpParams().set('language', language);
      return await firstValueFrom(
        this.http.get<AdminCategoryDetail>(`${this.baseUrl}/${categoryId}`, {
          params,
          withCredentials: true,
        }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to load category');
    }
  }

  /** Edits the name for one language. The slug is not editable. */
  async updateCategory(
    categoryId: number,
    name: string,
    language = 'en',
  ): Promise<AdminCategoryDetail> {
    let updated: AdminCategoryDetail;
    try {
      updated = await firstValueFrom(
        this.http.put<AdminCategoryDetail>(
          `${this.baseUrl}/${categoryId}`,
          { name, language },
          { withCredentials: true },
        ),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to update category');
    }
    // Refresh so the list and every other consumer show the new name.
    await this.reload();
    return updated;
  }

  async deleteCategory(categoryId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}/${categoryId}`, { withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to delete category');
    }
    // Deleting reassigns products to General, so counts change — refetch.
    await this.reload();
  }

  /** Drops the cache so the next load() refetches (e.g. on logout). */
  clear(): void {
    this._categories.set([]);
    this._error.set(null);
    this.hasLoaded = false;
  }
}
