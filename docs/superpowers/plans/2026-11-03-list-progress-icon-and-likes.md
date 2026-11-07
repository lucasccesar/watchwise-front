# List Progress Icon and Likes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan inline. Work task by task, preserving unrelated local changes.

**Goal:** Use one rotated progress icon in the profile menu and list cards, and make list-card likes reflect and update the viewer's actual like state.

**Architecture:** Reuse the profile menu's existing three-bar SVG in both progress links and apply one shared rotation class. Make the list-card like control call the existing `ListsApiService.setLiked` method, keep its state in the current page data, and use a per-list pending set plus localized toast errors.

**Tech Stack:** Angular standalone components, Signals, RxJS, Angular templates and CSS, existing `ListsApiService`, localized message catalog, existing toast service.

## Global Constraints

- Do not alter the endpoint, the API contract, or backend business logic.
- Do not change progress destinations, progress labels, list menus, or card layout beyond the requested controls.
- Do not add dependencies or a generic icon component for these two uses.
- Preserve existing local changes and do not stage or discard unrelated files.
- Do not add or run tests unless requested; validate with the existing production build and `git diff --check`.
- Do not push. Keep the related code changes in one local commit when the unit is complete; keep the design and plan documents unstaged.

---

### Task 1: Reuse and rotate the progress icon

**Files:**
- Modify: `src/app/layout/authenticated-layout.component.html`
- Modify: `src/app/features/lists/pages/lists/lists.component.html`
- Modify: `src/styles.css`

**Interfaces:**
- The header and list-card progress links keep their current routes, labels, accessible names, and tooltips.
- Both SVG elements use the shared `ww-progress-icon` class and the same three-bar path from the profile menu.

- [ ] **Step 1: Mark the header progress link and reuse its existing SVG.**

Add `account-menu-item--progress` to the header progress anchor and `ww-progress-icon` to its SVG. Preserve the path `M4 20V10M12 20V4M20 20V14` and the current `viewerRoute('progress')` binding.

- [ ] **Step 2: Replace the list-card progress artwork with the same icon.**

Add `list-card-action--progress` to the existing progress link. Replace its two paths with the same single three-bar path and apply `ww-progress-icon`. Preserve `['/lists', list.id, 'progress']`, accessible label, and title.

- [ ] **Step 3: Apply the shared clockwise rotation.**

Add this shared rule to `src/styles.css`:

```css
.ww-progress-icon {
  transform: rotate(90deg);
}
```

- [ ] **Step 4: Build and inspect the focused diff.**

Run `npm run build` and `git diff --check`. Confirm only the two specified progress links and the shared rotation rule changed in this task.

---

### Task 2: Make list likes interactive and stateful

**Files:**
- Modify: `src/app/features/lists/pages/lists/lists.component.ts`
- Modify: `src/app/features/lists/pages/lists/lists.component.html`
- Modify: `src/app/features/lists/pages/lists/lists.component.css`
- Modify: `src/app/shared/i18n/messages.ts`

**Interfaces:**
- `ListsApiService.setLiked(listId: string, liked: boolean): Observable<void>` is the existing mutation contract.
- `UserListCard.likedByMe` initializes the button; `UserListCard.likesCount` supplies its visible count.
- Add localized `likeList`, `unlikeList`, and `likeError` messages to both `pt-BR` and `en` list-page message groups.

- [ ] **Step 1: Add localized action labels and error feedback.**

In the Portuguese and English list-page message groups, add:

```ts
likeList: 'Curtir lista {name}',
unlikeList: 'Remover curtida da lista {name}',
likeError: 'Não foi possível atualizar a curtida da lista. Tente novamente.',
```

Use the English equivalents `Like list {name}`, `Remove like from list {name}`, and `Could not update the list like. Try again.`.

- [ ] **Step 2: Track in-flight likes by list ID.**

