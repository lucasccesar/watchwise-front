# Watchwise Trending Dropdown Parity Implementation Plan

> **For agentic workers:** Execute inline with the executing-plans skill. Steps use checkbox syntax. Preserve the existing dirty checkout; do not stage or commit unrelated changes.

**Goal:** Match the responsive Trending filter sheet to the approved prototype states and retain its existing API-backed behavior.

**Architecture:** Keep the current page-owned dialog and signals. Adjust only measured visual and interaction gaps; do not add an unsupported backend sort/filter contract.

**Tech Stack:** Angular 22, TypeScript, signals, Vitest, embedded browser.

## Global Constraints

- Keep all visible labels in pt-BR.
- Preserve Today/This week and List/Grid functionality.
- Keep the current API request shape and content data.
- Verify the prototype and local UI in the embedded browser; never use Firefox.
- Preserve pre-existing modifications, make no commit, and keep the PC on.

---

### Task 1: Add interaction tests for the mobile filter sheet

**Files:**
- Modify: src/app/features/trending/pages/trending/trending.component.spec.ts
- Modify: src/app/features/trending/pages/trending/trending.component.ts

**Interfaces:**
- Consumes: existing period, view, filter-open and filter-subpage signals.
- Produces: tested view/period selection and dialog dismissal behavior.

- [x] Write failing cases for opening each subpage, selecting Grid/List, selecting Today/This week, returning to the summary, and closing with Escape.
- [x] Run npm test -- src/app/features/trending/pages/trending/trending.component.spec.ts and confirm the new cases fail for the expected interaction gap.
- [x] Make only the smallest handler changes required by the failing cases; preserve focus restoration and current API reload behavior.
- [x] Run the focused Trending spec and confirm all cases pass.

### Task 2: Match filter sheet layout to the prototype

**Files:**
- Modify: src/app/features/trending/pages/trending/trending.component.html
- Modify: src/app/features/trending/pages/trending/trending.component.css
- Modify: src/app/shared/i18n/messages.ts

**Interfaces:**
- Consumes: the current dialog and pt-BR message catalog.
- Produces: visually aligned sheet, summary rows, selection subpages, and Done/back controls.

- [x] Capture prototype and local screenshots for the mobile summary, View subpage, and Period subpage at 390×844.
- [x] Compare title/handle, panel height, row padding, radio selection, Done placement, backdrop, and close/back alignment.
- [x] Adjust scoped CSS and labels only for the observed differences; do not alter desktop layout without matching evidence.
- [x] Reopen every state in the embedded browser, test outside click, Escape, Done/back, and focus return, then reset viewport overrides.
- [x] Run the focused Trending spec and development build.

