import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';

interface Project { name: string; progress: number; status: string; dueDate: string; color: string; }

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule, MatChipsModule],
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
export class DashboardComponent implements OnInit {
  readonly currentUser = signal<any>(null);
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

  ngOnInit(): void {
    const s = localStorage.getItem('pm_user') || localStorage.getItem('pm_user');
    if (s) try { this.currentUser.set(JSON.parse(s)); } catch { /**/ }
  }
}
