import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';
import { AuthService } from '../../services';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { NavigationService } from '../../core/navigation/navigation.service';
import { PROJECT_PROGRESS_CHART } from '../../shared/mock-data/dashboard-mock.data';

interface Project { name: string; progress: number; status: string; dueDate: string; color: string; }

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule, MatChipsModule,
    KpiCardComponent, ChartCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(60, animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly navigationService = inject(NavigationService);
  readonly currentUser = this.auth.user;

  readonly quickActions = computed(() =>
    this.navigationService.flatMenu().filter((item) => !!item.route).slice(0, 6),
  );

  readonly projectProgressChart = PROJECT_PROGRESS_CHART;

  readonly cards = [
    { label: 'My Projects',    value: 6,  icon: 'folder',   color: '#1976D2' },
    { label: 'Open Tasks',     value: 23, icon: 'task',     color: '#ED6C02' },
    { label: 'Completed Today',value: 4,  icon: 'task_alt', color: '#2E7D32' },
    { label: 'Overdue',        value: 2,  icon: 'warning',  color: '#D32F2F' },
  ];
  readonly projects: Project[] = [
    { name: 'Portal Redesign',    progress: 72, status: 'ON TRACK', dueDate: '2026-07-15', color: '#1976D2' },
    { name: 'Mobile App v2',      progress: 45, status: 'AT RISK',  dueDate: '2026-06-30', color: '#ED6C02' },
    { name: 'API Migration',      progress: 90, status: 'ON TRACK', dueDate: '2026-06-20', color: '#2E7D32' },
    { name: 'Data Warehouse ETL', progress: 20, status: 'DELAYED',  dueDate: '2026-08-01', color: '#D32F2F' },
  ];
  statusClass = (s: string) => ({ 'ON TRACK': 'active', 'AT RISK': 'warning', 'DELAYED': 'error' }[s] ?? 'info');
}
