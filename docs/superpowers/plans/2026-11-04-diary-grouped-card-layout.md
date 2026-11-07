# Diary grouped card layout Implementation Plan

> **For agentic workers:** Execute inline task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Adjust grouped diary cards to match the approved visual experiment without changing regular diary entries.

**Architecture:** Keep grouped-entry data and API behavior unchanged. Update the grouped card template so its backdrop/scrim cover the whole article and its engagement row spans the article width; style the poster and metadata footer within the existing grid.

**Tech Stack:** Angular standalone component template and component-scoped CSS.

## Global Constraints

- Only grouped cards in `/diary` change.
- Keep the existing blur, framing, dark gradient, and data fields.
- Do not add or run tests unless requested; verify the diff and whitespace with `git diff --check`.
- Preserve all existing unrelated work in the dirty worktree.

---

### Task 1: Restructure the grouped diary card

**Files:**
- Modify: `src/app/features/diary/pages/diary/diary.component.html`
- Modify: `src/app/features/diary/pages/diary/diary.component.css`
- Modify: `src/app/features/diary/pages/diary/diary.component.ts`

**Interfaces:**
- Consumes: existing `groupedBackdrop(entry)`, `groupedPoster(entry)`, `groupedMetadataParts(entry)`, `groupedTitle(entry)`, and `entry.totalRuntimeMinutes`.
- Produces: the same grouped entry data, presented with a full-card backdrop, full-width engagement footer, and title/runtime row.

- [ ] Move the grouped backdrop and scrim into the article-level stacking context so both columns sit above the background layers.
- [ ] Keep poster/media and grouped summary as the two top-row columns; move engagement below them and span both columns.
- [ ] Make the poster narrower than its media column, horizontally centered, and rounded on all corners.
- [ ] Expose the aggregate runtime separately from `groupedMetadataParts`; put the grouped title under the article at the left and runtime at the right.
- [ ] Run `git diff --check` and review the scoped diff for accidental changes outside the grouped card.
