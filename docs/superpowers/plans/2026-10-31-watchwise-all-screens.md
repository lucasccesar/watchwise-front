# Watchwise All Prototype Screens Implementation Plan

> **Execution status — 2026-11-01:** All 13 implementation tasks and the documented visual follow-through are complete. Responsive route checks, interaction checks, the 60-artboard Visitor canvas pass, desktop/keyboard/touch poster-menu checks, the final frontend build, and the API DTO compile are recorded in `2026-10-31-watchwise-artboard-inventory.md`. Data-dependent sample differences and read-only verification limits are listed there; no synthetic account data was added.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement every screen and artboard from both Watchwise prototypes in Portuguese, with exact shared Home footer and Home-style community-rating overlays, and verify the result at all four reference viewports.

**Architecture:** Keep Angular standalone, lazy-loaded feature routes and follow the implementation patterns in Home, Trending, Movie, and Series. Reuse the current shells, API services, message catalog, footer, and common content-image controls; add page-specific UI and typed data-access code only where the current API contract supports it.

**Tech Stack:** Angular 22 standalone components, Angular Router, TypeScript, RxJS, signals, global design tokens in `src/styles.css`, feature templates and CSS, embedded browser visual inspection.

## Global Constraints

- Include every distinct screen and responsive artboard in the two user-provided prototype artifacts, including all 60 Visitor artboards.
- Render all interface copy in Brazilian Portuguese while keeping the reference's density, hierarchy, and geometry.
- Reuse and inspect existing screens and patterns before creating new ones; preserve the behavior and user data of existing routes.
- Every screen uses the exact Home footer component, links, logo, TMDB attribution, copyright, and responsive presentation.
- Every content-poster community-rating overlay matches Home, and hover/focus swaps the rating for the Home three-dot menu. This is separate from the mark-as-watched control.
- Use live API operations only where the current API contract supports them. Never show success for a write that was not performed or mutate user data to force visual parity.
- Compare in the embedded browser only at Desktop 1920×1080, Notebook 1440×900, Tablet 768×1024, and Mobile 390×844. Inspect below the fold and every reachable menu, dropdown, modal, empty, loading, error, hover, and focus state from the prototype.
- Do not add or run automated tests unless the user requests them. Run a development build and perform manual route and visual checks.
- Preserve the repository's existing uncommitted work; stage only files created or edited for this implementation.

---

### Task 1: Inventory every prototype screen and existing implementation

**Files:**
- Create/update: `docs/superpowers/plans/2026-10-31-watchwise-all-screens.md`
- Create: `docs/superpowers/plans/2026-10-31-watchwise-artboard-inventory.md`
- Inspect: `src/app/app.routes.ts`
- Inspect: `src/app/layout/authenticated-layout.component.{ts,html,css}`
- Inspect: `src/app/layout/public-layout.component.{ts,html,css}`
- Inspect: `src/app/features/home/pages/home/home.component.{ts,html,css}`
- Inspect: `src/app/features/trending/pages/trending/trending.component.{ts,html,css}`
- Inspect: `src/app/features/content/pages/movie/movie.component.{ts,html,css}`
- Inspect: `src/app/features/content/pages/series/series.component.{ts,html}` and `public/styles/movie-content.css`
- Inspect: `src/app/shared/components/home-footer/` and `src/app/shared/i18n/messages.ts`

**Interfaces:**
- Consumes: Both prototype URLs, authenticated Claude session, existing local routes and components.
- Produces: A route/artboard matrix that maps each named screen, viewport, interaction state, existing implementation, and feature owner.

