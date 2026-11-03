import { Component, ViewEncapsulation, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './comment-item.component.html',
  styleUrl: './comment-item.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class CommentItemComponent {
  readonly authorName = input.required<string>();
  readonly authorUsername = input<string | null | undefined>(null);
  readonly authorPicture = input<string | null | undefined>(null);
  readonly createdAt = input<string | null | undefined>(null);
  readonly timeLabel = input<string | null | undefined>(null);
  readonly replyingTo = input<string | null>(null);
  readonly depth = input(0);
  readonly hasReplies = input(false);
  readonly commentId = input<string | null>(null);
}
