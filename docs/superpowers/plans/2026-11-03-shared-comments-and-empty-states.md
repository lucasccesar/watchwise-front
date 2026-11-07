# Shared Comments and Empty States Implementation Plan

> **For agentic workers:** execute inline in this session. Do not add or run tests unless the user asks; use the existing production build and `git diff --check` for verification.

**Goal:** Give every displayed comment the diary entry detail’s visual hierarchy and center existing empty-state panels vertically while keeping their page-constrained width.

**Architecture:** Add a reusable comment presentation shell with stable author, avatar, timestamp, body, action, and reply regions. Migrate interactive and read-only comment renderers to that shell while each feature retains its own data loading and action handlers. Use the authenticated layout’s flexible route area so empty panels can occupy and center in remaining page height without viewport-width or header/footer constants.

**Tech Stack:** Angular 22 standalone components, component-scoped CSS, global design tokens, existing `npm run build`.

## Global Constraints

- Keep the frontend Angular and preserve standalone components.
- Keep product copy in Brazilian Portuguese.
- Preserve current API contracts, feature actions, loading, error, and spoiler behavior.
- Keep `.ww-empty-panel` constrained to `min(1334px, calc(100vw - 64px))` on desktop and `calc(100vw - 32px)` on mobile.
- Preserve existing user changes and do not make intermediate commits.
- Do not modify the separate backend.
- Do not add or run tests unless requested; build and diff checks are allowed.

---

### Task 1: Create the shared comment presentation shell

**Files:**
- Create `src/app/shared/components/comment-item/comment-item.component.ts`
- Create `src/app/shared/components/comment-item/comment-item.component.html`
- Create `src/app/shared/components/comment-item/comment-item.component.css`
- Use diary review detail’s avatar, author/time row, body spacing, action row, nested indentation, and connector rail as the visual reference.

**Interface:**
- Inputs: `authorName: string`, `authorUsername?: string`, `authorPicture?: string | null`, `createdAt?: string`, `timeLabel?: string`, `replyingTo?: string`, `depth?: number`, `hasReplies?: boolean`, `commentId?: string`.
- Projected regions: `[comment-menu]`, `[comment-body]`, `[comment-actions]`, `[comment-extra]`, and `[comment-replies]`.
- Default avatars use `/default-user-avatar.png`; link the author to `/users/{username}` when a username exists.

### Task 2: Migrate all comment renderers

**Files:**
- Modify `src/app/features/diary/pages/review-detail/review-detail.component.html` and imports in its component.
- Modify movie, series, and episode comment templates and component imports.
- Modify list detail, social preview, pick detail, and pick template comment templates and component imports.
- Preserve each feature’s existing comment submission, likes, replies, moderation menus, delete/edit, spoiler reveal, and read-only capabilities.
- Use recursive projected comment items for threaded diary replies; retain existing nesting depth supported by other APIs.

### Task 3: Center empty-state panels in the route area

**Files:**
- Update `src/app/layout/authenticated-layout.component.css` so the direct route host can grow within `.product-main`.
- Update page roots and empty-state layout rules in watchlist, diary, notifications, social, progress, lists, list detail, list progress, picks-my, and connections.
- Let the panel consume remaining vertical room after each page’s own heading/filter controls; preserve its existing constrained width and responsive sizing.

### Task 4: Verify comments and empty-state centering

**Files:** all files above.

- Run `git diff --check`.
- Run `npm run build`.
- Inspect `git diff` and confirm the prior workspace changes remain intact.

### Task 5: Align diary/reviews controls, watchlist cards, and reply composer

**Files:**
- Modify `src/app/features/diary/pages/diary/diary.component.html`, `.ts`, and `.css` so the reviews date control uses the diary period dropdown presentation and label, and the reviews filter/sort options match diary.
- Modify `src/app/features/watchlist/pages/watchlist/watchlist.component.html`, `.ts`, and `.css` to render the same content cards as Trending while keeping Watchlist-specific state and actions.
- Modify `src/app/features/diary/pages/review-detail/review-detail.component.html` and `.css` so a reply composer keeps the avatar and text input side by side as shown in the supplied screenshot.
- Preserve the existing design tokens, API behavior, and route-specific actions.

### Task 6: Final verification

- Run `git diff --check`.
- Run `npm run build`.
- Review all task-related diffs without staging or committing unrelated pre-existing work.
