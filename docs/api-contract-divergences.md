# API contract divergences

## Content reviews for completed series

The local `telas-reqs-definitivo.md` snapshot documents reading content reviews but does not describe creating, editing, or deleting a content review for a completed series. The separate local API implementation currently exposes:

- `POST /contents/{contentId}/reviews` with `{ comment, score?, expectedRatingVersion? }` and an optional `Idempotency-Key` header;
- `PATCH /reviews/{reviewId}` with `{ comment }`;
- `DELETE /reviews/{reviewId}`.

The frontend uses these routes for the completed-series rating dialog. Reconcile the requirements snapshot with the API owner before treating this as the published integration contract. The backend repository was not changed.

## Bulk logging can stop before the latest released episode

The earlier missing-air-date diagnosis was incorrect for the reported case: the user confirms every episode has a release date.

The API implementation has another likely truncation path in `DiaryEntryServiceImpl.resolveSeasonFinaleEpisodeNumber`: it returns an existing `isSeasonFinale` episode as soon as that episode has aired, without comparing it with later aired episodes returned by TMDB. If that stored marker points to episode 7 while episode 8 has aired, the bulk request contains only episodes 1–7. With one episode already watched on the current pass, this yields six new entries although the frontend reports seven remaining. This is a code-level hypothesis; confirming it for the user's series requires checking the affected series/season and persisted finale marker against the TMDB episode data.

The bulk request has no field for an explicit set of episode coordinates, so the frontend cannot safely repair a server-side truncated episode range. The correction belongs in the backend's finale resolution so it respects the latest episode aired by the selected cutoff.
