import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';

interface Value      { icon: string; title: string; desc: string; color: string; bg: string; }
interface Leader     { initials: string; name: string; position: string; desc: string; color: string; }
interface TimelineEvent { year: string; title: string; desc: string; color: string; }
interface WhyCard    { icon: string; title: string; desc: string; color: string; }
interface StatItem   { icon: string; label: string; value: number; display: string; suffix: string; color: string; }

@Component({
  selector: 'app-about-us',
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatCardModule, MatDividerModule, MatChipsModule,
  ],
  templateUrl: './about-us.component.html',
  styleUrl:    './about-us.component.scss',
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
          stagger(70, animate('380ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class AboutUsComponent implements OnInit, OnDestroy {
  private statsTimer?: ReturnType<typeof setInterval>;
  animatedStats = signal<number[]>([0, 0, 0, 0, 0]);

  readonly values: Value[] = [
    { icon: 'lightbulb',      title: 'Innovation',             desc: 'Continuously evolving our platform with emerging technologies and industry feedback.', color: '#1565C0', bg: '#E3F2FD' },
    { icon: 'verified_user',  title: 'Integrity',              desc: 'Transparent partnerships built on honesty, trust and long-term commitment.', color: '#0F4C81', bg: '#E8EAF6' },
    { icon: 'workspace_premium', title: 'Quality',             desc: 'Uncompromising standards in our platform, our service and our outcomes.', color: '#2E7D32', bg: '#E8F5E9' },
    { icon: 'groups',         title: 'Collaboration',          desc: 'Deep partnership with clients, co-creating solutions for complex challenges.', color: '#546E7A', bg: '#ECEFF1' },
    { icon: 'emoji_events',   title: 'Customer Success',       desc: 'Every decision is guided by measurable outcomes for our customers.', color: '#ED6C02', bg: '#FFF3E0' },
    { icon: 'trending_up',    title: 'Continuous Improvement', desc: 'Iterating faster than the industry changes — always ahead of the curve.', color: '#D32F2F', bg: '#FFEBEE' },
  ];

  readonly leaders: Leader[] = [
    { initials: 'RK', name: 'Rajesh Kumar',    position: 'Chief Executive Officer',        desc: '25+ years in EPC and industrial construction project management across Asia, Middle East and Europe.', color: '#0F4C81' },
    { initials: 'SA', name: 'Shreya Agarwal',  position: 'Chief Technology Officer',       desc: 'Former SAP architect with 18 years building enterprise material management platforms.', color: '#1565C0' },
    { initials: 'DM', name: 'David Mehta',     position: 'VP - Product Engineering',       desc: 'Led digital transformation programs at 3 Fortune 500 EPC contractors globally.', color: '#2E7D32' },
    { initials: 'LT', name: 'Layla Thomas',    position: 'VP - Customer Success',          desc: 'Managed 50+ enterprise implementations across petrochemical and steel plant projects.', color: '#546E7A' },
    { initials: 'AJ', name: 'Ahmed Al-Jabri',  position: 'Head - Middle East Operations',  desc: '15 years delivering materials management solutions for GCC petrochemical projects.', color: '#ED6C02' },
    { initials: 'PL', name: 'Priya Lim',       position: 'Head - Asia Pacific',            desc: 'Deep expertise in manufacturing and power plant construction management systems.', color: '#D32F2F' },
  ];

  readonly timeline: TimelineEvent[] = [
    { year: '2014', title: 'Founded',              desc: 'Born from the pain of managing 3M material records across 12 sites on spreadsheets.',     color: '#0F4C81' },
    { year: '2016', title: 'First Enterprise Client', desc: 'Deployed for a $2B petrochemical plant in the Middle East with 500K+ material items.', color: '#1565C0' },
    { year: '2018', title: 'Warehouse Module',     desc: 'Launched full warehouse management with barcode integration and real-time tracking.',       color: '#2E7D32' },
    { year: '2020', title: 'ERP Integration Suite', desc: 'Native bidirectional connectors for SAP, Oracle and Maximo launched.',                    color: '#546E7A' },
    { year: '2022', title: '100 Clients Milestone', desc: 'Crossed 100 enterprise clients across 30 countries with 10M+ inventory transactions.',    color: '#ED6C02' },
    { year: '2024', title: 'AI-Powered Analytics', desc: 'Launched predictive procurement and material availability intelligence using ML.',           color: '#D32F2F' },
  ];

  readonly whyCards: WhyCard[] = [
    { icon: 'security',          title: 'Enterprise Grade Security', desc: 'SOC 2 Type II certified, ISO 27001 compliant with role-based access control.', color: '#0F4C81' },
    { icon: 'inventory_2',       title: 'Material Intelligence',     desc: 'Deepest material data model purpose-built for industrial construction.', color: '#1565C0' },
    { icon: 'visibility',        title: 'Real-Time Visibility',      desc: 'Live dashboards across every project, warehouse and procurement activity.', color: '#2E7D32' },
    { icon: 'engineering',       title: 'Industry Best Practices',   desc: 'Built on 10 years of EPC, petrochemical and manufacturing domain expertise.', color: '#546E7A' },
    { icon: 'hub',               title: 'ERP Integration',           desc: 'Pre-built connectors to SAP, Oracle, Maximo and 12+ enterprise systems.', color: '#ED6C02' },
    { icon: 'public',            title: 'Global Scalability',        desc: 'Multi-language, multi-currency, multi-timezone deployments across 50+ countries.', color: '#D32F2F' },
  ];

  readonly stats: StatItem[] = [
    { icon: 'business',       label: 'Enterprise Customers',      value: 100,       display: '100+',   suffix: '+',   color: '#1565C0' },
    { icon: 'folder_special', label: 'Projects Managed',          value: 500,       display: '500+',   suffix: '+',   color: '#0F4C81' },
    { icon: 'inventory_2',    label: 'Material Records',          value: 1000,      display: '1M+',    suffix: '',    color: '#2E7D32' },
    { icon: 'swap_horiz',     label: 'Inventory Transactions',    value: 10000,     display: '10M+',   suffix: '',    color: '#ED6C02' },
    { icon: 'verified',       label: 'System Availability',       value: 999,       display: '99.9%',  suffix: '%',   color: '#546E7A' },
  ];

  readonly industries = [
    { icon: 'science',              title: 'Chemical',       color: '#1565C0', count: '18+ clients' },
    { icon: 'local_fire_department', title: 'Petrochemical', color: '#0F4C81', count: '24+ clients' },
    { icon: 'precision_manufacturing', title: 'Manufacturing', color: '#2E7D32', count: '15+ clients' },
    { icon: 'domain',               title: 'Steel',          color: '#546E7A', count: '12+ clients' },
    { icon: 'bolt',                 title: 'Power',          color: '#FFC107', count: '10+ clients' },
    { icon: 'oil_barrel',           title: 'Oil & Gas',      color: '#D32F2F', count: '16+ clients' },
    { icon: 'engineering',          title: 'EPC',            color: '#ED6C02', count: '30+ clients' },
    { icon: 'construction',         title: 'Heavy Industrial', color: '#7B1FA2', count: '9+ clients' },
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
    if (idx === 4) return (val / 10).toFixed(1) + '%';
    if (idx === 2 || idx === 3) return val >= 1000 ? (val / 1000).toFixed(0) + 'M+' : val + '+';
    return val + '+';
  }
}
