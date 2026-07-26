import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

/**
 * Single reusable placeholder for ERP domain routes that are wired into the
 * navigation/RBAC model but don't have a real feature page yet. Swapping in
 * a real page later is a one-line `loadComponent` change in app.routes.ts —
 * no shell/menu/guard changes needed.
 */
@Component({
  selector: 'app-feature-coming-soon',
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatCardModule],
  templateUrl: './feature-coming-soon.component.html',
  styleUrl: './feature-coming-soon.component.scss',
})
export class FeatureComingSoonComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly data = toSignal(
    this.route.data.pipe(map((d) => d)),
    { initialValue: this.route.snapshot.data },
  );

  readonly title = computed(() => this.data()['title'] ?? 'Coming Soon');
  readonly icon = computed(() => this.data()['icon'] ?? 'construction');
  readonly description = computed(
    () => this.data()['description'] ?? 'This module is part of the ERP roadmap and is not available yet.',
  );
}
