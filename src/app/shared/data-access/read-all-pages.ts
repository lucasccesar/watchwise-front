import { defer, EMPTY, expand, Observable, reduce } from 'rxjs';

/** Sequential reads retain cancellation and emit only after the complete dataset is available. */
export function readAllPages<T>(read: (page: number) => Observable<{ page: number; hasNext: boolean; content: T[] }>): Observable<T[]> {
  return defer(() => read(1)).pipe(
    expand(page => page.hasNext ? read(page.page + 1) : EMPTY, 1),
    reduce((entries: T[], page) => [...entries, ...page.content], []),
  );
}
