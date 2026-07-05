import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  bg: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  priceLabel?: string;
  badge?: string;
  highlight: boolean;
  cta: string;
  ctaRoute: string;
  features: string[];
}

interface CompareRow {
  feature: string;
  starter: string | boolean;
  professional: string | boolean;
  enterprise: string | boolean;
}

interface Faq {
  question: string;
  answer: string;
}

interface IncludedFeature {
  icon: string;
  title: string;
  desc: string;
  color: string;
}

@Component({
  selector: 'app-pricing',
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatSlideToggleModule, MatTableModule, MatExpansionModule,
    MatChipsModule, MatTooltipModule, MatDividerModule,
  ],
  templateUrl: './pricing.component.html',
  styleUrl:    './pricing.component.scss',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(32px)' }),
        animate('500ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerList', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(24px)' }),
          stagger(80, animate('380ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class PricingComponent {
  yearly = signal(false);

  readonly plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      tagline: 'Perfect for small teams and pilot projects',
      icon: 'rocket_launch',
      color: '#546E7A',
      bg: '#ECEFF1',
      monthlyPrice: 99,
      yearlyPrice: 999,
      highlight: false,
      cta: 'Start Free Trial',
      ctaRoute: '/auth/register-organization',
      features: [
        'Up to 10 Users',
        'Up to 3 Projects',
        'Material Classification',
        'Material Attributes',
        'Basic Project Tracking',
        'Standard Reports',
        'Email Support',
        '5 GB Storage',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      tagline: 'For growing organizations with complex needs',
      icon: 'workspace_premium',
      color: '#1565C0',
      bg: '#E3F2FD',
      monthlyPrice: 299,
      yearlyPrice: 2999,
      badge: 'Most Popular',
      highlight: true,
      cta: 'Get Started',
      ctaRoute: '/auth/register-organization',
      features: [
        'Up to 100 Users',
        'Unlimited Projects',
        'Warehouse Management',
        'Inventory Tracking & Transfers',
        'Supplier Management & AVL',
        'QA/QC & Inspection Module',
        'Advanced Reporting & Dashboards',
        'API Access',
        'Priority Support',
        '100 GB Storage',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      tagline: 'For large-scale industrial organizations',
      icon: 'domain',
      color: '#0F4C81',
      bg: '#E8EAF6',
      monthlyPrice: null,
      yearlyPrice: null,
      priceLabel: 'Custom Pricing',
      highlight: false,
      cta: 'Contact Sales',
      ctaRoute: '/auth/register-organization',
      features: [
        'Unlimited Users',
        'Unlimited Projects & Sites',
        'ERP Integration (SAP/Oracle/Infor)',
        'CMMS Integration (Maximo)',
        'Advanced Analytics & BI',
        'Single Sign-On (SSO)',
        'Dedicated Customer Success Manager',
        'Custom Workflows & Configurations',
        'Multi-Site Deployment',
        'SLA-backed 24/7 Support',
        'Unlimited Storage',
        'On-Premise Option Available',
      ],
    },
  ];

  readonly compareColumns = ['feature', 'starter', 'professional', 'enterprise'];

  readonly compareRows: CompareRow[] = [
    { feature: 'Users',             starter: '10',        professional: '100',       enterprise: 'Unlimited' },
    { feature: 'Projects',          starter: '3',         professional: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Material Records',  starter: '50,000',    professional: '1,000,000', enterprise: 'Unlimited' },
    { feature: 'Warehouses',        starter: '1',         professional: '10',        enterprise: 'Unlimited' },
    { feature: 'Suppliers',         starter: '25',        professional: '500',       enterprise: 'Unlimited' },
    { feature: 'Inspections',       starter: false,       professional: true,        enterprise: true },
    { feature: 'Advanced Reports',  starter: false,       professional: true,        enterprise: true },
    { feature: 'ERP Integration',   starter: false,       professional: false,       enterprise: true },
    { feature: 'API Access',        starter: false,       professional: true,        enterprise: true },
    { feature: 'SSO / SAML',        starter: false,       professional: false,       enterprise: true },
    { feature: 'Dedicated Support', starter: false,       professional: false,       enterprise: true },
    { feature: 'Custom Workflows',  starter: false,       professional: false,       enterprise: true },
  ];

  readonly includedFeatures: IncludedFeature[] = [
    { icon: 'inventory_2',   title: 'Material Management',    desc: 'Full material master with classification and attributes.',   color: '#0F4C81' },
    { icon: 'warehouse',     title: 'Warehouse Management',   desc: 'Inventory tracking, GRN and stock transfers.',               color: '#1565C0' },
    { icon: 'groups',        title: 'Supplier Qualification', desc: 'AVL, vendor evaluation and performance scorecards.',          color: '#2E7D32' },
    { icon: 'verified',      title: 'Quality Control',        desc: 'Inspections, NCR management and compliance documents.',       color: '#546E7A' },
    { icon: 'engineering',   title: 'Project Execution',      desc: 'Work packages, construction progress and milestones.',        color: '#ED6C02' },
    { icon: 'analytics',     title: 'Analytics',              desc: 'KPI dashboards, trend analysis and custom reports.',          color: '#7B1FA2' },
    { icon: 'hub',           title: 'Integrations',           desc: 'ERP, CMMS, and REST API connectivity.',                      color: '#D32F2F' },
  ];

  readonly faqs: Faq[] = [
    { question: 'Can I upgrade my plan later?',            answer: 'Yes, you can upgrade at any time. The price difference is prorated for the remainder of your billing period. Upgrades take effect immediately.' },
    { question: 'Do you offer annual discounts?',          answer: 'Yes! Switching to annual billing saves you 20% compared to monthly billing. Enterprise customers can negotiate additional multi-year discounts.' },
    { question: 'Is training included?',                   answer: 'All plans include access to our knowledge base, video tutorials and onboarding guides. Professional and Enterprise plans include live onboarding sessions with our implementation team.' },
    { question: 'Do you support ERP integrations?',        answer: 'ERP integration (SAP, Oracle, Infor, Maximo) is available in the Enterprise plan. Professional plan users can access our REST API to build custom integrations.' },
    { question: 'Do you provide implementation services?', answer: 'Yes. Our professional services team offers full implementation, data migration, configuration and training services. Packages are scoped based on project complexity.' },
    { question: 'Is data migration available?',            answer: 'Yes. We provide structured data migration services including material master migration, supplier data, and historical transaction imports. Our team works with you to map and transform your existing data.' },
    { question: 'What is your data security posture?',     answer: 'We are SOC 2 Type II certified and ISO 27001 compliant. Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Role-based access control is enforced at every layer.' },
    { question: 'Is on-premise deployment available?',     answer: 'On-premise and private cloud deployments are available for Enterprise customers with specific data sovereignty or security requirements. Contact our sales team for details.' },
  ];

  readonly testimonials = [
    { initials: 'RK', name: 'Rajesh Kumar',   company: 'L&T ECC',          text: 'ROI in under 6 months. Material delays dropped 60%.', color: '#0F4C81' },
    { initials: 'AK', name: 'Ahmad Khalil',   company: 'SABIC',             text: '2M records managed seamlessly. Procurement 40% faster.', color: '#1565C0' },
    { initials: 'ST', name: 'Sarah Thompson', company: 'Bechtel',           text: 'QA audit prep went from weeks to hours. Excellent value.', color: '#2E7D32' },
  ];

  displayPrice(plan: Plan): string {
    if (plan.priceLabel) return plan.priceLabel;
    const price = this.yearly() ? plan.yearlyPrice : plan.monthlyPrice;
    return price !== null ? `$${price.toLocaleString()}` : 'Custom';
  }

  pricePeriod(plan: Plan): string {
    if (plan.priceLabel) return '';
    return this.yearly() ? '/year' : '/month';
  }

  isBoolean(val: any): boolean { return typeof val === 'boolean'; }
}
