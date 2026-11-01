# Watchwise prototype artboard inventory

Captured from the two authenticated Claude artifacts on 2026-10-31. The screen list is the route and visual-QA source of truth for the all-screens implementation plan.

## First artifact destinations

The Home prototype links to these product screens or screen states:

| Destination | Proposed local route | Current state |
|---|---|---|
| Home | `/home` | Responsive route sweep and applicable reference comparison recorded below |
| Social | `/social` | Responsive route sweep and reference comparison recorded below |
| Trending | `/trending` | Responsive route sweep and selector comparison recorded below |
| Diary | `/diary` | Responsive route sweep and route/state checks recorded below |
| Watchlist | `/watchlist` | Responsive route sweep and filter-menu checks recorded below |
| Calendar | `/calendar` | Responsive route sweep recorded below |
| Lists | `/lists` | Responsive route sweep and creation-dialog check recorded below |
| Picks Explore | `/picks` and `/picks/templates` | Route and component present; catalog route and empty state manually checked at notebook and mobile widths |
| Picks Template | `/picks/templates/:templateId` | Dynamic route manually checked with an unavailable ID; localized recovery state rendered |
| Pick detail | `/picks/:pickId` | Dynamic route manually checked with an unavailable ID; localized recovery state rendered |
| Games | `/games` | Responsive route sweep recorded below |
| Notifications | `/notifications` | Responsive route sweep recorded below |
| Progress | `/progress` | Manually compared with the User - Progress reference at all four standard viewports; measurements recorded below |
| Profile | `/users/:username` | Responsive route sweep; visitor sections and four responsive sizes checked below |
| Movie detail | `/content/movie/:tmdbId` | Responsive route sweep; mobile overflow fix verified below |
| Series detail | `/content/series/:tmdbId` | Responsive route sweep and video-dialog check recorded below |
| Episode detail | `/content/series/:seriesTmdbId/season/:seasonNumber/episode/:episodeNumber` | Responsive route sweep and share-preview check recorded below |
| Diary Review detail | `/diary/entry/:entryId` | Responsive route sweep; populated review check recorded below |
| Terms of Use | `/terms` | Responsive route sweep; mobile overflow fix verified below |
| Privacy Policy | `/privacy` | Responsive route sweep; mobile overflow fix verified below |
| Community Guidelines | `/community-guidelines` | Responsive route sweep; mobile overflow fix verified below |
| Help & Contact | `/help-contact` | Responsive route sweep recorded below |

Login, Register, and Forgot Password routes are included in the responsive route sweep; Auth states are also recorded below.

## Part 2 page groups and artboards

## Responsive sizes and visible states

The standard responsive artboards use these CSS-pixel viewports: desktop 1920×1080, notebook 1440×900, tablet 768×1024, and mobile 390×844. Long desktop/notebook artboards keep the same width and extend vertically to fit the whole page; their page height is specific to the content. Share is a set of six portrait compositions at 1080×1920 rather than responsive page layouts. The 60 Visitor artboards use 1920-wide base layouts, 390×844 mobile layouts, 1440-wide notebook layouts, and 768×1024 tablet layouts where named in the inventory above.

