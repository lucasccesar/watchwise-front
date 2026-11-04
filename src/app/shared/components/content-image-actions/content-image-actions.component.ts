import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CheckIconComponent } from '../check-icon/check-icon.component';

export type ContentImageActionIcon = 'check' | 'star' | 'eye' | 'trash' | 'ban' | 'rewatch' | 'share' | 'bookmark' | 'bookmark-filled' | 'list';

export interface ContentImageAction {
  id: string;
  label: string;
  icon: ContentImageActionIcon;
  disabled?: boolean;
}

export interface ContentImageActionSelection {
  action: ContentImageAction;
  event: MouseEvent;
}

@Component({
  selector: 'app-content-image-actions',
  standalone: true,
  imports: [CheckIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './content-image-actions.component.html',
  styleUrl: './content-image-actions.component.css',
})
export class ContentImageActionsComponent {
  @Input() ratingValue: string | null = null;
  @Input() ratingLabel = '';
  @Input() optionsLabel = '';
  @Input() expanded: boolean | undefined;
  @Input() actions: readonly ContentImageAction[] = [];

  @Output() readonly toggle = new EventEmitter<MouseEvent>();
  @Output() readonly actionSelected =
    new EventEmitter<ContentImageActionSelection>();

  protected internalExpanded = false;
  protected menuPosition: { top: number; left: number } | null = null;

  @ViewChild('trigger')
  private trigger?: ElementRef<HTMLButtonElement>;

  constructor(private readonly element: ElementRef<HTMLElement>) {}

  protected menuExpanded(): boolean {
    return this.expanded ?? this.internalExpanded;
  }

  protected toggleMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const willOpen = this.expanded === undefined ? !this.internalExpanded : !this.expanded;
    if (this.expanded === undefined) this.internalExpanded = willOpen;
    this.menuPosition = willOpen && window.matchMedia('(max-width: 560px)').matches
      ? this.mobileMenuPosition(event.currentTarget as HTMLElement)
      : null;
    this.toggle.emit(event);
  }

  @HostListener('document:click', ['$event'])
  protected dismissInternalMenu(event: MouseEvent): void {
    if (this.expanded !== undefined || !this.internalExpanded) return;
    if (event.target instanceof Node && !this.element.nativeElement.contains(event.target)) {
      this.internalExpanded = false;
      this.menuPosition = null;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  protected dismissInternalMenuOnEscape(event: Event): void {
    if (this.expanded !== undefined || !this.internalExpanded) return;
    event.stopPropagation();
    this.internalExpanded = false;
    this.menuPosition = null;
    this.trigger?.nativeElement.focus();
  }

  protected selectAction(action: ContentImageAction, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.expanded === undefined) this.internalExpanded = false;
    this.menuPosition = null;
    this.actionSelected.emit({ action, event });
  }

  private mobileMenuPosition(trigger: HTMLElement): { top: number; left: number } {
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const menuWidth = Math.min(200, viewportWidth - 24);
    const menuHeight = Math.min(Math.max(58, this.actions.length * 40 + 18), window.innerHeight * 0.7);
    return {
      left: Math.max(12, Math.min(rect.right - menuWidth, viewportWidth - menuWidth - 12)),
      top: Math.max(12, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 12)),
    };
  }
}
