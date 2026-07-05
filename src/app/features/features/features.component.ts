import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';

interface FeatureModule { icon: string; title: string; color: string; bg: string; features: string[]; }
interface Industry      { icon: string; title: string; desc: string; color: string; bg: string; }
interface Benefit       { icon: string; title: string; desc: string; color: string; }
interface Integration   { name: string; icon: string; category: string; color: string; }
interface KpiCard       { icon: string; label: string; value: string; pct: number; color: string; trend: string; }

@Component({
  selector: 'app-features',
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatCardModule, MatChipsModule,
    MatDividerModule, MatProgressBarModule, MatTooltipModule,
  ],
  templateUrl: './features.component.html',
  styleUrl:    './features.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(32px)' }),
        animate('500ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease', style({ opacity: 1 })),
      ]),
    ]),
    trigger('staggerList', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(24px)' }),
          stagger(65, animate('380ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class FeaturesComponent implements OnInit, OnDestroy {
  private statsTimer?: ReturnType<typeof setInterval>;
  animatedStats = signal<number[]>([0, 0, 0, 0]);

  readonly featureModules: FeatureModule[] = [
    {
      icon: 'inventory_2', title: 'Material Management', color: '#0F4C81', bg: '#E8EAF6',
      features: ['Material Classification', 'Technical Attributes', 'Commercial Attributes', 'Material Master Data', 'Material Traceability'],
    },
    {
      icon: 'shopping_cart', title: 'Procurement Management', color: '#1565C0', bg: '#E3F2FD',
      features: ['Purchase Requests', 'Purchase Orders', 'Vendor Collaboration', 'Procurement Tracking', 'Contract Management'],
    },
    {
      icon: 'warehouse', title: 'Warehouse & Inventory', color: '#2E7D32', bg: '#E8F5E9',
      features: ['Material Receiving', 'Inventory Control', 'Stock Transfers', 'Material Reservations', 'Barcode Tracking'],
    },
    {
      icon: 'verified', title: 'QA/QC & Inspection', color: '#1976D2', bg: '#E3F2FD',
      features: ['Inspection Requests', 'Material Inspection', 'Vendor Inspection', 'Quality Documents', 'NCR Management'],
    },
    {
      icon: 'groups', title: 'Supplier Qualification', color: '#546E7A', bg: '#ECEFF1',
      features: ['Vendor Evaluation', 'Supplier Audits', 'Qualification Matrix', 'Approved Vendor List', 'Performance Scorecards'],
    },
    {
      icon: 'engineering', title: 'Project Execution', color: '#ED6C02', bg: '#FFF3E0',
      features: ['Work Packages', 'Construction Tracking', 'Progress Monitoring', 'Resource Planning', 'Milestone Management'],
    },
    {
      icon: 'hub', title: 'ERP Integration', color: '#7B1FA2', bg: '#F3E5F5',
      features: ['SAP Integration', 'Oracle Integration', 'Dynamics Integration', 'Maximo Integration', 'REST API Gateway'],
    },
    {
      icon: 'build_circle', title: 'Lifecycle & Maintenance', color: '#D32F2F', bg: '#FFEBEE',
      features: ['Asset Management', 'Equipment History', 'Preventive Maintenance', 'Maintenance Planning', 'Work Orders'],
    },
  ];

  readonly industries: Industry[] = [
    { icon: 'science',          title: 'Chemical Plants',    desc: 'Process plant construction, piping, instrumentation and safety systems management.', color: '#1565C0', bg: '#E3F2FD' },
    { icon: 'local_fire_department', title: 'Petrochemical', desc: 'Upstream, midstream and downstream petrochemical facility execution.', color: '#0F4C81', bg: '#E8EAF6' },
    { icon: 'engineering',      title: 'EPC Projects',       desc: 'End-to-end turnkey engineering, procurement and construction management.', color: '#2E7D32', bg: '#E8F5E9' },
    { icon: 'precision_manufacturing', title: 'Steel Plants', desc: 'Blast furnace, rolling mill and steel processing construction.', color: '#546E7A', bg: '#ECEFF1' },
    { icon: 'construction',     title: 'Heavy Industrial',   desc: 'Heavy lifts, module fabrication and mega-project logistics control.', color: '#ED6C02', bg: '#FFF3E0' },
    { icon: 'precision_manufacturing', title: 'Manufacturing', desc: 'Greenfield and brownfield manufacturing facility construction.', color: '#1976D2', bg: '#E3F2FD' },
    { icon: 'oil_barrel',       title: 'Oil & Gas',          desc: 'Onshore/offshore exploration, pipeline and processing facility management.', color: '#D32F2F', bg: '#FFEBEE' },
    { icon: 'bolt',             title: 'Power Generation',   desc: 'Thermal, hydro, nuclear and renewable energy plant construction.', color: '#FFC107', bg: '#FFFDE7' },
  ];

  readonly benefits: Benefit[] = [
    { icon: 'hub',              title: 'Single Source of Truth',        desc: 'Eliminate data silos with a unified platform for all project data.', color: '#0F4C81' },
    { icon: 'track_changes',    title: 'End-to-End Traceability',       desc: 'Full audit trail from mill certificate to installation point.', color: '#1565C0' },
    { icon: 'schedule',         title: 'Reduced Project Delays',        desc: 'Proactive material availability alerts prevent construction stoppages.', color: '#2E7D32' },
    { icon: 'verified_user',    title: 'Improved Quality Compliance',   desc: 'Automated quality workflows and document control.', color: '#1976D2' },
    { icon: 'speed',            title: 'Faster Procurement',            desc: 'Streamlined RFQ-to-PO cycle with vendor portal collaboration.', color: '#546E7A' },
    { icon: 'inventory_2',      title: 'Optimized Inventory',           desc: 'Reduce carrying costs and eliminate excess or obsolete stock.', color: '#ED6C02' },
    { icon: 'handshake',        title: 'Supplier Collaboration',        desc: 'Digital supplier portal for documents, status and performance.', color: '#7B1FA2' },
    { icon: 'analytics',        title: 'Real-Time Analytics',           desc: 'Executive KPI dashboards with drill-down for every project.', color: '#D32F2F' },
  ];

  readonly integrations: Integration[] = [
    { name: 'SAP',              icon: 'integration_instructions', category: 'ERP',        color: '#0F4C81' },
    { name: 'Oracle EBS',       icon: 'integration_instructions', category: 'ERP',        color: '#D32F2F' },
    { name: 'IBM Maximo',       icon: 'settings_suggest',         category: 'CMMS',       color: '#1565C0' },
    { name: 'Infor LN',         icon: 'integration_instructions', category: 'ERP',        color: '#2E7D32' },
    { name: 'MS Dynamics',      icon: 'integration_instructions', category: 'ERP',        color: '#7B1FA2' },
    { name: 'Primavera P6',     icon: 'timeline',                 category: 'Scheduling', color: '#ED6C02' },
    { name: 'SharePoint',       icon: 'folder_shared',            category: 'Documents',  color: '#0078D4' },
    { name: 'REST APIs',        icon: 'api',                      category: 'Custom',     color: '#546E7A' },
  ];

  readonly kpiCards: KpiCard[] = [
    { icon: 'construction',  label: 'Project Progress',      value: '73%',  pct: 73,  color: '#1565C0', trend: '+4.2%' },
    { icon: 'inventory_2',   label: 'Inventory Value',       value: '$42M', pct: 68,  color: '#2E7D32', trend: '+2.1%' },
    { icon: 'verified',      label: 'Inspection Status',     value: '88%',  pct: 88,  color: '#0F4C81', trend: '+6.5%' },
    { icon: 'shopping_cart', label: 'Procurement Status',    value: '82%',  pct: 82,  color: '#ED6C02', trend: '+3.8%' },
    { icon: 'handshake',     label: 'Supplier Performance',  value: '94%',  pct: 94,  color: '#546E7A', trend: '+1.2%' },
    { icon: 'warehouse',     label: 'Warehouse Utilization', value: '64%',  pct: 64,  color: '#FFC107', trend: '-2.4%' },
  ];

  readonly stats = [
    { icon: 'folder_special', label: 'Projects Delivered',  value: 500,    display: '500+',  color: '#1565C0' },
    { icon: 'inventory_2',    label: 'Material Records',     value: 1000,   display: '1M+',   color: '#0F4C81' },
    { icon: 'business',       label: 'Enterprise Clients',   value: 100,    display: '100+',  color: '#2E7D32' },
    { icon: 'swap_horiz',     label: 'Inventory Txns',       value: 10000,  display: '10M+',  color: '#ED6C02' },
  ];

  ngOnInit(): void {
    setTimeout(() => this.animateCounters(), 600);
  }
  ngOnDestroy(): void { if (this.statsTimer) clearInterval(this.statsTimer); }

  private animateCounters(): void {
    const targets = this.stats.map(s => s.value);
    const steps = 55; let step = 0;
    this.statsTimer = setInterval(() => {
      step++;
      const e = 1 - Math.pow(1 - step / steps, 3);
      this.animatedStats.set(targets.map(t => Math.round(t * e)));
      if (step >= steps) clearInterval(this.statsTimer);
    }, 2000 / steps);
  }

  formatStat(val: number, idx: number): string {
    if (idx === 1) return val >= 1000 ? (val / 1000).toFixed(0) + 'M+' : val + '+';
    if (idx === 3) return val >= 1000 ? (val / 1000).toFixed(0) + 'K+' : val + '+';
    return val + '+';
  }
}