| Artboard family | Responsive artboard sizes | Visible sections and controls/states captured |
|---|---|---|
| First artifact destinations | Standard viewport targets above; dedicated variants are named in the source artifact where present. | All listed routes were swept at the four standard viewport sizes for page mount, responsive overflow, and shared shell. Specific reference measurements and interaction checks are recorded below; route geometry does not imply sample-data equality or exhaustive state coverage. |
| Watchlist | 1920-wide base, 1440-wide notebook, 768×1024 tablet, 390×844 mobile. | Type filters All/Movies/Series, genre filter, date-added sort direction, status filter, item pagination; mobile exposes compact filter and sort controls. Its local empty state was checked at all four sizes. The shared poster menu was checked on a populated Home card because this account has no Watchlist items. |
| Trending | 1920×2440 base, 1440×2440 notebook, 768×1024 tablet, 390×844 mobile. | Today/This week period selector, movie/series switch, poster grid and “show more” paging. The default board has This week selected. |
| Social | 1920×3600 base, 1440×3600 notebook, 768×1024 tablet, 390×844 mobile. | Feed grouped by day (including Today/Monday); review, Picks, Top 5 and poster/frame activity cards; like/unlike, comment input and Post, view comments, load more. Tablet/mobile collapse some comment previews behind “View all”. |
| Notifications | 1920×1800 base, 1440×1800 notebook, 768×1024 tablet, 390×844 mobile. | All/Unread (8)/Read filters; unread/read card styling; accept/decline follow requests; mark as read; load more. |
| Share | Six 1080×1920 portrait artboards. | Static share-card compositions for Movie, Episode, Profile Preview, Episode Ratings Map (Show), List and Picks. The boards establish exported-card content and hierarchy; they do not document a modal's dismissal or export behavior. |
| Settings | 1920×4700 base, 1440×4700 notebook, 768×1024 tablet, 390×844 mobile. | Profile photo/banner edit and save; Privacy visibility, follow-request accept/reject and blocked-user unblock; content language/region; security/account email, password, sessions, logout and delete-account controls. The destructive confirmation flow is not exercised by the static board. |
| Auth | Login: 1920×1080; signup: 1920×1200; mobile: 390×844; notebook login/signup: 1440-wide; tablet login/signup: 768×1024. | Login and signup forms; show-password control; keep logged in for 30 days is checked on the login board; signup terms checkbox and create-account action. Validation/loading/error outcomes are not represented by the default artboards. |
| Legal | Terms: 1920×4400; Privacy: 1920×6400; each has 390×844 mobile, 1440-wide notebook and 768×1024 tablet variants. | Long-form Portuguese legal sections with headings and scrolling. No stateful controls are shown. |
| Errors | 1920×1080 base, 1440×1080 notebook, 768×1024 tablet, 390×844 mobile. | 404 composition with Search titles, Back home and suggested Trending/Calendar/Lists links. |
| Community Guidelines | 1920×5000 base, 1440×5000 notebook, 768×1024 tablet, 390×844 mobile. | Long-form guidelines page with section headings and scrolling; no stateful controls shown. |
| Help & Contact | 1920×2800 base, 1440×2800 notebook, 768×1024 tablet, 390×844 mobile. | Help/contact information and section links in a long page; no form submission state is represented by the artboards. |
| Visitor (60) | Base layouts: 1920 wide; mobile: 390×844; notebook: 1440 wide; tablet: 768×1024. Long-page heights vary. | Shared profile header with Follow/profile options; Movie/Series content-type switch; visitor tabs for Profile, Progress, History, Reviews, Lists, Watchlist, Picks, Episode Ratings Map, Month/Year in Review and All Time Stats. Content boards show stats, Top 5/recent items, activity/review/list/pick cards, episode-rating grids, review and list detail, month/year period controls and data visualizations. Visitor Review/List/Pick detail boards include their respective content and engagement actions. The artboards show visitor-mode presentation; permissions, authentication prompts and action results require separate behavior checks. |

The dimensions above come from the named artboards and captured iframe bounds. “Visible states” records the controls and content represented in the default prototype boards; it does not imply that every control outcome, hover/focus state, API-backed empty/loading/error state, modal or touch interaction was exercised.

### Watchlist (4)

- Watchlist
- Watchlist - Mobile 390
- Watchlist - Notebook 1440
- Watchlist - Tablet 768

### Trending (4)

- Trending
- Trending - Mobile 390
- Trending - Notebook 1440
- Trending - Tablet 768

### Social (4)

- Social - Feed
- Social - Mobile 390
- Social - Feed - Notebook 1440
- Social - Feed - Tablet 768

### Notifications (4)

