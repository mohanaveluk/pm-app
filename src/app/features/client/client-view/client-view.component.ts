import { ChangeDetectionStrategy, Component, OnInit, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { countryName } from '../../../shared/reference/countries';
import { ClientService } from '../services/client.service';
import {
  AUDIT_FIELD_LABELS, Client, ClientAddressType, ClientAuditAction, ClientAuditEntry,
  ClientStatus, LANGUAGE_OPTIONS, clientLabel,
} from '../models/client.model';
import {
  ClientDeactivateDialogComponent, ClientDeactivateDialogData, ClientDeactivateDialogResult,
} from '../components/client-deactivate-dialog/client-deactivate-dialog.component';

interface ViewField {
  label: string;
  value: string;
  full?: boolean;
  /** Rendered as a link when set. */
  href?: string;
}

/** Read-only, tabbed presentation of a Client. */
@Component({
  selector: 'app-client-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule,
    MatTabsModule, MatProgressSpinnerModule,
  ],
  templateUrl: './client-view.component.html',
  styleUrl: './client-view.component.scss',
})
export class ClientViewComponent implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly PERMISSIONS = PERMISSIONS;
  protected readonly ClientStatus = ClientStatus;

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly client = signal<Client | null>(null);
  protected readonly saving = signal(false);

  protected readonly audit = signal<ClientAuditEntry[]>([]);
  protected readonly auditLoading = signal(false);
  protected readonly auditError = signal('');

  // ── Section data ────────────────────────────────────────────────────

  protected readonly overviewFields = computed<ViewField[]>(() => {
    const c = this.client();
    if (!c) return [];
    const website = c.website
      ? { value: c.website, href: /^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}` }
      : { value: '', href: undefined };

    return this.present([
      { label: 'Client Code', value: c.code },
      { label: 'Client Name', value: c.clientName },
      { label: 'Display Name', value: c.displayName ?? '' },
      { label: 'Client Type', value: c.clientTypeName ?? '' },
      { label: 'Industry Category', value: c.industryCategoryName ?? '' },
      { label: 'Parent Client', value: c.parentClientName ?? '' },
      { label: 'Country of Registration', value: c.countryCode ? countryName(c.countryCode) : '' },
      { label: 'Website', value: website.value, href: website.href },
      { label: 'Description', value: c.description ?? '', full: true },
      { label: 'Notes', value: c.notes ?? '', full: true },
    ]);
  });

  protected readonly registeredAddress = computed(
    () => this.client()?.addresses.find((a) => a.addressType === ClientAddressType.REGISTERED) ?? null,
  );

  protected readonly operationalAddresses = computed(
    () => this.client()?.addresses.filter((a) => a.addressType === ClientAddressType.OPERATIONAL) ?? [],
  );

  protected readonly regionalFields = computed<ViewField[]>(() => {
    const c = this.client();
    if (!c) return [];
    const language = LANGUAGE_OPTIONS.find((l) => l.value === c.preferredLanguage)?.label ?? c.preferredLanguage ?? '';
    return this.present([
      { label: 'Time Zone', value: c.timeZone ?? '' },
      { label: 'Preferred Language', value: language },
    ]);
  });

  protected readonly commercialFields = computed<ViewField[]>(() => {
    const m = this.client()?.commercial;
    if (!m) return [];
    return this.present([
      { label: 'Legal Entity Name', value: m.legalEntityName ?? '' },
      { label: 'Legal Entity Type', value: m.legalEntityType ? clientLabel(m.legalEntityType) : '' },
      { label: 'Contracting Entity', value: m.contractingEntityName ?? '' },
      { label: 'Registration Number', value: m.registrationNumber ?? '' },
      { label: 'Tax / VAT / GST Number', value: m.taxRegistrationNumber ?? '' },
      { label: 'D-U-N-S / External Business ID', value: m.externalBusinessId ?? '' },
      { label: 'Applicable Tax Region', value: m.taxRegion ?? '' },
      { label: 'Default Currency', value: m.defaultCurrencyCode ?? '' },
      { label: 'Payment Terms', value: m.defaultPaymentTerms ? clientLabel(m.defaultPaymentTerms) : '' },
      { label: 'Default Incoterms', value: m.defaultIncoterms ? clientLabel(m.defaultIncoterms) : '' },
      { label: 'Preferred Date Format', value: m.dateFormat ?? '' },
      { label: 'Contract Reference Format', value: m.contractReferenceFormat ?? '' },
      { label: 'Purchase Order Reference Format', value: m.purchaseOrderReferenceFormat ?? '' },
    ]);
  });

  protected readonly defaultsFields = computed<ViewField[]>(() => {
    const d = this.client()?.projectDefaults;
    if (!d) return [];
    return this.present([
      { label: 'Default Project Type', value: d.defaultProjectTypeName ?? '' },
      { label: 'Default Project Currency', value: d.defaultProjectCurrencyCode ?? '' },
      { label: 'Measurement System', value: d.measurementSystem ? clientLabel(d.measurementSystem) : '' },
      { label: 'Document Numbering Scheme', value: d.documentNumberingScheme ?? '' },
      { label: 'Default WBS Template', value: d.defaultWbsTemplate ?? '' },
      { label: 'Default Cost Code Scheme', value: d.defaultCostCodeScheme ?? '' },
      { label: 'Default Approval Workflow', value: d.defaultApprovalWorkflow ?? '' },
      { label: 'Default Procurement Terms', value: d.defaultProcurementTerms ?? '' },
      {
        label: 'Document Portal',
        value: d.documentPortalUrl ?? '',
        href: d.documentPortalUrl
          ? (/^https?:\/\//i.test(d.documentPortalUrl) ? d.documentPortalUrl : `https://${d.documentPortalUrl}`)
          : undefined,
      },
      { label: 'Requires Client Approval', value: d.requiresClientApproval ? 'Yes' : 'No' },
      { label: 'Client Document Control Required', value: d.requiresDocumentControl ? 'Yes' : 'No' },
    ]);
  });

  protected readonly lifecycleFields = computed<ViewField[]>(() => {
    const c = this.client();
    if (!c) return [];
    const medium = (value: string | null) => (value ? new Date(value).toLocaleString() : '');
    return this.present([
      { label: 'Created By', value: c.createdBy ?? '' },
      { label: 'Created At', value: medium(c.createdAt) },
      { label: 'Updated By', value: c.updatedBy ?? '' },
      { label: 'Updated At', value: medium(c.updatedAt) },
      { label: 'Version', value: String(c.version) },
      { label: 'Deactivated By', value: c.deactivatedBy ?? '' },
      { label: 'Deactivated At', value: medium(c.deactivatedAt) },
      { label: 'Deactivation Reason', value: c.deactivationReason ?? '', full: true },
    ]);
  });

  /** Empty values are dropped so the cards stay readable. */
  private present(fields: ViewField[]): ViewField[] {
    return fields.filter((f) => f.value && f.value !== '—');
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.clientService.getClientById(id));
      this.client.set(res.data);
      void this.loadAudit(id);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.loadError.set(
        httpErr?.status === 404
          ? 'This client could not be found. It may have been deleted.'
          : 'Unable to load the client. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAudit(id: string): Promise<void> {
    this.auditLoading.set(true);
    this.auditError.set('');
    try {
      const res = await lastValueFrom(this.clientService.getAuditHistory(id));
      this.audit.set(res.data ?? []);
    } catch {
      this.auditError.set('The change history could not be loaded.');
    } finally {
      this.auditLoading.set(false);
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  edit(): void {
    const id = this.client()?.id;
    if (id) void this.router.navigate(['/admin/clients', id, 'edit']);
  }

  backToList(): void {
    void this.router.navigate(['/admin/clients']);
  }

  /** Opens the Project Master filtered to this client's projects. */
  viewProjects(): void {
    const id = this.client()?.id;
    if (id) void this.router.navigate(['/projects'], { queryParams: { clientId: id } });
  }

  openUrl(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  async activate(): Promise<void> {
    const c = this.client();
    if (!c || this.saving()) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: {
        title: 'Activate Client?',
        message: `Make "${c.clientName}" (${c.code}) available for new projects again?`,
        confirmText: 'Activate',
        color: 'primary' as const,
        icon: 'toggle_on',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) return;

    await this.changeStatus(() => this.clientService.activateClient(c.id), 'Client activated');
  }

  async deactivate(): Promise<void> {
    const c = this.client();
    if (!c || this.saving()) return;

    const ref = this.dialog.open<
      ClientDeactivateDialogComponent, ClientDeactivateDialogData, ClientDeactivateDialogResult
    >(ClientDeactivateDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      viewContainerRef: this.viewContainerRef,
      data: { code: c.code, clientName: c.clientName },
    });
    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    await this.changeStatus(
      () => this.clientService.deactivateClient(c.id, result.reason ? { reason: result.reason } : {}),
      'Client deactivated',
    );
  }

  private async changeStatus(
    call: () => ReturnType<ClientService['activateClient']>,
    successMessage: string,
  ): Promise<void> {
    this.saving.set(true);
    try {
      const res = await lastValueFrom(call());
      this.client.set(res.data);
      this.snack.open(successMessage, 'OK', { duration: 3000 });
      void this.loadAudit(res.data.id);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.snack.open(
        httpErr?.error?.message || 'The status could not be changed.',
        'Close',
        { duration: 5000, panelClass: ['error-snackbar'] },
      );
    } finally {
      this.saving.set(false);
    }
  }

  // ── Display helpers ────────────────────────────────────────────────

  protected statusClass(status: ClientStatus | undefined): string {
    return status === ClientStatus.ACTIVE
      ? 'status-chip status-chip--active'
      : 'status-chip status-chip--inactive';
  }

  protected statusLabel(status: ClientStatus | undefined): string {
    return status === ClientStatus.ACTIVE ? 'Active' : 'Inactive';
  }

  protected label(value: string | null | undefined): string {
    return clientLabel(value);
  }

  protected country(code: string | null | undefined): string {
    return code ? countryName(code) : '';
  }

  protected isExpiringSoon(expiry: string | null, expired: boolean): boolean {
    if (!expiry || expired) return false;
    return (new Date(expiry).getTime() - Date.now()) / 86_400_000 <= 30;
  }

  protected auditIcon(action: ClientAuditAction): string {
    switch (action) {
      case ClientAuditAction.CREATED:          return 'add_circle';
      case ClientAuditAction.UPDATED:          return 'edit';
      case ClientAuditAction.ACTIVATED:        return 'toggle_on';
      case ClientAuditAction.DEACTIVATED:      return 'toggle_off';
      case ClientAuditAction.DOCUMENT_ADDED:   return 'note_add';
      case ClientAuditAction.DOCUMENT_REMOVED: return 'delete';
      case ClientAuditAction.DELETED:          return 'delete_forever';
      default: return 'history';
    }
  }

  /** Field keys the API reports, as the labels the form uses. */
  protected fieldLabel(field: string): string {
    return AUDIT_FIELD_LABELS[field] ?? field;
  }

  /** A reference id in the history is not meaningful to read — show it as "changed". */
  protected isReferenceField(field: string): boolean {
    return field.endsWith('Id');
  }

  protected auditValue(field: string, value: string | null): string {
    if (value === null) return '—';
    if (this.isReferenceField(field)) return '(changed)';
    if (field === 'countryCode') return countryName(value);
    return clientLabel(value);
  }
}