In `ListsComponent`, add a signal initialized as `signal<ReadonlySet<string>>(new Set())` and a `toggleListLike(list: UserListCard): void` handler. Return early when the list ID is already pending. Otherwise call `api.setLiked(list.id, !list.likedByMe)`, add the ID before subscribing, and remove it in `finalize`.

Implement the pending guard and mutation with this flow:

```ts
protected readonly likingListIds = signal<ReadonlySet<string>>(new Set());

protected toggleListLike(list: UserListCard): void {
  if (this.likingListIds().has(list.id)) return;

  const liked = !list.likedByMe;
  this.likingListIds.update((ids) => new Set([...ids, list.id]));

  this.api.setLiked(list.id, liked).pipe(
    finalize(() => this.likingListIds.update((ids) => {
      const next = new Set(ids);
      next.delete(list.id);
      return next;
    })),
  ).subscribe({
    next: () => {
      const refreshForMembership = this.source() === 'LIKED' && !liked;
      const refreshForSort = this.sort() === 'likesCount';
      if (refreshForMembership || refreshForSort) {
        if (refreshForMembership && this.page() > 1 && this.pageData()?.content.length === 1) {
          this.page.update((page) => page - 1);
        }
        this.load();
        return;
      }

      this.pageData.update((page) => page ? {
        ...page,
        content: page.content.map((card) => card.id === list.id ? {
          ...card,
          likedByMe: liked,
          likesCount: Math.max(0, card.likesCount + (liked ? 1 : -1)),
        } : card),
      } : page);
    },
    error: () => this.toasts.error(this.copy.likeError),
  });
}
```

On error, keep the existing card state and show `this.copy.likeError`.

- [ ] **Step 3: Replace the static counter with an accessible button.**

Replace the first footer `<span>` with a `<button type="button">` using:

```html
[class.list-card-like--active]="list.likedByMe"
[attr.aria-pressed]="list.likedByMe"
[attr.aria-label]="(list.likedByMe ? copy.unlikeList : copy.likeList).replace('{name}', list.name)"
[disabled]="likingListIds().has(list.id)"
(click)="toggleListLike(list); $event.stopPropagation()"
```

Keep the existing heart path and render `list.likesCount` in the button. Leave the comments counter as a non-interactive span.

- [ ] **Step 4: Style liked and unliked states.**

Keep the footer's existing layout. Give the like button the same inline alignment and typography as the counter it replaces, preserve a visible keyboard focus outline, and disable its pointer action while pending. Keep the heart outlined with the existing heart color when `.list-card-like--active` is absent; fill it with that color only when the class is present. Remove the old rule that fills the heart for every first footer span.

Use these state-specific rules, matching the current footer dimensions and color:

```css
.list-card-footer > button.list-card-like {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.list-card-footer > button.list-card-like svg {
  fill: none;
  stroke: #ef5350;
}

.list-card-footer > button.list-card-like.list-card-like--active svg {
  fill: #ef5350;
}

.list-card-footer > button.list-card-like:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.list-card-footer > button.list-card-like:disabled {
  cursor: wait;
  opacity: .65;
}
```

- [ ] **Step 5: Build and inspect the focused diff.**

Run `npm run build` and `git diff --check`. Confirm there are no API, backend, or unrelated list-card changes.

---

### Task 3: Review and commit the completed unit

**Files:**
- Review only the implementation files listed in Tasks 1 and 2.

- [ ] **Step 1: Check the final code diff and status.**

Use `git diff --check`, inspect the complete diff for the six implementation files, and confirm unrelated pre-existing modifications remain unstaged.

- [ ] **Step 2: Create one local commit for the feature code only.**

Stage the explicit implementation paths and commit them together with a Conventional Commit subject such as:

```text
feat(lists): add list likes and unify progress icon
```

Do not stage `docs/superpowers/specs/2026-11-03-list-progress-icon-and-likes-design.md` or this plan. Do not push.