- Notifications
- Notifications - Mobile 390
- Notifications - Notebook 1440
- Notifications - Tablet 768

### Share (6)

- Share - Movie
- Share - Episode
- Share - Profile Preview
- Share - Episode Ratings Map (Show)
- Share - List
- Share - Picks

### Settings (4)

- Settings
- Settings - Mobile 390
- Settings - Notebook 1440
- Settings - Tablet 768

### Auth (8)

- Auth - Log in
- Auth - Sign up
- Auth - Log in - Mobile 390
- Auth - Sign up - Mobile 390
- Auth - Log in - Notebook 1440
- Auth - Log in - Tablet 768
- Auth - Sign up - Notebook 1440
- Auth - Sign up - Tablet 768

### Legal (8)

- Legal - Terms of Use
- Legal - Privacy Policy
- Legal - Terms of Use - Mobile 390
- Legal - Privacy Policy - Mobile 390
- Legal - Privacy Policy - Notebook 1440
- Legal - Privacy Policy - Tablet 768
- Legal - Terms of Use - Notebook 1440
- Legal - Terms of Use - Tablet 768

### Errors (4)

- Errors - 404 Not found
- Errors - 404 Not found - Mobile 390
- Errors - 404 Not found - Notebook 1440
- Errors - 404 Not found - Tablet 768

### Community Guidelines (4)

- Legal - Community Guidelines
- Legal - Community Guidelines - Mobile 390
- Legal - Community Guidelines - Notebook 1440
- Legal - Community Guidelines - Tablet 768

### Help & Contact (4)

- Help & Contact
- Help & Contact - Mobile 390
- Help & Contact - Notebook 1440
- Help & Contact - Tablet 768

## Visitor (60)

### Desktop or base artboards

1. Visitor - User - Profile
2. Visitor - User - Progress
3. Visitor - User - History
4. Visitor - User - Reviews
5. Visitor - User - Lists
6. Visitor - User - Watchlist
7. Visitor - User - Picks
8. Visitor - User - Episode Ratings Map
9. Visitor - User - Episode Ratings Map (Show)
10. Visitor - User - Month in Review
11. Visitor - User - Year in Review
12. Visitor - User - All Time Stats
13. Visitor - Review
14. Visitor - List
15. Visitor - Picks - Pick Detail

### Mobile 390 artboards

16. Visitor - User - All Time Stats - Mobile 390
17. Visitor - User - Episode Ratings Map - Mobile 390
18. Visitor - User - Episode Ratings Map (Show) - Mobile 390
19. Visitor - User - History - Mobile 390
20. Visitor - List - Mobile 390
21. Visitor - User - Lists - Mobile 390
22. Visitor - User - Month in Review - Mobile 390
23. Visitor - Picks - Pick Detail - Mobile 390
24. Visitor - User - Picks - Mobile 390
25. Visitor - User - Profile - Mobile 390
26. Visitor - User - Progress - Mobile 390
27. Visitor - Review - Mobile 390
28. Visitor - User - Reviews - Mobile 390
29. Visitor - User - Watchlist - Mobile 390
30. Visitor - User - Year in Review - Mobile 390

### Notebook 1440 and Tablet 768 artboards

