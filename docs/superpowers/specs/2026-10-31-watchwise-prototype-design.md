# Watchwise prototype screen implementation design

## Goal

Complete the Watchwise frontend so every user-facing screen and responsive artboard present in both Claude prototypes is implemented in Portuguese and visually matches the references as closely as possible.

## Scope

Use both prototype artifacts as the source of truth:

- Main artifact: `https://claude.ai/artifact/6nHjfxTu7pWk94wDQbnP5L#play-0acd6bc3c688`
- Part 2: `https://claude.ai/artifact/61xvRWruACcQsLUBT5J264?org=d335dc06-f280-4898-bcee-b340d18e7f4b`

The first artifact links to the core authenticated areas and detail screens: Home, Social, Trending, Diary, Watchlist, Calendar, Lists, Picks Explore, Picks Template, Pick detail, Games, Notifications, Progress, Profile, Movie, Series, Episode, Diary Review, Terms, Privacy, Community Guidelines, and Help & Contact. The second artifact groups responsive artboards into Watchlist (4), Trending (4), Social (4), Notifications (4), Share (6), Settings (4), Visitor (60), Auth (8), Legal (8), Errors (4), Community Guidelines (4), and Help & Contact (4). The implementation inventory must record each distinct Visitor artboard and every interactive state before the corresponding phase is considered complete.

Existing routes include Home, Trending, Movie, Series, Login, Register, and placeholders for forgot password and legal/help pages. Those screens are included in the parity audit; existing behavior and user data must remain intact while correcting visual mismatches.

All interface text must be Brazilian Portuguese. Preserve the prototype's hierarchy, density, dimensions, and spacing while using the available API data. Differences in user-specific content are not visual defects. Do not invent backend writes for endpoints that are not available.

## Architecture

Implement screens as lazy-loaded standalone Angular route components grouped by feature. Before adding a screen, inspect and follow the patterns already used by Home, Trending, Movie, Series, the authenticated/public shells, API services, and message catalog. Reuse the existing routes, typed API contracts, signal-based UI state, and shared components where they fit; extract only visual/behavioral elements that are genuinely shared across references (navigation, headers, cards, filters, tabs, menus, modals, and empty/loading/error states). Keep page-specific responsive styles scoped to their feature. Validate existing design tokens against the prototype measurements before reusing them; update shared tokens only when the comparison shows a system-wide mismatch.

Every screen must use the exact Home footer: the existing `HomeFooterComponent`, its logo and links, TMDB credit, copyright, dimensions, spacing, colors, and responsive behavior. Replace duplicated or alternate footer markup (including Trending and the public shell) with that shared component. Do not change the Home footer's appearance to accommodate other pages; verify its rendered geometry against Home at each supported viewport.

Every content poster/photo that displays a community rating inside the image must match the Home rating overlay in position, icon, type, color, size, padding, background, and responsive behavior. On hover and keyboard focus, replace that rating with the same three-dot content menu trigger used by Home; reuse its dropdown actions and interaction behavior where applicable. This is the content-card menu behavior, separate from the control for marking content as watched.

Keep route-level page rendering separate from data access. Reuse the existing Home, Trending, Content, and Auth API services where their contracts fit. Add typed frontend data-access methods only for backend operations already supported by the project/API contract. Where a screen has no data endpoint, render its reference-matching screen state without pretending that a write succeeded. Keep modal and dropdown behavior local to the owning feature and preserve keyboard/focus behavior present in the current app.

## Delivery phases

### Phase 1: Authenticated navigation and primary screens

Implement or bring to parity: Social, Diary, Watchlist, Calendar, Lists, Picks Explore, Games, and Notifications, plus the shared desktop/mobile authenticated navigation. Include the filters, sorting, pagination, dropdowns, empty states, and responsive layouts shown by the prototype.

### Phase 2: Content and community detail screens

Implement or bring to parity: Progress, Profile, Episode, Diary Review, Picks Template, Pick detail, and Settings. Audit Movie and Series alongside these screens so shared content controls and cards remain consistent. Include all reference-driven modal, menu, tabs, hover, and pagination states for these flows.

### Phase 3: Visitor, authentication, and informational screens

Implement all 60 Visitor artboards, all Auth and Legal artboards, plus Errors, Community Guidelines, Help & Contact, and Share. Share remains an overlay/action where the prototype shows it as a modal rather than an invented standalone route. Ensure login, registration, and recovery screens use Portuguese and preserve their prototype layouts.

## Visual and responsive verification

Compare the full page and all reachable interaction states in the embedded browser against both prototypes at the available artboard resolutions: Desktop 1920×1080, Notebook 1440×900, Tablet 768×1024, and Mobile 390×844. For every screen, inspect content below the fold, empty/loading/error states, menus, dropdowns, dialogs, and hover/focus states that appear in the reference. Use screenshots and measured bounding boxes for dimensions, alignment, spacing, and responsive transitions; iterate until no unaddressed structural or stylistic difference remains. Do not use Firefox as the comparison surface.

Build the frontend after each delivery phase and verify every changed route opens in the local app. Automated tests are outside this design's verification scope unless explicitly requested; visual browser checks and compilation are required.

## Completion criteria

- Every unique user-facing prototype page and artboard variant has a route or a correctly modeled overlay/state.
- Interface copy is in Portuguese and maintains the reference's layout density.
- Every route uses the exact shared Home footer, including public and authenticated screens.
- Every community-rating overlay on a content image matches Home; hover/focus swaps it for the Home three-dot menu trigger.
- Existing routes remain functional and no user-specific data is changed to force a visual match.
- The four reference viewport sizes have been visually checked for each screen group.
- Prototype interactions in scope have matching local controls and states.
- No known visual discrepancy is left unreported; any API limitation is identified without replacing the design with an unrelated placeholder.
- The frontend builds successfully and every implemented route opens locally.

## Self-review

- Coverage: all first-artifact destinations and every second-artifact page group are listed; the 60 Visitor artboards are explicitly included for inventory and implementation.
- Consistency: Share is defined as an overlay when appropriate, matching the prototype; all other screens use feature routes and shared shells.
- Data: API-backed content remains user-specific and Portuguese copy does not alter layout semantics.
- Boundaries: work is split into three reviewable phases while maintaining one shared design and route inventory.