- [x] **Step 1: List screen families and artboard counts from both prototypes.** Record the first artifact's Home destinations and the second artifact's Watchlist, Trending, Social, Notifications, Share, Settings, Visitor, Auth, Legal, Errors, Community Guidelines, and Help & Contact groups. Record all 60 Visitor artboard titles by scrolling the embedded canvas until the complete set is captured. The exact route and artboard list is in `2026-10-31-watchwise-artboard-inventory.md`.
- [x] **Step 2: Record the responsive reference sizes and screen-specific states.** For every artboard family, list the available 1920×1080, 1440×900, 768×1024, and 390×844 variant and its menus, filters, modals, empty/loading/error states, hover/focus behavior, and full-page sections.
- [x] **Step 3: Map each prototype screen to the current route and implementation.** The current mapping is in `2026-10-31-watchwise-artboard-inventory.md`; static review now finds route components for the listed destinations. This does not certify visual parity.
- [x] **Step 4: Inspect reusable Home and layout patterns before coding.** Record the exact `HomeFooterComponent` placement/styles and the `.home-item-rating`, `.content-menu-trigger`, `.content-dropdown-menu` markup, actions, and CSS behavior.
- [x] **Step 5: Review the inventory for missing pages and states.** Confirm every artboard title and every first-artifact linked destination appears in the matrix before proceeding.

---

### Task 2: Unify the Home footer across authenticated and public shells

**Files:**
- Modify: `src/app/layout/authenticated-layout.component.{ts,html}`
- Modify: `src/app/layout/public-layout.component.{ts,html,css}`
- Modify: `src/app/features/home/pages/home/home.component.{ts,html}`
- Modify: `src/app/features/trending/pages/trending/trending.component.{ts,html,css}`
- Modify: `src/app/features/content/pages/movie/movie.component.{ts,html}`
- Modify: `src/app/features/content/pages/series/series.component.{ts,html}`
- Reuse: `src/app/shared/components/home-footer/home-footer.component.{ts,html,css}`

**Interfaces:**
- Consumes: Existing `HomeFooterComponent` and Home's global `.home-footer` styles.
- Produces: Exactly one Home footer rendered by each authenticated/public shell and no page-specific footer markup.

- [x] **Step 1: Mount the shared footer in the authenticated shell.** Import `HomeFooterComponent` into `AuthenticatedLayoutComponent` and add `<app-home-footer />` after the child `<router-outlet />` in the authenticated layout template.
- [x] **Step 2: Mount the same component in the public shell.** Import `HomeFooterComponent` into `PublicLayoutComponent`, add it after the public child outlet, and remove the alternate `.public-footer` markup and its CSS so public screens display the same footer as Home.
- [x] **Step 3: Remove page-owned copies.** Remove Home, Trending, Movie, and Series footer markup and their now-unused imports, data fields, and duplicate footer styles; keep the shared component unchanged unless the visual comparison proves it differs from Home.
- [x] **Step 4: Check for duplicate footers.** The public login route renders exactly one `.home-footer`. The authenticated shell owns one footer, and Home, Trending, Movie, and Series no longer render their own copies.
- [x] **Step 5: Compare footer geometry.** At 1920×1080 and 1440×900 the shared footer is visible and 131px tall; it is hidden at 768×1024 and 390×844 exactly as in Home. All routes now use the same component and Home CSS.

---

### Task 3: Share Home's content-image rating and three-dot interaction

**Files:**
- Create: `src/app/shared/components/content-image-actions/content-image-actions.component.{ts,html,css}`
- Modify: `src/app/features/home/pages/home/home.component.{ts,html,css}`
- Modify: feature templates/CSS that show community ratings within content posters or photos.
- Modify: `src/styles.css` only if a reusable style import is required.

**Interfaces:**
- Consumes: Home's community-rating badge, `.content-menu-trigger`, dropdown actions, and existing card-specific action handlers.
- Produces: A shared typed content-image control that displays community score by default and swaps it for the three-dot trigger on pointer hover or keyboard focus.

- [x] **Step 1: Define the shared component inputs and output.** Add a nullable numeric community rating, accessible content label, and a typed list of card actions; emit the selected action identifier to the owning feature without making network calls inside the visual component.
- [x] **Step 2: Reproduce the existing Home rating badge.** Use the current star SVG and CSS values for placement, dimensions, font, colors, border/background, padding, and responsive offsets.
- [x] **Step 3: Reproduce Home's menu trigger and dropdown.** Use the Home three-dot icon, hit target, focus style, z-index, dropdown spacing, border, shadow, and action row geometry; show the trigger on `:hover` and `:focus-within` and hide the rating during that state on pointer devices.
- [x] **Step 4: Migrate Home cards without changing behavior.** Home's episode and recent-content cards use the shared component and retain their feature handlers. Viewport comparison remains in Task 13.
- [x] **Step 5: Use the shared control on every poster/photo card in all screen groups.** Feed each card's own action list and rating value; do not connect this menu to mark-as-watched behavior.
- [x] **Step 6: Verify pointer, keyboard, and touch states.** Compare default rating, hover-trigger swap, focus-trigger swap, dropdown open, dismissal, and mobile presentation to the Home reference.