31. Visitor - User - All Time Stats - Notebook 1440
32. Visitor - User - All Time Stats - Tablet 768
33. Visitor - User - Episode Ratings Map - Notebook 1440
34. Visitor - User - Episode Ratings Map (Show) - Notebook 1440
35. Visitor - User - Episode Ratings Map (Show) - Tablet 768
36. Visitor - User - Episode Ratings Map - Tablet 768
37. Visitor - User - History - Notebook 1440
38. Visitor - User - Profile - Notebook 1440
39. Visitor - User - Profile - Tablet 768
40. Visitor - User - Progress - Notebook 1440
41. Visitor - User - Progress - Tablet 768
42. Visitor - User - History - Tablet 768
43. Visitor - User - Reviews - Notebook 1440
44. Visitor - User - Reviews - Tablet 768
45. Visitor - User - Lists - Notebook 1440
46. Visitor - User - Lists - Tablet 768
47. Visitor - User - Watchlist - Notebook 1440
48. Visitor - User - Watchlist - Tablet 768
49. Visitor - User - Picks - Notebook 1440
50. Visitor - User - Picks - Tablet 768
51. Visitor - User - Month in Review - Notebook 1440
52. Visitor - User - Month in Review - Tablet 768
53. Visitor - User - Year in Review - Notebook 1440
54. Visitor - User - Year in Review - Tablet 768
55. Visitor - Review - Notebook 1440
56. Visitor - Review - Tablet 768
57. Visitor - List - Notebook 1440
58. Visitor - List - Tablet 768
59. Visitor - Picks - Pick Detail - Notebook 1440
60. Visitor - Picks - Pick Detail - Tablet 768

## Local implementation inventory

Static workspace review on 2026-10-31 found route components for all first-artifact destinations, all second-artifact groups, the 60 Visitor variants, and the Auth/Legal/Errors/Help surfaces. Manual route, responsive, and interaction checks were recorded on 2026-11-01; follow-through and specific data limits are listed below.

- Authenticated routes and feature components are present for Home, Social, Trending, Diary, Watchlist, Calendar, Lists, Picks, Games, Notifications, Progress, Profile, Movie, Series, Episode, Settings, and detail views.
- Public routes and components are present for Login, Register, Forgot Password, Terms, Privacy, Community Guidelines, Help & Contact, and 404.
- `HomeFooterComponent` is mounted by the authenticated and public shells, and Home's global CSS supplies its responsive presentation.
- `ContentImageActionsComponent` is used by Home and multiple content-card screens for the community-score badge and three-dot menu. On a populated Home card, the rating/menu swap was verified on desktop hover and keyboard focus, plus mobile touch open and outside dismissal. Empty data-backed routes do not expose cards to exercise individually.
- Existing data-access services include Auth login/register/logout; Home summary and diary create/update; Trending search and paging; Content details, reviews, comments, lists, following, diary entries, watchlist operations, dropped state, and comment/review likes. Screens should use only operations whose typed contracts match.
- Visual verification status: the local app is reachable in the embedded browser. Every Visitor artboard was opened by its exact canvas title; mapped local route families were checked at the available reference widths. Data-dependent sample rows were not added to the account.

## Manual verification record — 2026-11-01

All browser checks used the embedded browser. The authenticated routes were allowed to hydrate before reading the page; an earlier immediate capture briefly saw the auth shell before session restoration and was discarded. During the later notification-filter audit, an ambiguous locator activated “Marcar todas como lidas”; that single read flag was restored to unread and verified as 1 total / 1 unread before continuing.

