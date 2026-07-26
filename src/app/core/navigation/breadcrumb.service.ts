import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services';

const HOME_ROUTE_BY_ROLE: Record<string, string> = {
  SuperAdmin: '/admin/dashboard',
  OrganizationAdmin: '/admin/dashboard',
  DepartmentManager: '/manager/dashboard',
  DisciplineLead: '/manager/dashboard',
  ProjectManager: '/manager/dashboard',
  ProcurementManager: '/manager/dashboard',
  QAManager: '/manager/dashboard',
  WarehouseManager: '/manager/dashboard',
};

export interface Breadcrumb {
  label: string;
  url: string;
}

/**
 * Builds the breadcrumb trail from route.data['breadcrumb'] set on each
 * route in app.routes.ts, walking the activated route chain rather than
 * the menu tree — routes like admin/users/create don't map 1:1 to a menu
 * node, so route data is the more reliable source here.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly breadcrumbs = signal<Breadcrumb[]>([]);

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.breadcrumbs.set(this.build());
    });
  }

  private build(): Breadcrumb[] {
    const crumbs: Breadcrumb[] = [];
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let url = '';

    while (route) {
      const segment = route.url.map((s) => s.path).join('/');
      if (segment) url += `/${segment}`;

      const label = route.data['breadcrumb'];
      if (label) crumbs.push({ label, url });

      route = route.firstChild;
    }

    if (crumbs.length && crumbs[0].label !== 'Dashboard') {
      const homeUrl = HOME_ROUTE_BY_ROLE[this.auth.role()] ?? '/dashboard';
      crumbs.unshift({ label: 'Home', url: homeUrl });
    }

    return crumbs;
  }
}
