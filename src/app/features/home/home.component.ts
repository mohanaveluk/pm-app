import { Component, signal, OnInit, OnDestroy, HostListener, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, style, animate, transition, query, stagger, state } from '@angular/animations';

interface HeroSlide   { title: string; subtitle: string; tag: string; icon: string; gradient: string; }
interface Industry    { icon: string; title: string; desc: string; color: string; bg: string; }
interface MatType     { icon: string; title: string; desc: string; stat: string; color: string; }
interface Capability  { icon: string; title: string; desc: string; }
interface LifecycleStage { icon: string; label: string; desc: string; color: string; }
interface WhyCard     { icon: string; title: string; desc: string; color: string; }
interface Stat        { label: string; value: number; suffix: string; icon: string; color: string; display: string; }
interface Testimonial { name: string; company: string; role: string; text: string; initials: string; color: string; }
interface Integration { name: string; icon: string; category: string; }
interface KpiWidget   { label: string; value: string; unit: string; pct: number; color: string; icon: string; }

@Component({
  selector: 'app-home',
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatCardModule, MatChipsModule,
    MatToolbarModule, MatMenuModule, MatDividerModule,
    MatProgressBarModule, MatTabsModule, MatTooltipModule,
  ],
  templateUrl: './home.component.html',
  styleUrl:    './home.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(36px)' }),
        animate('520ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' })),
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
    trigger('slideHero', [
      state('in',  style({ opacity: 1, transform: 'translateY(0)' })),
      state('out', style({ opacity: 0, transform: 'translateY(20px)' })),
      transition('out => in', animate('500ms ease')),
      transition('in => out', animate('300ms ease')),
    ]),
  ],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly cd = inject(ChangeDetectorRef);
  private slideTimer?: ReturnType<typeof setInterval>;
  private statsTimer?: ReturnType<typeof setInterval>;
  private testimonialTimer?: ReturnType<typeof setInterval>;

  currentSlide      = signal(0);
  currentTestimonial = signal(0);
  animatedStats     = signal<number[]>([0, 0, 0, 0, 0, 0]);
  scrolled          = signal(false);
  menuOpen          = signal(false);

  readonly heroSlides: HeroSlide[] = [
    {
      title: 'Industrial Construction Management',
      subtitle: 'Digitize EPC, Petrochemical and Heavy Industrial Projects with end-to-end digital transformation.',
      tag: 'EPC Projects',
      icon: 'factory',
      gradient: 'linear-gradient(135deg, #0F4C81 0%, #1565C0 60%, #0B2E59 100%)',
    },
    {
      title: 'Material Intelligence Platform',
      subtitle: 'Manage millions of material records across chemical plants, steel mills and power generation facilities.',
      tag: 'Material Management',
      icon: 'inventory_2',
      gradient: 'linear-gradient(135deg, #1B2838 0%, #0F4C81 60%, #1565C0 100%)',
    },
    {
      title: 'Warehouse & Inventory Excellence',
      subtitle: 'Track every material from procurement to installation with full traceability and real-time visibility.',
      tag: 'Warehouse Ops',
      icon: 'warehouse',
      gradient: 'linear-gradient(135deg, #0B2E59 0%, #1565C0 50%, #42A5F5 100%)',
    },
    {
      title: 'Quality, Inspection & Compliance',
      subtitle: 'Complete traceability across the project lifecycle with NCR management and audit-ready documentation.',
      tag: 'QA/QC',
      icon: 'verified',
      gradient: 'linear-gradient(135deg, #0F4C81 0%, #546E7A 60%, #1565C0 100%)',
    },
  ];

  readonly industries: Industry[] = [
    { icon: 'science',         title: 'Chemical Plants',           desc: 'Process plant construction, piping, instrumentation and safety systems.', color: '#1565C0', bg: '#E3F2FD' },
    { icon: 'local_fire_department', title: 'Petrochemical Plants', desc: 'Upstream, midstream and downstream petrochemical facility management.', color: '#0F4C81', bg: '#E8EAF6' },
    { icon: 'engineering',     title: 'EPC Projects',              desc: 'Engineering, Procurement and Construction turnkey project execution.', color: '#2E7D32', bg: '#E8F5E9' },
    { icon: 'precision_manufacturing', title: 'Steel Plants',      desc: 'Blast furnace, rolling mill and steel processing plant construction.', color: '#546E7A', bg: '#ECEFF1' },
    { icon: 'construction',    title: 'Heavy Industrial',          desc: 'Heavy lifts, module fabrication and mega-project logistics.', color: '#ED6C02', bg: '#FFF3E0' },
    { icon: 'bolt',            title: 'Power Generation',          desc: 'Thermal, hydro, nuclear and renewable energy plant construction.', color: '#FFC107', bg: '#FFFDE7' },
    { icon: 'precision_manufacturing', title: 'Manufacturing',     desc: 'Greenfield and brownfield manufacturing facility construction.', color: '#1976D2', bg: '#E3F2FD' },
    { icon: 'oil_barrel',      title: 'Oil & Gas',                 desc: 'Onshore/offshore exploration, pipeline and processing facilities.', color: '#D32F2F', bg: '#FFEBEE' },
  ];

  readonly materialTypes: MatType[] = [
    { icon: 'domain',          title: 'Steel Material',        desc: 'Structural steel, beams, plates and profiles.', stat: '1.2M+ Records', color: '#546E7A' },
    { icon: 'plumbing',        title: 'Pipe Material',         desc: 'CS, SS and alloy pipes with full specifications.', stat: '800K+ Items',  color: '#1565C0' },
    { icon: 'settings',        title: 'Valves',                desc: 'Gate, globe, ball and control valves.', stat: '450K+ Records', color: '#0F4C81' },
    { icon: 'electrical_services', title: 'Electrical',        desc: 'Switchgear, cables, transformers and panels.', stat: '600K+ Items',  color: '#ED6C02' },
    { icon: 'sensors',         title: 'Instrumentation',       desc: 'Flow, pressure, temperature and level instruments.', stat: '380K+ Records', color: '#2E7D32' },
    { icon: 'category',        title: 'Rubber & Gaskets',      desc: 'Expansion joints, gaskets and sealing materials.', stat: '120K+ Items',  color: '#D32F2F' },
    { icon: 'precision_manufacturing', title: 'Mechanical Equip.', desc: 'Pumps, compressors, heat exchangers and vessels.', stat: '95K+ Records', color: '#1976D2' },
    { icon: 'account_tree',    title: 'Structural Components', desc: 'Gratings, handrails, ladders and supports.', stat: '310K+ Items',  color: '#546E7A' },
    { icon: 'cable',           title: 'Cables & Trays',        desc: 'Power, control and instrumentation cables.', stat: '920K+ Records', color: '#FFC107' },
    { icon: 'join_full',       title: 'Fittings',              desc: 'Elbows, tees, reducers and flanges.', stat: '1.5M+ Items',  color: '#0F4C81' },
    { icon: 'warehouse',       title: 'Warehouse Inventory',   desc: 'Real-time stock with location tracking.', stat: '5M+ Txns',     color: '#2E7D32' },
    { icon: 'build_circle',    title: 'Spare Parts',           desc: 'Critical spares with reorder management.', stat: '200K+ Records', color: '#ED6C02' },
  ];

  readonly capabilities: Capability[] = [
    { icon: 'category',         title: 'Material Classification',    desc: 'UNSPSC, proprietary and custom classification frameworks.' },
    { icon: 'tune',             title: 'Technical Attributes',       desc: 'Configurable attribute templates per material class.' },
    { icon: 'attach_money',     title: 'Commercial Attributes',      desc: 'Pricing, lead times, MOQ and vendor catalogs.' },
    { icon: 'verified_user',    title: 'Quality & Compliance',       desc: 'Mill certificates, PMI, test reports and standards.' },
    { icon: 'construction',     title: 'Project Execution',          desc: 'MR, MTO, MIR and material allocation tracking.' },
    { icon: 'handshake',        title: 'Supplier Qualification',     desc: 'AVL management, audits and qualification matrix.' },
    { icon: 'fact_check',       title: 'Inspection & Traceability',  desc: 'Heat number, serial number and batch tracking.' },
    { icon: 'integration_instructions', title: 'ERP Integration',   desc: 'Bidirectional sync with SAP, Oracle and Infor.' },
    { icon: 'settings_suggest', title: 'CMMS Integration',          desc: 'Maximo, IBM and asset management connectivity.' },
    { icon: 'local_shipping',   title: 'Inventory & Logistics',      desc: 'Multi-warehouse, transfers and dispatch management.' },
    { icon: 'timeline',         title: 'Lifecycle Management',       desc: 'From requisition through commissioning and handover.' },
    { icon: 'build',            title: 'Maintenance Management',     desc: 'Preventive maintenance schedules and work orders.' },
  ];

  readonly lifecycle: LifecycleStage[] = [
    { icon: 'architecture',    label: 'Engineering Design',    desc: 'P&ID, PFD and basic engineering',            color: '#0F4C81' },
    { icon: 'shopping_cart',   label: 'Procurement',          desc: 'RFQ, PO and vendor management',              color: '#1565C0' },
    { icon: 'inventory',       label: 'Warehouse Receipt',    desc: 'GRN, inspection and storage',                color: '#1976D2' },
    { icon: 'fact_check',      label: 'Quality Inspection',   desc: 'ITP, FAT/SAT and certifications',            color: '#2E7D32' },
    { icon: 'category',        label: 'Material Allocation',  desc: 'MIR, reservation and issue',                 color: '#546E7A' },
    { icon: 'construction',    label: 'Construction',         desc: 'Field execution and progress tracking',      color: '#ED6C02' },
    { icon: 'settings',        label: 'Commissioning',        desc: 'Pre-comm, punch lists and startup',          color: '#FFC107' },
    { icon: 'assignment_turned_in', label: 'Asset Handover',  desc: 'As-built docs and asset registration',      color: '#2E7D32' },
  ];

  readonly whyCards: WhyCard[] = [
    { icon: 'hub',              title: 'Single Source of Truth',      desc: 'Unified material master eliminating data silos across projects.', color: '#0F4C81' },
    { icon: 'track_changes',    title: 'Material Traceability',       desc: 'Full heat-number to installation point audit trail.', color: '#1565C0' },
    { icon: 'visibility',       title: 'Project Visibility',          desc: 'Real-time dashboards for every project stakeholder.', color: '#2E7D32' },
    { icon: 'verified_user',    title: 'Quality Compliance',          desc: 'Ensure standards conformance with automated QA workflows.', color: '#1976D2' },
    { icon: 'handshake',        title: 'Supplier Collaboration',      desc: 'Portal access for vendors to submit documents and status.', color: '#546E7A' },
    { icon: 'inventory_2',      title: 'Inventory Optimization',      desc: 'Reduce excess stock and prevent construction delays.', color: '#ED6C02' },
    { icon: 'savings',          title: 'Reduced Costs',               desc: '15–30% reduction in material handling and procurement cost.', color: '#2E7D32' },
    { icon: 'speed',            title: 'Improved Productivity',       desc: 'Automate approvals, alerts and routine reporting tasks.', color: '#D32F2F' },
  ];

  readonly stats: Stat[] = [
    { label: 'Projects Managed',        value: 500,       suffix: '+',   icon: 'folder_special',  color: '#1565C0', display: '500+' },
    { label: 'Material Records',         value: 1000000,   suffix: '',    icon: 'inventory_2',     color: '#0F4C81', display: '1M+' },
    { label: 'Industrial Clients',       value: 100,       suffix: '+',   icon: 'business',        color: '#2E7D32', display: '100+' },
    { label: 'Countries',               value: 50,        suffix: '+',   icon: 'public',          color: '#546E7A', display: '50+' },
    { label: 'Inventory Transactions',   value: 10000000,  suffix: '',    icon: 'swap_horiz',      color: '#ED6C02', display: '10M+' },
    { label: 'Data Accuracy',           value: 999,       suffix: '%',   icon: 'verified',        color: '#FFC107', display: '99.9%' },
  ];

  readonly testimonials: Testimonial[] = [
    { name: 'Rajesh Kumar',    company: 'Larsen & Toubro ECC',     role: 'Project Director',        text: 'This platform transformed our material management across 12 concurrent EPC projects. We reduced material-related delays by 60% and our warehouse team operates with near-zero manual errors.', initials: 'RK', color: '#0F4C81' },
    { name: 'Dr. Ahmad Khalil', company: 'SABIC',                  role: 'VP Engineering',          text: 'Managing over 2 million material records for our petrochemical expansion was a nightmare. Now our engineers have instant access to specifications, certifications and availability across all sites.', initials: 'AK', color: '#1565C0' },
    { name: 'Sarah Thompson',  company: 'Bechtel Corporation',     role: 'Quality Manager',         text: 'The QA/QC module with full traceability from mill to installation is exactly what large EPC projects need. Audit preparation that took weeks now takes hours.', initials: 'ST', color: '#2E7D32' },
    { name: 'Carlos Mendez',   company: 'Petrobras Engineering',   role: 'Materials Manager',       text: 'Supplier collaboration and vendor qualification management is outstanding. Our AVL process is fully digitized and procurement cycles are 40% faster.', initials: 'CM', color: '#546E7A' },
  ];

  readonly integrations: Integration[] = [
    { name: 'SAP',          icon: 'integration_instructions', category: 'ERP' },
    { name: 'Oracle',       icon: 'integration_instructions', category: 'ERP' },
    { name: 'Maximo',       icon: 'settings_suggest',         category: 'CMMS' },
    { name: 'Infor',        icon: 'integration_instructions', category: 'ERP' },
    { name: 'MS Dynamics',  icon: 'integration_instructions', category: 'ERP' },
    { name: 'IBM TRIRIGA',  icon: 'settings_suggest',         category: 'CMMS' },
    { name: 'Aveva',        icon: 'engineering',              category: 'Engineering' },
    { name: 'Primavera P6', icon: 'timeline',                 category: 'Project Mgmt' },
  ];

  readonly kpiWidgets: KpiWidget[] = [
    { label: 'Project Progress',       value: '73',  unit: '%',  pct: 73,  color: '#1565C0', icon: 'construction' },
    { label: 'Material Availability',  value: '91',  unit: '%',  pct: 91,  color: '#2E7D32', icon: 'inventory_2' },
    { label: 'Inspection Cleared',     value: '88',  unit: '%',  pct: 88,  color: '#0F4C81', icon: 'verified' },
    { label: 'Warehouse Capacity',     value: '64',  unit: '%',  pct: 64,  color: '#ED6C02', icon: 'warehouse' },
    { label: 'Procurement Status',     value: '82',  unit: '%',  pct: 82,  color: '#546E7A', icon: 'shopping_cart' },
    { label: 'Supplier Performance',   value: '94',  unit: '%',  pct: 94,  color: '#FFC107', icon: 'handshake' },
  ];

  ngOnInit(): void {
    this.slideTimer = setInterval(() => {
      this.currentSlide.update(s => (s + 1) % this.heroSlides.length);
    }, 5000);

    this.testimonialTimer = setInterval(() => {
      this.currentTestimonial.update(t => (t + 1) % this.testimonials.length);
    }, 5000);

    setTimeout(() => this.animateCounters(), 800);
  }

  ngOnDestroy(): void {
    if (this.slideTimer)      clearInterval(this.slideTimer);
    if (this.statsTimer)      clearInterval(this.statsTimer);
    if (this.testimonialTimer) clearInterval(this.testimonialTimer);
  }

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled.set(window.scrollY > 40); }

  goToSlide(i: number): void { this.currentSlide.set(i); }
  goToTestimonial(i: number): void { this.currentTestimonial.set(i); }

  private animateCounters(): void {
    const targets = [500, 1000000, 100, 50, 10000000, 999];
    const duration = 2200;
    const steps = 60;
    let step = 0;
    this.statsTimer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      this.animatedStats.set(targets.map(t => Math.round(t * eased)));
      if (step >= steps) clearInterval(this.statsTimer);
    }, duration / steps);
  }

  formatStat(val: number, idx: number): string {
    const displays = ['500+', '1M+', '100+', '50+', '10M+', '99.9%'];
    const fracs = [500, 100, 10, 5, 1000000, 99.9];
    if (idx === 5) return (val / 10).toFixed(1) + '%';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M+';
    if (val >= 1_000)     return (val / 1_000).toFixed(0) + 'K+';
    return val + '+';
  }
}