| Route or state | Viewport(s) checked | Evidence |
|---|---|---|
| Re-opened both reference artifacts in the embedded browser | Prototype canvas/current default browser size | Part 1 loaded its Home canvas and linked navigation. Part 2's live page menu listed all 12 groups with counts Watchlist 4, Trending 4, Social 4, Notifications 4, Share 6, Settings 4, Visitor 60, Auth 8, Legal 8, Errors 4, Community Guidelines 4, and Help & Contact 4. The live Visitor tree returned all 60 exact artboard titles, matching the numbered inventory below. |
| Direct local route sweep | 25 core routes × 4 sizes; 15 Visitor route contexts × 4 sizes | The 100 core-route and 60 Visitor-context navigations rendered their expected mounts after hydration, with no horizontal overflow, one shared footer, and no page-level alert. Read-only missing-ID recovery states were used where the local account had no matching content. |
| Authenticated navigation destinations: Home, Social, Trending, Diary, Calendar, Watchlist, Lists, Picks, Games, Notifications, Progress, Settings, and Profile | Notebook 1440×900 | Direct navigation rendered the expected page title and heading, one shared footer, no page-level alert, and no horizontal overflow. |
| Main/public route families | Mobile 390×844 | Representative route scan mounted the responsive navigation and shared footer once, with no page-level alert or horizontal overflow. Long legal pages were inspected below the fold in the earlier visual pass. |
| Profile Progress (`/progress`, owner context) | 1920×1080, 1440×900, 768×1024, 390×844 | Hero/summary/list vertical positions match the reference. The progress list begins at y=272 on tablet/mobile and y=600 on notebook/desktop. Card grid bounds: mobile x=16/w=358, tablet x=32/w=704, notebook x=80/w=1265, desktop x=80/w=1745. Real progress labels render as 9% and 100%; page width does not overflow and the shared footer appears once. |
| Picks catalog (`/picks/templates`) | Notebook 1440×900 and mobile 390×844 | The static route wins over the dynamic template route, sort/search controls render, “Ver todos” targets the catalog, and the authenticated account's real API response produces the localized empty state. No fake catalog rows were added. |
| Picks template and pick detail | Notebook 1440×900 | Nonexistent read-only IDs reach their intended detail components and show localized unavailable/retry states, confirming route order. |
| Profile and episode share preview | Desktop 1920×1080 and mobile 390×844 | Both previews open with their expected card type and visible close/copy/download controls. Only opening and closing was exercised; copying and downloading were not invoked. |
| Episode Ratings Map (Show) share preview | Mobile 390×844 | Added the map-specific share action and model. Both personal-score and community-average modes render the matching season/episode matrix in the preview without horizontal overflow. Copy/download were not invoked. |
| Series video dialog (`/content/series/259909`) | Notebook 1440×900 | The Videos 10 dialog opened with its selectable list and was closed with its visible close control. No video playback was started. |

### Final follow-through — 2026-11-01

