# Watchwise Home and Social Feed Follow-up Implementation Plan

> **For agentic workers:** Execute inline with the executing-plans skill. Steps use checkbox syntax. Preserve the existing dirty checkout; do not stage or commit unrelated changes.

**Goal:** Correct Home card actions and immediately render the locally computed hero date, then verify Home and Social feeds with real account data.

**Architecture:** Keep navigation and presentation in Home. Add only pure helpers where unit tests benefit, and retain the current API services for feed data. Feed checks are read-only; account access must use an existing explicit local test credential.

**Tech Stack:** Angular 22, TypeScript, signals, RxJS, Vitest, embedded browser.

## Global Constraints

- Keep all visible copy in pt-BR.
- Never show the Continue Watching mark-as-watched action.
- Preserve the poster menu and all other button behavior.
- Use canonical local routes for each content type.
- Never invent or guess André's password; do not write feed or follow data during verification.
- Preserve all pre-existing working-tree modifications; do not commit.
- Keep the frontend available on port 5173; do not shut down the PC.

---

### Task 1: Make Home content navigation and local date independently testable

**Files:**
- Create: src/app/features/home/pages/home/home-display.utils.ts
- Create: src/app/features/home/pages/home/home-display.utils.spec.ts
- Modify: src/app/features/home/pages/home/home.component.ts
- Modify: src/app/features/home/pages/home/home.component.html
- Modify: src/app/features/home/pages/home/home.component.css

**Interfaces:**
- Consumes: existing Home API models and the four content route patterns already used by the router.
- Produces: pure date-formatting and route helpers used by the Home template/component.

- [x] Write failing Vitest cases for deterministic pt-BR hero date formatting and routes for movie, series, and episode data.
- [x] Run npm test -- src/app/features/home/pages/home/home-display.utils.spec.ts and confirm the expected missing-export failure.
- [x] Implement the smallest pure helpers and bind them into Home; show the local date in both loading and ready states.
- [x] Remove the Continue assistindo mark button; make the poster/title link to the canonical detail route while keeping the content menu action isolated.
- [x] Run the focused Home helper spec and confirm it passes.
- [x] In the embedded browser, open an item from Continue assistindo and confirm the correct detail URL; confirm the mark button is absent.

### Task 2: Remove profile menu underlines and inspect Home feed

**Files:**
- Modify: src/app/layout/authenticated-layout.component.css
- Modify: docs/superpowers/plans/2026-11-01-watchwise-home-social-feed.md

**Interfaces:**
- Consumes: current account menu and existing feed response.
- Produces: clean account identity links and a read-only feed verification note.

- [x] Verify name and username link states at rest, hover, and keyboard focus in the embedded browser.
- [x] Add scoped text-decoration rules for the profile identity links and recheck focus visibility.
- [x] Inspect the Home activity-feed empty/data/error state without liking, following, or posting.
- [x] Record whether the current account has no feed items or a rendering failure; do not insert sample items.

### Task 3: Verify Social feed access for André

**Files:**
- Inspect: src/app/features/social/pages/social/social.component.ts
- Inspect: src/app/features/social/data-access/feed-api.service.ts
- Update: docs/superpowers/plans/2026-11-01-watchwise-home-social-feed.md

**Interfaces:**
- Consumes: the current session, Social feed GET operations, and any explicit local test account documented in the repositories.
- Produces: read-only verification evidence or a precise missing-credential limitation.

- [x] Search project-owned test/development documentation for an explicit André login credential; do not inspect or export password hashes.
- [x] If an explicit credential exists, sign in only to localhost and inspect the feed without issuing any write actions.
- [x] If no explicit credential exists, inspect the currently authorized Social feed read-only and record that André's login requires his credential; do not guess.
- [x] Confirm the existing session remains usable and no API write endpoint was called.

## Verification record

- Home data-loaded state renders the locally formatted `Domingo, 1 de novembro`; the template also evaluates the same local date in the initial loading branch. Mobile hero CSS intentionally hides the date at widths ≤800px; the desktop request/reference and startup behavior were verified.
- Continue assistindo has no “Marcar como assistido” control. The Camera Shy title link navigates to `/content/series/259909/season/1/episode/2`. The poster menu opens “Abrir conteúdo” without changing route.
- Profile identity link has `text-decoration: none` at rest and keyboard focus; focus remains visibly highlighted. Home and Social empty states are explicit: the current account has no followed users (0), and no activity/error message indicates a rendering failure.
- Repository documentation contains no explicit André login credential. No password was guessed; the authorized current session's Social feed was inspected read-only. The account-specific André check requires his credential. No follow, post, like, or other write was performed.
