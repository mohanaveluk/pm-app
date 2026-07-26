import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject, signal } from '@angular/core';
import { PermissionService } from '../../core/rbac/permission.service';

/**
 * Structural directive mirroring *ngIf, gated on the current user's
 * permissions instead of a boolean expression.
 *
 * Usage: <button *appHasPermission="'users.manage'">Edit</button>
 *        <div *appHasPermission="['po.view', 'po.manage']">...</div> (any-of)
 */
@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);

  private readonly required = signal<string | string[]>([]);
  private hasView = false;

  @Input()
  set appHasPermission(value: string | string[]) {
    this.required.set(value);
  }

  constructor() {
    effect(() => {
      const required = this.required();
      const granted = Array.isArray(required)
        ? this.permissionService.hasAnyPermission(required)
        : this.permissionService.hasPermission(required);

      if (granted && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!granted && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}