| Route or state | Viewport(s) checked | Evidence |
|---|---|---|
| Visitor artboards | All 60 exact canvas titles | All 60 frames loaded successfully and returned text plus non-zero geometry. The base frames are 1920 wide; Notebook is 1440 wide; Tablet is 768×1024; Mobile is 390×844. Full-page heights vary by screen and are captured by the canvas. |
| Visitor Review/List/Pick detail fallbacks | 1920×1080, 1440×900, 768×1024, 390×844 | Each direct route rendered its localized retry/unavailable state, one shared footer, and no horizontal overflow. The List state exposes its expected alert. |
| Populated review detail (an existing local diary entry) | 1920×1080, 1440×900, 768×1024, 390×844 | A real Oppenheimer review rendered with score, date, comments area, share menu, and one footer at every width. The share menu opened and closed; link copying and likes/comments were not invoked. |
| Social reference vs. local (`/social`) | Notebook 1440×900; the route was also swept at the four standard sizes | The Social hero begins at y=64 and is 292px tall in both views; at 1440px, the feed column is 998px wide and centered at x=214. The local account follows 0 people, so its feed correctly renders the empty state instead of the prototype's sample posts. |
| Trending period selector | Notebook 1440×900 | “Hoje” and “Esta semana” switched their visible date ranges and returned to the week view. |
| Watchlist filters and empty-state layout | 1920×1080, 1440×900, 768×1024, 390×844 | The route renders the Portuguese empty state, one shared footer, and no horizontal overflow at all four sizes. It currently has 0 posters from the API. Genre and sort menus opened with the expected options and were dismissed without changing saved items at 1440×900. |
| Shared poster rating/menu interaction (Home card) | Desktop 1920×1080; mobile touch 390×844 | Default rating is visible. Desktop hover and Enter focus replace it with the 3-dot trigger; Enter opens the menu, Escape/outside click closes it. With mobile touch emulation (`hover:none`, `pointer:coarse`), one tap opens the menu and hides the rating; tapping outside closes it and restores the rating. Menu item was inspected without selecting an action; “Marcar como assistido” remains a separate control. |
| Lists creation dialog | Notebook 1440×900 | Dialog opened with name/description/privacy fields and closed without saving. The empty message is visible with its reference spacing. |
| Mobile navigation and shared footer | Mobile 390×844 | Drawer opened and closed by outside tap/Escape. Bottom navigation measured x=0, width=390, right=390; no horizontal overflow; one footer. |
| Direct game challenge (`/games/play/MOVIE_BY_POSTER`) | 1920×1080, 1440×900, 768×1024, 390×844 | “Filme pelo pôster” mounts with the help, give-up, search, and guess controls; no new runtime error was recorded. No guess was submitted. |
| Progress labels (`/progress`) | 1920×1080, 1440×900, 768×1024, 390×844 | Actual values render as 9% and 100%; one footer and no horizontal overflow. No new runtime error was recorded. |
| Intermediate-width header (952×884 embedded viewport) | 952×884 | A desktop header overflowed to 1147px. The 801–1100px range now uses the collapsible navigation without the mobile bottom bar; page scroll width is 937px, below the 952px viewport. Drawer opening and Escape dismissal were checked. |
| Home after responsive-header fix | 1920×1080, 1440×900, 768×1024, 390×844 | All four reference widths rendered with one footer, no page alerts, and no horizontal overflow. |
| Visitor Review author handling | Code path + populated local owner review | Foreign review pages now resolve the author through the existing public-profile read operation and route the “Resenhas” breadcrumb to that author's profile. The local account has no foreign diary entry to exercise this branch with live data. Own-review page and breadcrumb remain correct. |
| Settings Security & account (`/settings`) | Notebook 1440×900 and mobile 390×844 | Account groups match the reference card structure; desktop email/password fields use two/three columns, mobile stacks fields and shows the active-section breadcrumb. The deletion dialog now asks for the account password and exposes the API-backed destructive action; the dialog was opened and closed without submitting. The all-sessions dialog remains explanatory because the API has no endpoint for it. Added mobile bottom space so the final control scrolls above the fixed navigation; mobile page width remains 375px with no overflow. |
| Settings layout comparison (`/settings`) | 1920×1080, 1440×900, 768×1024, 390×844 | At 1920px, local section heights are Profile 861px, Privacy 1,405px, Content preferences 325px, and Security & account 1,421px. Profile and account geometry match the reference (861px and 1,421px); desktop profile form spacing and upload controls, two-column content preferences, section spacing, account fields/actions, and session rows were aligned to measured reference bounds. At 1440px there is no horizontal overflow. At 768px and 390px the four-card section picker and fixed bottom navigation match the responsive reference; opening Profile and Content preferences at 390px produced no horizontal overflow. |
| Settings sample-data differences | 1920×1080 | The prototype shows 3 pending follow requests, 2 blocked users, and a populated profile photo/banner/bio. The signed-in account returns 0 pending requests, 0 blocked users, and has no saved photo/banner/bio; its displayed name is “Lucas”. The live Settings API response currently selects English and United States. These real account values were retained. The missing request/block rows explain the roughly 134px shorter local Privacy section and the same accumulated offset for later sections. No synthetic data was created. |
| Movie and legal mobile overflow fixes | Mobile 390×844 | `/content/movie/872585`, `/terms`, `/privacy`, `/community-guidelines`, and `/settings` each have matching client/scroll widths after the label and legal-highlight spacing adjustments. |
| Profile history poster action | Mobile touch 390×844 | Tapping the first history poster's three-dot menu and choosing “Abrir conteúdo” navigated to the matching Dexter: Resurrection page. The action handler was added to recent, history, and watchlist profile posters. |
| Notifications | Mobile touch 390×844 | The one actual notification was an unread new-follower item. Its unread state remained unchanged; there were no review/drop notifications to exercise the new target routing against live records. |
| Lists and owner response | Mobile touch 390×844; API contract/build | The account and community both returned 0 lists. The detail route now follows list ID changes and resets list-specific state; the API view adds the owning user's preview, and the frontend uses that response for the author and management controls. A populated detail route could not be exercised without creating sample data. |
| Frontend build | Development, optimization disabled | Final `npm run build -- --configuration=development --optimization=false` completed successfully at 2026-11-01 09:06:58 UTC, after the Settings API wiring and responsive form updates. |
| Settings API wiring | Local API contract and embedded browser; default viewport and mobile 390×844 | The settings view loaded live profile/privacy/preferences/account data. The account forms and password-confirmation deletion dialog rendered on mobile; the dialog was closed without submission. No account write, credential update, logout, or deletion was triggered during this check. |
| API compile | Maven `-DskipTests compile` | The API compiled successfully at 2026-11-01 08:18:54 UTC after adding the list owner preview to the DTO; the development API was restarted and listened on port 8080. |
| Frontend runtime | Embedded browser on `/content/series/259909` | After restarting `ng serve`, the page loaded in the authenticated session with no current console errors. The development server listened on port 5173. |
| Shared poster action scan and code review | All `app-content-image-actions` template instances; final changed files | Every instance has an `actionSelected` handler. A static follow-up review confirmed the profile, nested-list, owner contract, and notification fixes; the existing DTO fixture was updated for the new owner constructor argument. |
| Whitespace check | Frontend working tree | `git diff --check` exited 0. Git printed a line-ending normalization warning for `public/styles/movie-content.css`; it reported no whitespace errors. |

