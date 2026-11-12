import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';

export interface ContentImageLanguageOption {
  code: string;
  label: string;
  count: number;
}

@Component({
  selector: 'app-content-image-language-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="content-image-language-filter">
      <div class="content-image-language-control">
        <button #trigger class="content-image-language-trigger" type="button" aria-haspopup="true"
          [attr.aria-expanded]="open" [attr.aria-controls]="menuId" (click)="toggle()">
          <span>{{ label }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        @if (selectedLanguages.length) {
          <div class="content-image-language-tags" [attr.aria-label]="label">
            @for (option of selectedLanguageOptions(); track option.code) {
              <span class="content-image-language-tag">
                <span>{{ option.label }}</span>
                <button type="button" [attr.aria-label]="removeLanguageLabel.replace('{language}', option.label)" (click)="removeOption(option.code, $event)">×</button>
              </span>
            }
          </div>
        }
      </div>
      @if (open) {
        <div class="content-image-language-menu" [id]="menuId" role="group" [attr.aria-label]="label"
          [style.top.px]="position?.top" [style.left.px]="position?.left">
          @for (option of options; track option.code) {
            <label class="content-image-language-option">
              <input type="checkbox" [checked]="selectedLanguages.includes(option.code)" (change)="toggleOption(option.code, $event)" />
              <span>{{ option.label }}</span>
              <small>{{ option.count }}</small>
            </label>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { position: relative; display: block; flex: 0 0 auto; }
    .content-image-language-control { display: flex; width: fit-content; max-width: 100%; flex-wrap: wrap; align-items: center; gap: 8px; }
    .content-image-language-trigger { display: inline-flex; min-height: 34px; align-items: center; gap: 8px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface-secondary); color: var(--color-text); cursor: pointer; font: inherit; font-size: var(--font-size-xs); font-weight: 600; }
    .content-image-language-trigger:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
    .content-image-language-trigger svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .content-image-language-tags { display: flex; min-width: 0; flex-wrap: wrap; gap: 4px; }
    .content-image-language-tag { display: inline-flex; max-width: 180px; min-height: 24px; align-items: center; gap: 4px; padding: 0 4px 0 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-text); font-size: var(--font-size-xs); }
    .content-image-language-tag > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .content-image-language-tag button { all: unset; display: grid; box-sizing: border-box; width: 12px; min-width: 12px; max-width: 12px; height: 12px; min-height: 12px; max-height: 12px; flex: 0 0 12px; align-self: center; place-items: center; border-radius: var(--radius-sm); color: var(--color-text-tertiary); cursor: pointer; font-family: inherit; font-size: 10px; line-height: 12px; text-align: center; }
    .content-image-language-tag button:hover { color: var(--color-text); }
    .content-image-language-tag button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
    .content-image-language-menu { position: fixed; z-index: 1210; display: flex; width: min(240px, calc(100vw - 24px)); max-height: min(220px, calc(100vh - 24px)); flex-direction: column; overflow-y: auto; padding: 6px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-xl); }
    .content-image-language-option { display: flex; min-height: 40px; align-items: center; gap: 9px; padding: 0 8px; border-radius: var(--radius-sm); color: var(--color-text); cursor: pointer; font-size: var(--font-size-sm); }
    .content-image-language-option:hover { background: var(--color-secondary); }
    .content-image-language-option input { margin: 0; accent-color: var(--color-primary); }
    .content-image-language-option span { min-width: 0; flex: 1; }
    .content-image-language-option small { color: var(--color-text-tertiary); font-size: inherit; }
  `],
})
export class ContentImageLanguageFilterComponent {
  private static nextId = 0;

  @Input() options: ContentImageLanguageOption[] = [];
  @Input() selectedLanguages: string[] = [];
  @Input() label = 'Idioma';
  @Input() removeLanguageLabel = 'Remover filtro de idioma: {language}';
  @Output() readonly selectedLanguagesChange = new EventEmitter<string[]>();

  protected open = false;
  protected readonly menuId = `content-image-language-menu-${ContentImageLanguageFilterComponent.nextId++}`;
  protected position: { top: number; left: number } | null = null;

  @ViewChild('trigger', { read: ElementRef })
  private trigger?: ElementRef<HTMLButtonElement>;

  constructor(private readonly element: ElementRef<HTMLElement>) {}

  protected toggle(): void {
    this.open = !this.open;
    this.updatePosition();
  }

  protected toggleOption(code: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selected = new Set(this.selectedLanguages);
    if (checked) selected.add(code);
    else selected.delete(code);
    this.selectedLanguagesChange.emit([...selected]);
  }

  protected selectedLanguageOptions(): ContentImageLanguageOption[] {
    return this.options.filter((option) => this.selectedLanguages.includes(option.code));
  }

  protected removeOption(code: string, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedLanguagesChange.emit(this.selectedLanguages.filter((language) => language !== code));
  }

  @HostListener('document:click', ['$event'])
  protected dismissOutside(event: MouseEvent): void {
    if (event.target instanceof Node && !this.element.nativeElement.contains(event.target)) {
      this.open = false;
      this.position = null;
    }
  }

  @HostListener('document:keydown.escape')
  protected dismissOnEscape(): void {
    this.open = false;
    this.position = null;
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected reposition(): void {
    if (this.open) this.updatePosition();
  }

  private updatePosition(): void {
    const trigger = this.trigger?.nativeElement;
    if (!this.open || !trigger?.isConnected) {
      this.position = null;
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(240, window.innerWidth - 24);
    const height = Math.min(220, window.innerHeight - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const below = rect.bottom + 6;
    const top = below + height <= window.innerHeight - 12
      ? below
      : Math.max(12, rect.top - height - 6);
    this.position = { top, left };
  }
}
