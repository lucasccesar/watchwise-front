export type ContentWatchStatus = string | null | undefined;

export function isContentFullyWatched(status: ContentWatchStatus): boolean {
  return status === 'WATCHED';
}

export function canAddContentToWatchlist(status: ContentWatchStatus): boolean {
  return status === 'UNWATCHED';
}

export function shouldShowContentWatchlistAction(
  status: ContentWatchStatus,
  inWatchlist: boolean,
): boolean {
  return inWatchlist || canAddContentToWatchlist(status);
}
