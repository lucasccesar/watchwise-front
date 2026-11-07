# Share Review Preview Implementation Plan

**Goal:** Open the review sharing modal directly over the diary entry, using the selected entry's data and the same layout and controls as Movie content sharing.

**Architecture:** Extract the Movie share modal into a standalone shared component that owns its preview, image uploads, crop controls, and download behavior. Movie content and diary review detail will provide a typed preview model and localized copy, so both paths use the same modal implementation.

**Tech Stack:** Angular standalone components, Signals, TypeScript, HTML canvas, CSS design tokens.

## Global Constraints

- Keep the existing backend contract and use data already loaded for each page.
- Add no dependencies.
- Preserve unrelated dirty working-tree changes and do not commit this small UI change.
- Verify with `npm run build` and `git diff --check`; do not run tests unless requested.

---

### Task 1: Extract the reusable review share dialog

**Files:**
- Create `src/app/shared/components/share-review-dialog/share-review-dialog.component.ts`
- Create `src/app/shared/components/share-review-dialog/share-review-dialog.component.html`
- Create `src/app/shared/components/share-review-dialog/share-review-dialog.component.css`

**Interface:**
- Input `model: ShareReviewDialogModel` with title, year, rating, review text, background image, poster, author username, author avatar, and download name.
- Input `copy: ShareReviewDialogCopy` for all visible labels and errors.
- Output `closed` when dismissed; the parent owns focus restoration and its open state.

- [x] Port the current Movie share preview, image upload, zoom/position controls, review visibility switch, canvas download, and error handling into the shared component.
- [x] Keep the 9:16 preview and responsive layout aligned with the current Movie modal.

### Task 2: Use the shared dialog from Movie and diary review detail

**Files:**
- Modify `src/app/features/content/pages/movie/movie.component.ts` and `.html` to pass the Movie page's title, year, rating, review, poster, backdrop, and current user to the shared dialog.
- Modify `src/app/features/diary/pages/review-detail/review-detail.component.ts` and `.html` to open the dialog in place with the selected diary entry, its review and rating, the entry poster/backdrop, and its author.
- Remove the diary share action's navigation to the content route; close should leave the current diary route intact.

- [x] Verify the Movie share button and download remain wired to the shared modal implementation.
- [x] Run `npm run build` and `git diff --check`.
