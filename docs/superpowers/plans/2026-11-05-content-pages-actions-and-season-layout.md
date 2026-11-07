# Content Pages Actions and Season Layout Implementation Plan

> **Execution:** Inline in this session, following the user's existing preference. Keep each change scoped to the named feature files and review the diff after each task.

**Goal:** Correct the requested season, series, and movie content-page details, actions, and modal behavior without changing unrelated page designs.

**Architecture:** Keep page-specific composition in the existing standalone `SeasonComponent`, `SeriesComponent`, and `MovieComponent`. Reuse the existing `app-content-poster-picker` and copy the Home rating modal's visual states into the series rating dialog. Refresh series data after bulk logging without clearing the currently rendered page.

**Tech Stack:** Angular standalone components, TypeScript, signals, RxJS, component CSS, shared styles in `public/styles/movie-content.css`.

## Global Constraints

- Keep API requests under the existing `/api/v1` contract; do not modify the backend or invent endpoints.
- Use API-returned `creators` and episode `overview` fields by adding them to the frontend response types.
- Preserve keyboard focus indication while removing the unwanted hover border/background from primary buttons.
- Keep special banner and page treatments unchanged.
- Do not add or run tests unless the user asks; use the existing build and `git diff --check` as final checks.
- Do not commit or push without a new explicit request; `docs/` is ignored and the plan remains local.

---

### Task 1: Season response types and overview metadata

**Files:**
- Modify: `src/app/features/content/data-access/content-api.service.ts`
- Modify: `src/app/features/content/pages/season/season.component.html`
- Modify: `src/app/features/content/pages/season/season.component.ts`
- Modify: `src/app/features/content/pages/season/season.component.css`

**Interfaces:**
- `SeasonContentPage.details` will expose `creators: Array<{ name: string; profilePath: string | null }> | null`.
- `SeasonEpisodeCard` will expose `overview: string | null`.

- [ ] Add the two response properties using the types already used by `SeriesPage` and `SeriesChildCard`.
- [ ] Replace the season metadata's displayed `crew` names with `creators`, in both desktop and expanded mobile metadata lists.
- [ ] Put the series name above the season title in the existing title block, styled to match the approved content-detail hierarchy.
- [ ] Show the current episode title and `S{season} · E{episode}` on one line; style the episode code white with weight 600 and keep the title link white without underline.
- [ ] Show runtime and release date on one line separated by a visible middle dot, while omitting the date only when absent.
- [ ] Render a non-empty episode overview below the statistics list.
- [ ] Keep the section episode count at 14 px, weight 400, gray.
- [ ] Move the current-season border to the poster only, remove extra poster padding, and use the poster's corner radius; color the current season title blue.
- [ ] Match each cast member episode-count text to the existing character text's size, color, and weight.
- [ ] Keep episode action menus above sibling card content using the component's existing stacking context and z-index conventions.

### Task 2: Series actions, rating modal, poster picker, and in-place refresh

**Files:**
- Modify: `src/app/features/content/pages/series/series.component.ts`
- Modify: `src/app/features/content/pages/series/series.component.html`
- Modify: `public/styles/movie-content.css`
- Inspect and modify only if required: `src/app/shared/components/content-poster-picker/content-poster-picker.component.ts`
- Inspect and modify only if required: `src/app/shared/components/content-poster-picker/content-poster-picker.component.css`

- [ ] Keep the “Marcar como assistido” label on one line at desktop and mobile widths without shrinking or covering the ellipsis control.
- [ ] Apply the full `--radius-md` rounding to all corners of the watched action row with an ellipsis menu.
- [ ] Ensure the main watched action occupies its whole intended hit area; the ellipsis summary remains independently clickable and opens its own menu.
- [ ] Remove the dropped-series command from the series page's mobile ellipsis menu.
- [ ] Center the completion check icon within its circular icon wrapper.
- [ ] Match the series rating dialog to the Home rating dialog: use the Home star SVG, keep all ten rating buttons in a single row when the dialog width permits, use gray score text by default, and white score text for each option up to the selected rating.
- [ ] Align rating-dialog actions at the left edge and label the primary action “Salvar”.
- [ ] Remove hover background/border from the applicable primary buttons while preserving `:focus-visible` styling.
- [ ] Verify the poster-picker trigger opens its existing floating poster dropdown from the series menu, with the options panel above menus and content; correct positioning or stacking only where the current implementation prevents it.
- [ ] Replace the bulk action's full `reload()` path with a refresh that fetches the updated series page/progress while retaining the current `page()` and ready state. Do not clear reviews/comments or show the full-page skeleton during the successful refresh.

### Task 3: Movie empty state and content metadata spacing

**Files:**
- Modify: `src/app/features/content/pages/movie/movie.component.html`
- Modify: `public/styles/movie-content.css`

- [ ] Render the same `series-following-empty ww-empty-message` state and message in the empty `movie-following` section.
- [ ] Set the gap between desktop movie/series metadata rows to `6px` on the requested content overview metadata only; retain breakpoint-specific layout behavior.

### Task 4: Verification and review

**Files:**
- Review all files modified by Tasks 1–3.

- [ ] Run `git diff --check` and confirm no whitespace errors.
- [ ] Run `npm run build` and confirm the exit code is zero; record any existing budget warnings without broadening scope to fix them.
- [ ] Review the final diff against all acceptance criteria in `docs/superpowers/specs/2026-11-05-content-pages-actions-and-season-layout-design.md`.
- [ ] Confirm `git status --short --branch` and leave commits and push untouched unless the user asks.
