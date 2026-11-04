import { Directive, OnDestroy, inject } from '@angular/core';
import { ModalScrollLockService } from './modal-scroll-lock.service';

@Directive({ selector: '[appModalScrollLock]', standalone: true })
export class ModalScrollLockDirective implements OnDestroy {
  private readonly releaseScrollLock = inject(ModalScrollLockService).acquire();

  ngOnDestroy(): void {
    this.releaseScrollLock();
  }
}
