import { HttpErrorResponse } from '@angular/common/http';

export function parseHttpError(err: unknown, defaultMessage: string): Error {
  if (err instanceof HttpErrorResponse) {
    return new Error(err.error?.error_description || err.error?.error || err.message || defaultMessage);
  }
  return err instanceof Error ? err : new Error(String(err));
}
