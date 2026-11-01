# Watchwise Diary Filters and Layout Implementation Plan

> **For agentic workers:** Execute inline with the executing-plans skill. Steps use checkbox syntax. Preserve the existing dirty checkout; do not stage or commit unrelated changes.

**Goal:** Correct Diary history filtering, sorting, grouping, and Home-aligned layout while preserving the existing GET-only API behavior.

**Architecture:** Extract only the diary's pure filtering/sorting logic into a local utility so the exact content-type, score-range, date, series, and sort rules can be tested without Angular injection. Keep the page component responsible for signals, API reads, and rendering.

**Tech Stack:** Angular 22, TypeScript, signals, Vitest, CSS Grid, embedded browser.

## Global Constraints

- Preserve the existing diary endpoint and record fields; no unsupported API writes.
- Keep copy in pt-BR and all menus keyboard-accessible.
- Type categories remain distinct: MOVIE, SERIES, SEASON, EPISODE.
- Minimum rating must not exceed maximum; values are integers from 1 to 10.
- Desktop shows six entries per row; narrower layouts adapt without horizontal overflow.
- Preserve all existing user changes, make no commit, and do not shut down the PC.

---

### Task 1: Test pure Diary filtering and sorting behavior

**Files:**
- Create: src/app/features/diary/pages/diary/diary-filtering.ts
- Create: src/app/features/diary/pages/diary/diary-filtering.spec.ts
- Modify: src/app/features/diary/pages/diary/diary.component.ts

**Interfaces:**
- Consumes: DiaryGridEntry-compatible records and explicit filter state.
- Produces: a stable filtered entry array and series options derived only from series-linked entries.

- [x] Write failing tests for each of the four exact content types, inclusive score bounds, null scores, date bounds, theater state, series-linked episodes/seasons, and all four sort orders.
- [x] Run nnpm test -- src/app/features/diary/pages/diary/diary-filtering.spec.ts and confirm the expected missing-function failures.
- [x] Implement pure helpers with explicit types and stable date tie-breaking; use seriesTmdbId for child records and never add movie IDs to series options.
- [x] Connect the existing component computed state to the tested helpers without changing the endpoint.
- [x] Run the focused Diary filtering spec and confirm it passes.

### Task 2: Implement filter and sort controls

**Files:**
- Modify: src/app/features/diary/pages/diary/diary.component.ts
- Modify: src/app/features/diary/pages/diary/diary.component.html
- Modify: src/app/features/diary/pages/diary/diary.component.css
- Modify: src/app/shared/i18n/messages.ts

**Interfaces:**
- Consumes: the pure filter utility from Task 1 and existing Diary GET response.
- Produces: accessible type/series/rating/date dropdowns, quick ranges, four sort choices, and a flat/grouped toggle.

- [x] Write failing component-state cases for rating bounds and reset, date quick ranges, sort updates, and flat/grouped display state.
- [x] Run the focused Diary spec and confirm failures correspond to the missing states.
- [x] Replace rated/unrated with a dual range slider; clamp each handle against the other and restore 1–10 on reset.
- [x] Add distinct type options, correct series options, inline From/To fields and four quick date ranges.
- [x] Add newest/oldest/highest/lowest sort choices and icons for all filters and sort controls.
- [x] Change the global diary button to toggle date-grouped versus one flat grid; retain per-day collapse independently.
- [x] Run the focused Diary specs and confirm every filter updates immediately without issuing writes.

### Task 3: Align Diary heading, stats, tabs, and card grid

**Files:**
- Modify: src/app/features/diary/pages/diary/diary.component.html
- Modify: src/app/features/diary/pages/diary/diary.component.css

**Interfaces:**
- Consumes: Home layout tokens and the Diary control state from Task 2.
- Produces: Home-aligned banner/stat geometry, borderless icon tabs, and responsive six-column desktop grid.

- [x] Capture Home and Diary at the same desktop width; measure hero heading, description, stats width, and stat-label wrapping.
- [x] Apply the Home heading/stat layout to Diary without changing account values or adding poster data.
- [x] Remove the outer tab border and add accessible clock/review icons.
- [x] Set six entry columns on desktop and narrower counts at tablet/mobile breakpoints; preserve card navigation and prevent overflow.
- [x] Capture grouped/flat states at 1920×1080, 1440×900, 768×1024, and 390×844.
- [x] Open type, series, rating, and date menus in the embedded browser; drag both rating handles, reset, use all date shortcuts, sort both directions, and toggle grouping.
- [x] Run focused Diary specs and the development build; record any remaining API/data limitation without fabricating data.


## Controller verification

The implementation and review are complete. The controller verified all four required browser sizes, filter/sort interactions, responsive columns, grouped/flat behavior, pointer widening at coincident rating endpoints, and restored the Diary route to default filters. 
npm test -- src/app/features/diary/pages/diary/diary-filtering.spec.ts src/app/features/diary/pages/diary/diary.component.spec.ts --reporter=dot passes 39/39; 
npm run build -- --configuration development succeeds. Scoped task review and its pointer-fix re-review are clean. The existing 1000-record API limit remains.

