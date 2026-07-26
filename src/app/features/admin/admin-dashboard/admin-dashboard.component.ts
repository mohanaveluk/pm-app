import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OrganizationService } from '../../../services/organization.service';
import { DashboardSummary } from '../../../models/pm.models';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';
import { AuthService } from '../../../services';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { ChartCardComponent } from '../../../shared/components/chart-card/chart-card.component';
import { NavigationService } from '../../../core/navigation/navigation.service';
import {
  MATERIAL_STATUS_CHART, PURCHASE_TREND_CHART, VENDOR_PERFORMANCE_CHART,
  PROJECT_PROGRESS_CHART, INVENTORY_LEVEL_CHART, QA_STATUS_CHART,
} from '../../../shared/mock-data/dashboard-mock.data';

interface Activity { icon: string; text: string; time: string; color: string; }
interface QuickStat { label: string; value: number; icon: string; color: string; change: string; }

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatChipsModule, MatDividerModule, MatTooltipModule,
    KpiCardComponent, ChartCardComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  animations: [
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(70, animate('350ms ease', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class AdminDashboardComponent implements OnInit {
  private readonly orgSvc = inject(OrganizationService);
  private readonly auth = inject(AuthService);
  private readonly navigationService = inject(NavigationService);

  readonly loading     = signal(true);
  readonly summary     = signal<DashboardSummary | null>(null);
  readonly currentUser = this.auth.user;

  readonly quickActions = computed(() =>
    this.navigationService.flatMenu().filter((item) => !!item.route).slice(0, 6),
  );

  readonly materialStatusChart = MATERIAL_STATUS_CHART;
  readonly purchaseTrendChart = PURCHASE_TREND_CHART;
  readonly vendorPerformanceChart = VENDOR_PERFORMANCE_CHART;
  readonly projectProgressChart = PROJECT_PROGRESS_CHART;
  readonly inventoryLevelChart = INVENTORY_LEVEL_CHART;
  readonly qaStatusChart = QA_STATUS_CHART;
  readonly barOptions = { responsive: true, maintainAspectRatio: false };

  readonly recentActivity: Activity[] = [
    { icon: 'person_add',  text: 'New user Sarah Johnson added',          time: '2 min ago',  color: '#1976D2' },
    { icon: 'assignment',  text: 'Project Alpha milestone completed',      time: '1 hr ago',   color: '#2E7D32' },
    { icon: 'security',    text: 'Role updated for James Rodriguez',       time: '3 hr ago',   color: '#ED6C02' },
    { icon: 'credit_card', text: 'Subscription renewed — Business Plan',  time: 'Yesterday',  color: '#42A5F5' },
    { icon: 'settings',    text: 'Organisation settings updated',          time: '2 days ago', color: '#5a7a9e' },
  ];

  readonly quickStats: QuickStat[] = [
    { label: 'Total Projects',  value: 24,  icon: 'folder',      color: '#1976D2', change: '+3 this month' },
    { label: 'Active Projects', value: 18,  icon: 'play_circle', color: '#2E7D32', change: '75% on track'  },
    { label: 'Open Tasks',      value: 147, icon: 'task',        color: '#ED6C02', change: '12 overdue'    },
    { label: 'Team Members',    value: 0,   icon: 'people',      color: '#42A5F5', change: 'dynamic'       },
  ];

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  ngOnInit(): void {
    this.loadSummary();
  }

  private async loadSummary(): Promise<void> {
    try {
      const data = await this.orgSvc.getDashboardSummary().toPromise();
      this.summary.set(data ?? null);
      if (data) {
        this.quickStats[3].value  = data.users.total;
        this.quickStats[3].change = `${data.users.maxAllowed - data.users.total} slots left`;
      }
    } catch { /**/ } finally { this.loading.set(false); }
  }

  get utilizationPercent(): number { return this.summary()?.users.utilizationPercent ?? 0; }
  get utilizationColor(): string {
    const p = this.utilizationPercent;
    if (p >= 90) return '#D32F2F';
    if (p >= 70) return '#ED6C02';
    return '#2E7D32';
  }
}
