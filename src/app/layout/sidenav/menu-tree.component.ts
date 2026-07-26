import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  private readonly expandedIds = signal<Set<string>>(new Set());

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
}
