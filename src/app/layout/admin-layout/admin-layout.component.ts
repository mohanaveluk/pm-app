import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, ViewChild, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavContainer, MatSidenavModule } from '@angular/material/sidenav';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { AdminHeaderComponent } from '../admin-header/admin-header.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { NotificationDrawerComponent } from '../notification-drawer/notification-drawer.component';
import { SidenavStateService } from '../../core/services/sidenav-state.service';
import { NotificationService } from '../../core/services/notification.service';

const MOBILE_BREAKPOINT = '(max-width: 900px)';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, MatSidenavModule, SidenavComponent, AdminHeaderComponent, BreadcrumbComponent, NotificationDrawerComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent implements AfterViewInit {
  protected readonly sidenavState = inject(SidenavStateService);
  protected readonly notificationService = inject(NotificationService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  // Set synchronously from matchMedia (mirroring ThemeService's pattern)
  // rather than via toSignal(BreakpointObserver.observe(...)), which emits
  // its current value on subscribe and can trigger
  // ExpressionChangedAfterItHasBeenCheckedError on first render.
  private readonly media = window.matchMedia(MOBILE_BREAKPOINT);
  protected readonly isMobile = signal(this.media.matches);

  @ViewChild('sidenavEl', { read: ElementRef }) private sidenavEl?: ElementRef<HTMLElement>;
  @ViewChild(MatSidenavContainer) private sidenavContainer?: MatSidenavContainer;
  private resizeObserver?: ResizeObserver;

  constructor() {
    this.media.addEventListener('change', (event) => this.isMobile.set(event.matches));
  }

  ngAfterViewInit(): void {
    // The sidenav's collapse/expand is a pure CSS width transition, so
    // `mat-sidenav-container`'s own `autosize` recompute (which is meant to
    // catch exactly this) never actually re-measures reliably here — its
    // internal ngDoCheck->debounced-subject pipeline doesn't consistently
    // pick up a width change that happens purely via a CSS class toggle
    // rather than Angular's own opened/mode bindings. Observing the real
    // element and calling `updateContentMargins()` directly is deterministic:
    // it re-reads the sidenav's current offsetWidth and updates the header's
    // margin on every frame of the transition, regardless of mouse position
    // or any other unrelated event.
    if (!this.sidenavEl) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.ngZone.run(() => this.sidenavContainer?.updateContentMargins());
    });
    this.resizeObserver.observe(this.sidenavEl.nativeElement);
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  onSidenavClosed(): void {
    this.sidenavState.closeMobile();
  }
}
