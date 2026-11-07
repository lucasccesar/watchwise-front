# Empty States and Dropdown Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center all page-level empty states in the remaining main content area and close every custom dropdown after a selection.

**Architecture:** Reuse the shared `.ww-empty-panel` design and the existing authenticated shell flex layout, adding a page-level empty-region modifier and the minimum parent sizing needed to fill available height. Close custom dropdowns in their existing feature handlers so each feature retains ownership of its selection, action, and error behavior.

**Tech Stack:** Angular standalone components, TypeScript, HTML templates, CSS Flexbox, existing design tokens.

## Global Constraints

- Keep inline empty messages in cards, profile subsections, comments, and search suggestions unchanged.
- Preserve all existing top controls and non-empty content layout.
- Use existing design tokens and avoid new dependencies, API changes, or synthetic global clicks.
- Native `<select>` controls keep their browser-managed closing behavior.
- The latest request closes the add-to-list dropdown after selecting a list, superseding its earlier stay-open behavior.
- Preserve existing uncommitted work; do not commit or push.
- Do not add or run tests unless the user asks; run the existing build and diff checks.

---

### Task 1: Fill the page-level empty-state region

**Files:**
- Modify: `src/styles.css`
- Modify: empty-state templates for Lists, Watchlist, Diary, Social, Notifications, Progress, List detail, List progress, Connections, and My Picks.
- Modify: `src/app/features/trending/pages/trending/trending.component.{css,html}`.
- Modify: `src/app/features/picks/pages/picks-explore/picks-explore.component.{css,html}`.
- Modify: `src/app/features/games/pages/game-ranking/game-ranking.component.{css,html}`.

**Interfaces:**
- Reuse `.ww-empty-panel` styles; add a page-level modifier or wrapper class to distinguish full-page states from inline messages.
- Keep the modifier scoped to branches that replace the main result content.

- [x] Inventory every full-page empty branch and separate it from empty messages inside cards, comments, menus, or search suggestions.
- [x] Make the authenticated shell's content chain fill the available viewport space between header and footer without changing top-control sizing.
- [x] Apply the shared page-empty modifier to every full-page empty branch and ensure its page-level parent can grow with Flexbox.
- [x] Keep empty panel styling and markup for titles, descriptions, icons, and actions intact.
- [x] Confirm non-empty branches remain on their existing markup paths and preserve their order.

### Task 2: Close custom dropdowns on selection

**Files:**
- Modify: `src/app/layout/authenticated-layout.component.html` and its component only if the account menu needs a correction.
- Modify: `lists.component.ts`, `watchlist.component.ts`, and `diary.component.ts` for missing filter closure.
- Modify: `content-image-actions.component.ts` and its Trending/Watchlist usage to remove the stay-open exception.
- Modify: `social-actions-menu.component.ts` so direct Follow selection closes its menu.
- Modify: Trending/Watchlist list-picker handlers to close after successful list selection.

**Interfaces:**
- Each option continues to call its existing selection/action handler.
- The handler closes its own dropdown state on successful selection or action dispatch; existing pending/disabled/error logic remains intact.

- [x] Inventory custom dropdowns and map each option click to its owning open-state signal or menu key.
- [x] Add the close transition to each single-choice option and action-menu entry without changing its selected value or business action.
- [x] Close nested add-to-list dropdowns after successful list selection.
- [x] Leave native select controls unchanged.
- [x] Retain outside-click, Escape, and keyboard behavior already present.

### Task 3: Verify the integration

**Files:**
- Review all modified page templates and styles from Tasks 1–2.

- [x] Inspect `git diff --check` and confirm there are no whitespace errors.
- [x] Run `npm run build` and inspect the full output for compilation errors.
- [x] Review representative empty and non-empty branches, including responsive CSS rules.
- [x] Preserve unrelated working-tree changes; no files were reverted or overwritten.
