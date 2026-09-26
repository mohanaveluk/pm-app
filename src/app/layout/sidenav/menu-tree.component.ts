import { Component, EventEmitter, inject, Input, Output, signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MenuItem } from '../../core/navigation/menu-item.model';

/**
 * Self-referencing standalone component rendering a MenuItem[] tree to
 * unlimited depth. Used for the sidenav's expanded mode and inside the
 * mini-mode hover flyout.
 */
@Component({
  selector: 'app-menu-tree',
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatBadgeModule, MatTooltipModule, MatRippleModule, MenuTreeComponent],
  templateUrl: './menu-tree.component.html',
  styleUrl: './menu-tree.component.scss',
})
export class MenuTreeComponent {
  @Input({ required: true }) items: MenuItem[] = [];
  @Input() depth = 0;
  @Output() itemActivated = new EventEmitter<MenuItem>();

  private readonly router = inject(Router);
  private readonly expandedIds = signal<Set<string>>(new Set());

  // Fires once on construction (via startWith) and again on every completed
  // navigation, so the group is expanded by default whenever it is rendered
  // fresh — including right after a hard refresh, when expandedIds always
  // starts empty and there is no click to react to.
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    effect(() => {
      this.currentUrl();
      const activeParentIds = this.items
        .filter((item) => !!item.children?.length && this.hasActiveDescendant(item))
        .map((item) => item.id);
      if (!activeParentIds.length) return;

      const next = new Set(this.expandedIds());
      let changed = false;
      for (const id of activeParentIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      // Only write when something actually changed, so a manual collapse of
      // an already-active group isn't immediately forced back open by this
      // effect re-running for an unrelated reason.
      if (changed) this.expandedIds.set(next);
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggle(item: MenuItem): void {
    if (!item.children?.length) {
      this.itemActivated.emit(item);
      return;
    }
    const next = new Set(this.expandedIds());
    if (next.has(item.id)) next.delete(item.id);
    else next.add(item.id);
    this.expandedIds.set(next);
  }

  onLeafActivated(item: MenuItem): void {
    this.itemActivated.emit(item);
  }

  // Non-exact match (matchOptions `false`), matching the default matching
  // mode `routerLinkActive` itself uses on the leaf links below — so a group
  // is considered active under exactly the same rule that highlights the leaf.
  private hasActiveDescendant(item: MenuItem): boolean {
    if (item.route && this.router.isActive(item.route, false)) return true;
    return !!item.children?.some((child) => this.hasActiveDescendant(child));
  }
}
