import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-check-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<svg data-dc-tpl="171" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path data-dc-tpl="172" d="M20 6L9 17L4 12"></path></svg>',
  styles: [':host{display:inline-flex;width:16px;height:16px;flex:0 0 16px;vertical-align:middle}svg{display:block;width:16px;height:16px}'],
})
export class CheckIconComponent {}
