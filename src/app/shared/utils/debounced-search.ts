import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

/** Shared delay for every search box in the app. */
export const SEARCH_DEBOUNCE_MS = 350;

/**
 * Wires an <input> up to a debounced handler.
 *
 *   protected readonly onSearchInput = debouncedSearch((value) => {
 *     this.search.set(value);
 *     this.load();
 *   });
 *
 *   <input (input)="onSearchInput($event)" />
 *
 * Call this from a field initializer or constructor — it needs an injection
 * context to grab DestroyRef, which cancels any pending emission when the
 * component goes away. Pass `destroyRef` explicitly to call it elsewhere.
 *
 * Repeated identical values are dropped (type then undo = no reload).
 */
export function debouncedSearch(
  handler: (value: string) => void,
  options: { delayMs?: number; destroyRef?: DestroyRef } = {},
): (event: Event) => void {
  const { delayMs = SEARCH_DEBOUNCE_MS, destroyRef = inject(DestroyRef) } = options;

  const input$ = new Subject<string>();
  input$
    .pipe(debounceTime(delayMs), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
    .subscribe(handler);

  return (event: Event) => input$.next((event.target as HTMLInputElement).value);
}
