# Diary grouped card layout

## Goal

Run a focused visual experiment on grouped entries in `/diary` using the supplied reference image.

## Approved design

- The grouped article keeps its two-column composition: poster/media on the left and grouped metadata on the right.
- The poster is smaller than its media column, centered horizontally, and rounded on all four corners.
- The backdrop image fills the entire grouped article, including the poster and metadata columns. Keep the existing blur, framing, and dark gradient treatment.
- Engagement moves below both columns and spans the full width of the grouped article.
- Below the article, show the grouped title aligned left and the aggregate runtime aligned right, following the regular diary card's title/runtime alignment.
- Apply these changes only to grouped cards; regular diary entries and their data remain unchanged.

## Implementation notes

Adjust the grouped card markup and styles in `diary.component.html` and `diary.component.css`. Keep the existing grouped-entry API fields and rendering logic; use the existing aggregate runtime value for the duration label.

## Verification

Review the diff and run `git diff --check`. Do not add or run tests for this visual-only experiment unless requested.