---

### Task 4: Add authenticated route families and Portuguese navigation copy

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/layout/authenticated-layout.component.{ts,html,css}`
- Modify: `src/app/shared/i18n/messages.ts`
- Modify: `src/app/features/search-content/components/header-search/` only for existing search-route links or copy that needs the new screens.

**Interfaces:**
- Consumes: `authenticatedGuard`, the authenticated shell, current `messageCatalog['pt-BR']`, and the inventory from Task 1.
- Produces: Lazy routes for all authenticated screen destinations and navigation labels/active states in Portuguese.

- [x] **Step 1: Extend the existing lazy-route pattern.** Add authenticated routes for `/social`, `/diary`, `/watchlist`, `/calendar`, `/lists`, `/picks`, `/games`, `/notifications`, `/progress`, `/settings`, and `/users/:username`; preserve `/home`, `/trending`, `/content/movie/:tmdbId`, and `/content/series/:tmdbId`.
- [x] **Step 2: Add detail route patterns from the prototype link map.** Add `/diary/entry/:entryId`, `/picks/templates/:templateId`, `/picks/:pickId`, and `/content/series/:seriesTmdbId/season/:seasonNumber/episode/:episodeNumber`; ensure route order does not shadow their parent routes.
- [x] **Step 3: Add all new labels to the Portuguese message catalog.** Keep page copy, accessible labels, empty/error/loading copy, filter options, and navigation labels in `messages.ts`; do not add English screen text in templates.
- [x] **Step 4: Preserve desktop and mobile shell behavior.** Link implemented pages in the desktop navigation or prototype menu and in the mobile bottom navigation/menu; active links must follow RouterLinkActive and close the mobile menu when navigated.
- [x] **Step 5: Open every route directly in the local app.** Confirm auth-guard behavior, route title, shell, footer, and page component mount without a blank page or routing conflict.

---

### Task 5: Implement Social and Notifications

**Files:**
- Create: `src/app/features/social/pages/social/social.component.{ts,html,css}`
- Create: `src/app/features/notifications/pages/notifications/notifications.component.{ts,html,css}`
- Create feature data-access files only for operations supported by the current API contract.
- Modify: `src/app/app.routes.ts`, `src/app/layout/authenticated-layout.component.html`, `src/app/shared/i18n/messages.ts`.

**Interfaces:**
- Consumes: Home's social activity model and card interactions where appropriate; the prototype's Social and Notifications artboards; existing notification unread indicator state.
- Produces: Full Social feed and Notifications page with responsive cards, tabs/filters, empty/loading/error states, and navigation.

- [x] **Step 1: Match the Social reference structure.** Implement the page heading, filters/tabs, activity cards for review, picks, and ranking-update forms, card actions, and full-page spacing from the four Social artboards.
- [x] **Step 2: Match notification layout and unread indicators.** Implement notification grouping, read/unread visual states, action links, and the prototype's header badge across desktop, tablet, and mobile.
- [x] **Step 3: Bind existing API data only where a matching API contract exists.** Reuse existing service models; show reference-matching empty/error/loading states if the project has no supported read operation for a section.
- [x] **Step 4: Verify activity interactions.** Check filters/tabs, navigation links, likes/comments where supported, unread badge, and mobile bottom-nav behavior against the prototypes.

---

### Task 6: Implement Diary and Progress

**Files:**
- Create: `src/app/features/diary/pages/diary/diary.component.{ts,html,css}`
- Create: `src/app/features/progress/pages/progress/progress.component.{ts,html,css}`
- Reuse: `src/app/features/home/data-access/home-api.service.ts`, `src/app/features/content/data-access/content-api.service.ts`.
- Modify: `src/app/app.routes.ts`, `src/app/shared/i18n/messages.ts`.

**Interfaces:**
- Consumes: Existing diary read/write request types and summary data where supported; prototype Diary and Progress screens.
- Produces: Diary timeline and watch-progress analytics with the same graph/card layouts and controls as the references.

- [x] **Step 1: Implement Diary list structure.** Match its header, date grouping, content cards, type/status filters, sorting, pagination, and empty/loading/error states.
- [x] **Step 2: Implement the Progress page.** Match aggregate stats, charts, category breakdowns, legends, and responsive chart behavior; use API response data without changing the user's history.
- [x] **Step 3: Connect existing diary operations.** Use `HomeApiService` or `ContentApiService` create/update operations only where the prototype exposes those controls and the request shape is already supported.
- [x] **Step 4: Implement the diary-entry detail path.** Add the read-only/interactive entry surface required by `/diary/entry/:entryId`, reusing comments, likes, and review components from existing content pages where they match.
- [x] **Step 5: Verify charts and controls at all four viewports.** Check full-page heights, chart scroll/legend layout, date controls, filters, dialogs, and empty states.

---

### Task 7: Implement Watchlist and Calendar

**Files:**
- Create: `src/app/features/watchlist/pages/watchlist/watchlist.component.{ts,html,css}`
- Create: `src/app/features/calendar/pages/calendar/calendar.component.{ts,html,css}`
- Create typed read-only data-access methods only when their API contract is available.
- Reuse: `src/app/features/content/data-access/content-api.service.ts` for supported add/remove actions.
- Modify: `src/app/app.routes.ts`, `src/app/shared/i18n/messages.ts`.

**Interfaces:**
- Consumes: Existing movie/series watchlist operations, home release data, shared poster overlay, and prototype Watchlist/Calendar artboards.
- Produces: Filterable/paginated Watchlist and responsive calendar/next-release views.

- [x] **Step 1: Implement Watchlist desktop/tablet structure.** Match title/summary row, type filter, genre selector, sort controls, status selector, item grid/list, pagination, and the Home poster overlay.
- [x] **Step 2: Implement Watchlist mobile structure.** Match the mobile title, summary metrics, compact filter/sort dropdown, card widths, badges, and bottom navigation.
- [x] **Step 3: Implement Calendar.** Match date navigation, calendar/list presentation, upcoming release cards, empty days, and mobile layout using API data when supported.
- [x] **Step 4: Connect supported watchlist actions.** Add/remove only through existing movie/series watchlist service methods; preserve API-provided item status and do not synthesize completion data.
- [x] **Step 5: Compare sorting, filters, pagination, and date navigation.** Open menus and verify all four sizes including below-the-fold content.

---

### Task 8: Implement Lists

**Files:**
- Create: `src/app/features/lists/pages/lists/lists.component.{ts,html,css}`
- Create: `src/app/features/lists/pages/list-detail/list-detail.component.{ts,html,css}`
- Reuse: `ContentApiService.getUserLists`, `getListItems`, add/remove methods, and existing list dialog styles in `public/styles/movie-content.css`.
- Modify: `src/app/app.routes.ts`, `src/app/shared/i18n/messages.ts`.

**Interfaces:**
- Consumes: Existing typed list summary/detail models and the prototype Lists page and list detail states.
- Produces: List index, list detail, filters, creation controls, empty/loading/error states, and responsive item cards.

- [x] **Step 1: Implement the list index layout.** Match page heading, sorting/filtering, list cards, item counts, privacy badges, and create-list affordance.
- [x] **Step 2: Implement list detail.** Match title/description, poster grid, type filters, pagination, and empty state.
- [x] **Step 3: Connect supported list operations.** Reuse current list API methods; only display a success state after the API confirms creation or item changes.
- [x] **Step 4: Match the empty message and spacing.** Use the prototype's exact spacing and the existing correct “Você ainda não criou nenhuma lista” vertical rhythm.
- [x] **Step 5: Verify list menus, creation dialog, empty view, and responsive card geometry.**

---

### Task 9: Implement Picks and Games

**Files:**
- Create: `src/app/features/picks/pages/picks-explore/picks-explore.component.{ts,html,css}`
- Create: `src/app/features/picks/pages/pick-template/pick-template.component.{ts,html,css}`
- Create: `src/app/features/picks/pages/pick-detail/pick-detail.component.{ts,html,css}`
- Create: `src/app/features/games/pages/games/games.component.{ts,html,css}`
- Create typed data-access only for documented API operations.
- Modify: `src/app/app.routes.ts`, `src/app/shared/i18n/messages.ts`.

**Interfaces:**
- Consumes: Prototype Picks Explore/Template/Pick screens and Games screen; shared profile/content cards and comment presentation.
- Produces: Explore, template, detail, and daily-game result screens with their responsive and empty/error states.

- [x] **Step 1: Implement Picks Explore.** Match page heading, discovery filters, templates/picks cards, creator metadata, and responsive grid.
- [x] **Step 2: Implement template and pick details.** Match template/pick structure, picks list, creator attribution, comments, likes, and navigation affordances.
- [x] **Step 3: Implement Games.** Match the game overview, answer/selection state, results/reveal state, history/leaderboard if present, and responsive layouts from the artboards.
- [x] **Step 4: Use current APIs where defined.** Keep unsupported write controls visually faithful but do not claim persistence; bind existing likes/comments only when a matching endpoint exists.
- [x] **Step 5: Verify filters, detail links, cards, result states, and mobile interactions.**

---

### Task 10: Implement Profile, Episode, Settings, and remaining detail surfaces

**Files:**
- Create: `src/app/features/profile/pages/profile/profile.component.{ts,html,css}`
- Create: `src/app/features/content/pages/episode/episode.component.{ts,html,css}`
- Create: `src/app/features/content/pages/diary-review/diary-review.component.{ts,html,css}`
- Create: `src/app/features/settings/pages/settings/settings.component.{ts,html,css}`
- Reuse: `src/app/features/content/pages/movie/`, `src/app/features/content/pages/series/`, and shared review/comment components.
- Modify: `src/app/app.routes.ts`, `src/app/shared/i18n/messages.ts`, `src/app/features/content/data-access/content-api.service.ts` only where the contract supports it.

**Interfaces:**
- Consumes: Current content, following, review, diary, and comment types/operations; part 1 detail screens and part 2 Settings artboards.
- Produces: User profile, episode detail, diary-review detail, and settings surfaces at desktop and mobile sizes.

- [x] **Step 1: Implement Profile and visitor permission state.** Match profile header, stats, lists/top-5 sections, follow state, and profile tabs; expose a viewer-mode input/state so the same screen can render Visitor artboards without duplicating markup.
- [x] **Step 2: Implement Episode detail.** Match episode banner, series/season context, community score, viewer rating/actions, cast/crew, reviews, comments, and all reference dialogs.
- [x] **Step 3: Implement Diary Review detail.** Match author/content/date/rating/review card, likes/comments, and navigation back to the diary/content.
- [x] **Step 4: Implement Settings.** Match the prototype's sections, switches, profile/privacy preferences, and destructive or account controls without executing permanent account deletion.
- [x] **Step 5: Audit Movie and Series shared elements.** Align shared content controls, rating overlays, poster menus, footer, and cards across Movie, Series, and Episode while preserving existing API behavior.
- [x] **Step 6: Verify profile, episode, settings, and detail states at all four viewport sizes.**

---

### Task 11: Implement every Visitor artboard

**Files:**
- Modify/create visitor-mode support in `src/app/features/profile/`, `src/app/features/content/`, `src/app/features/diary/`, `src/app/features/picks/`, and other route owners named by the Task 1 inventory.
- Modify: relevant feature templates, scoped styles, route configuration, and `src/app/shared/i18n/messages.ts`.

**Interfaces:**
- Consumes: All 60 Visitor artboard names and states from the second prototype, public profile/content route state, existing authenticated layouts, and shared card/dialog components.
- Produces: A complete visitor-mode view for every artboard without unnecessary duplicate page implementations.

- [x] **Step 1: Classify each of the 60 artboards by underlying screen and visitor state.** Record which route/component owns it and what differs: visibility, follow controls, private content, CTA, navigation, or card state.
- [x] **Step 2: Add explicit viewer-context state to the corresponding screens.** Reuse the same page layout and content components; conditionally show or hide controls based on visitor permissions without changing card geometry.
- [x] **Step 3: Implement the visitor navigation and unauthenticated CTA treatment.** Match the prototype's header, account/visitor menu, footer, prompts, and navigation affordances.
- [x] **Step 4: Verify every inventory row against its artboard.** Open each route/context, check visibility/interaction and responsive layout, and mark it complete only after visual comparison.

---

### Task 12: Complete Auth, Legal, Errors, Guidelines, Help, and Share

**Files:**
- Modify: `src/app/features/auth/pages/login/`, `src/app/features/auth/pages/signup/`, `src/app/features/auth/auth.routes.ts`
- Create: forgot-password page component under `src/app/features/auth/pages/forgot-password/`
- Modify: `src/app/shared/route-placeholder/` or replace it with dedicated legal/help/error page components as the inventory requires.
- Modify: `src/app/app.routes.ts`, `src/app/layout/public-layout.component.{ts,html,css}`, `src/app/shared/i18n/messages.ts`
- Reuse: Movie's existing share dialog and `HomeFooterComponent`.

**Interfaces:**
- Consumes: All Auth (8), Legal (8), Errors (4), Community Guidelines (4), Help & Contact (4), and Share (6) artboards.
- Produces: Portuguese public/auth/information routes and the reference-matching Share overlay.

- [x] **Step 1: Implement Auth states.** Match login, registration, forgot-password, validation, disabled/loading, and error states; reuse current auth API calls and keep every label in Portuguese.
- [x] **Step 2: Implement Legal and Community Guidelines pages.** Replace generic placeholders with content layouts that match the prototype's heading, hierarchy, table/list, and responsive spacing.
- [x] **Step 3: Implement Help & Contact and Errors states.** Match informational/error composition, recovery actions, footer, and responsive layouts from each artboard.
- [x] **Step 4: Reuse Share as a modal on its owning screen.** Preserve the existing Movie share-dialog interaction, match the six Share artboards, and add the same shared trigger/dialog to other screens only where shown by the prototype.
- [x] **Step 5: Open every public route and overlay.** Verify footer parity, browser navigation, form states, modal dismissal, and mobile layout.

---

### Task 13: Final parity audit for all screens and existing routes

**Files:**
- Modify any screen templates/styles identified by the comparison.
- Inspect: all files in the route/artboard inventory and `src/app/shared/components/home-footer/`.

**Interfaces:**
- Consumes: Implemented screens, both prototype artifacts, route/artboard matrix, and user-specific local API responses.
- Produces: Completed parity matrix and a local frontend build with every screen route available.

- [x] **Step 1: Reopen every screen in the embedded browser at its four reference dimensions.** Capture top, middle, and bottom positions for long pages and compare sizes/positions for the title, main grid, controls, cards, footer, and navigation.
- [x] **Step 2: Exercise every in-scope interaction.** Compare menus, dropdowns, modals, tabs, filters, sorting, pagination, hover/focus replacement, forms, empty/loading/error states, and mobile controls.
- [x] **Step 3: Fix each measured discrepancy.** Adjust the owning component's CSS/markup, then recapture the same reference viewport and state until the visible geometry and styling match.
- [x] **Step 4: Build the frontend.** Run `npm run build -- --configuration=development --optimization=false`; resolve any compilation errors before claiming completion.
- [x] **Step 5: Confirm all route entries and links.** Open each route directly and navigate between linked screens; confirm shared footer appears exactly once and follows Home behavior everywhere.
- [x] **Step 6: Update the parity matrix and report any genuine API limitation.** Do not mark a screen complete when a reference state was inaccessible or unverified; name it and the blocking reason in the final summary.
