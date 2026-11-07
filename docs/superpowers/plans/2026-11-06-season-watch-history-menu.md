# Menu de histórico da temporada Implementation Plan

> **For agentic workers:** Implement the tasks in order in this session. Keep unrelated worktree changes unstaged.

**Goal:** Add the Series-style three-dot menu to a season after one or more episodes have been watched, with season-only history actions.

**Architecture:** Reuse the existing Series page menu trigger and the existing paginated Diary API. The season page will fetch episode entries for the current series, filter by season number, and delete matching diary entries individually after confirmation.

**Tech Stack:** Angular standalone components, TypeScript, RxJS, Angular HttpClient, existing Diary and Content API services.

## Global Constraints

- Use only API routes documented in `telas-reqs-definitivo.md`.
- Do not add tests or run test commands unless the user asks.
- Keep the `Histórico` menu item disabled like the Series page; the contract has no season-specific history destination.
- Delete only `EPISODE` diary entries matching both the current series TMDB ID and season number.
- Preserve unrelated working-tree edits; never stage entire dirty files for this feature.
- Do not commit documentation; `AGENTS.md` says documentation changes remain uncommitted by default.

---

### Task 1: Add filtered episode-history reading

**Files:**
- Modify: `src/app/features/diary/data-access/diary-api.service.ts`

**Interfaces:**
- Produces: `getEpisodeDiaryEntriesForSeries(userId: string, seriesTmdbId: string): Observable<DiaryRecord[]>`.
- Uses the existing `getDiaryPage` filter with `type: 'EPISODE'`, `seriesTmdbId`, `size: 1000`, and `sortBy: 'NEWEST'`; `readAllPages` retrieves every page sequentially.

- [ ] Add the method next to `getAllDiaryEntries`:

```ts
getEpisodeDiaryEntriesForSeries(userId: string, seriesTmdbId: string): Observable<DiaryRecord[]> {
  return readAllPages(page => this.getDiaryPage(userId, {
    page,
    size: 1000,
    type: 'EPISODE',
    seriesTmdbId,
    sortBy: 'NEWEST',
  }));
}
```

- [ ] Confirm the diary request continues using the existing `/users/{userId}/diary` route and supported `type` and `seriesTmdbId` query parameters.

### Task 2: Add the season menu and confirmed removal

**Files:**
- Modify: `src/app/features/content/pages/season/season.component.html`
- Modify: `src/app/features/content/pages/season/season.component.ts`
- Modify: `src/app/features/content/pages/season/season.component.css`
- Modify: `src/app/features/content/i18n/movie.messages.ts`

**Interfaces:**
- Consumes: `DiaryApiService.getEpisodeDiaryEntriesForSeries`, `ContentApiService.deleteDiaryEntry`, and the existing `watchedEpisodeCount()` computed value.
- Produces: A menu trigger visible when `watchedEpisodeCount() > 0`, and a confirmation flow that deletes matching episode entries and reports complete or partial failure.

- [ ] Add localized labels in both `pt-BR` and `en` for the remove-season menu item, confirmation title/body, success message, partial-failure message, and empty-history message. Reuse existing `watchHistory`, `cancel`, and confirmation-button labels where they fit.
- [ ] Inject `DiaryApiService`; add a `seasonHistoryConfirmOpen` signal and a separate `ViewChild` for the confirmation dialog.
- [ ] Add a `seasonHistoryMenu` template containing only:
  - A disabled `Histórico` button, using the same ellipsis menu classes and disabled state as the Series menu.
  - An enabled `Remover temporada do histórico` button that closes the menu and opens the confirmation dialog.
- [ ] Bind `series-action-primary-row--has-menu` and `series-action-watch-row--has-menu` when `watchedEpisodeCount() > 0`. Render the menu beside the partial mark-watched button and beside the completed season button, preserving the primary button's existing click handlers.
- [ ] In the confirmation handler, require the current session user ID, query all episode diary entries for `tmdbId()`, and filter by `content.seasonNumber === seasonNumber()`.
- [ ] Delete matching diary IDs sequentially with `concatMap`. Catch individual delete failures and continue so the UI can report partial deletion. If reading the diary fails, start no deletes.
- [ ] On completion, close the confirmation, reload the season page, and show either success, partial-failure, or no-records feedback. Leave diary entries from other seasons untouched.
- [ ] Adjust the season CSS override so the partial row reserves the same 44px menu slot as Series only when it has the menu; without a menu, keep the button full width.

### Task 3: Verify and commit the implementation hunks

**Files:**
- Verify: `src/app/features/diary/data-access/diary-api.service.ts`
- Verify: `src/app/features/content/pages/season/season.component.html`
- Verify: `src/app/features/content/pages/season/season.component.ts`
- Verify: `src/app/features/content/pages/season/season.component.css`
- Verify: `src/app/features/content/i18n/movie.messages.ts`

- [ ] Run `npm run build` and confirm it exits with code 0; report any existing CSS budget warnings separately.
- [ ] Run `git diff --check` and inspect the complete feature diff.
- [ ] Stage only this feature's hunks from the five listed files. Do not stage unrelated changes already present in any of those files.
- [ ] Commit the feature with `feat(content): add season watch history menu`.
- [ ] Confirm `git log -1 --format=%B` contains no coauthor or AI/tool attribution.