### Known data and review limits

- The current account has zero Picks templates available from the API, so the reference's populated catalog cannot be compared using real local data.
- The Social and notification screens reflect this account's API response. Empty feeds or counts are data-dependent; no prototype data was inserted into the account.
- TMDB-provided synopsis text for the checked episode is in English even though the interface controls and labels are in Portuguese.
- Terms and Privacy pages contain explicitly marked `[PREENCHER: ...]` fields where service-specific policy facts were not confirmed. Those legal details need confirmation before publishing; the visual layout remains available for review.
- Social feed, watchlist, lists, and Picks data are account-specific. The local account has zero followed people, zero watchlist items, zero owned lists, and no Picks templates; reference sample rows therefore cannot be compared against live records without inventing or mutating account data. Their empty layouts and detail recovery states were checked.
- Settings data is also account-specific: the prototype's three pending requests, two blocked users, and populated profile media/bio have no local equivalents. Their absence is reflected in the local API response, and the corresponding empty states were visually checked without adding records or changing the profile.
- Settings now reads `/api/v1/users/me/settings` and connects supported profile text, visibility, language/region, email, password, banner removal, and account deletion actions to the existing API contract. Email changes require the current password and wait for confirmation; password updates end the current frontend session. Account deletion requires a password and remains behind a confirmation dialog. These write controls were not submitted during the visual audit. The API has no image-upload endpoint, so newly selected profile photos and banners only appear in the local preview; “logout all devices” also has no API endpoint. The local logout operation remains available.
- The Watchlist poster menu could not be exercised on that route because the API returns zero items. Its shared rating/menu control was verified on the populated Home card in desktop, keyboard, and mobile touch states.
- The local account and community have no lists, and the only notification is a new follower. The updated list-owner response and review/drop notification destinations compile but could not be exercised with live examples without adding synthetic records.
- The Visitor canvas frames were all opened and their text/geometry recorded. Local visitor route families were exercised at the four reference widths; the populated Visitor List and Visitor Pick detail samples have no matching local records, so their live data content could not be compared. No synthetic content was inserted.
- No automated tests were added or run; verification followed the approved visual-and-build-only scope.

## Reference viewports

- Desktop: 1920×1080
- Notebook: 1440×900
- Tablet: 768×1024
- Mobile: 390×844

