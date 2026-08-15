import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { PermissionService } from '../../../core/rbac/permission.service';
import { PERMISSIONS } from '../../../core/rbac/permissions.const';
import { MaterialService } from '../services/material.service';
import {
  HAZARDOUS_CLASSES, Material, MaterialAuditEntry, MaterialStatus,
} from '../models/material.model';

interface ViewField {
  label: string;
  value: string;
  full?: boolean;
}

interface ViewSection {
  key: string;
  title: string;
  icon: string;
  fields: ViewField[];
}

/**
 * Read-only presentation of a Material, organised into the same nine sections as
 * the editing workspace but rendered as summary cards rather than a form.
 */
@Component({
  selector: 'app-material-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatTooltipModule,
    MatDividerModule, MatExpansionModule, MatProgressSpinnerModule,
  ],
  templateUrl: './material-view.component.html',
  styleUrl: './material-view.component.scss',
})
export class MaterialViewComponent implements OnInit {
  private readonly materialService = inject(MaterialService);
  private readonly permissionService = inject(PermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly PERMISSIONS = PERMISSIONS;

  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly material = signal<Material | null>(null);

  /**
   * Audit trail. No audit endpoint exists yet, so this stays empty and the
   * template renders an explicit "not yet available" panel — populating this
   * signal from a future `GET /materials/:id/audit` is the only change needed.
   */
  protected readonly audit = signal<MaterialAuditEntry[]>([]);

  protected readonly isHazardous = computed(() => {
    const h = this.material()?.hazardClassification;
    return !!h && HAZARDOUS_CLASSES.has(h);
  });

  /** All nine sections, with empty fields filtered out so cards stay readable. */
  protected readonly sections = computed<ViewSection[]>(() => {
    const m = this.material();
    if (!m) return [];

    const build = (key: string, title: string, icon: string, fields: ViewField[]): ViewSection => ({
      key, title, icon,
      fields: fields.filter((f) => f.value && f.value !== '—'),
    });

    return [
      build('technical', 'Technical Specifications', 'precision_manufacturing', [
        { label: 'Technical Description', value: m.technicalDescription ?? '', full: true },
        { label: 'Model / Part Number', value: m.modelPartNumber ?? '' },
        { label: 'Manufacturer', value: m.manufacturerName ?? '' },
        { label: 'Manufacturer Part No.', value: m.manufacturerPartNumber ?? '' },
        { label: 'Brand', value: m.brand ?? '' },
        { label: 'Material Composition', value: m.materialComposition ?? '' },
        { label: 'Dimensions', value: m.dimensions ?? '' },
        { label: 'Weight', value: m.weight ?? '' },
        { label: 'Color / Finish', value: m.colorFinish ?? '' },
        { label: 'Operating Temperature', value: m.operatingTemperatureRange ?? '' },
        { label: 'Pressure Rating', value: m.pressureRating ?? '' },
        { label: 'Voltage / Current', value: m.voltageCurrentRating ?? '' },
        { label: 'Certifications', value: m.certifications ?? '', full: true },
        { label: 'Datasheet Reference', value: m.datasheetReference ?? '' },
      ]),
      build('procurement', 'Procurement Data', 'shopping_cart', [
        { label: 'Vendor Part Number', value: m.vendorPartNumber ?? '' },
        { label: 'Lead Time', value: m.leadTimeDays != null ? `${m.leadTimeDays} days` : '' },
        { label: 'Minimum Order Quantity', value: m.minimumOrderQuantity?.toString() ?? '' },
        { label: 'Reorder Level', value: m.reorderLevel?.toString() ?? '' },
        { label: 'Reorder Quantity', value: m.reorderQuantity?.toString() ?? '' },
        { label: 'Last Purchase Price', value: m.lastPurchasePrice != null ? `${m.lastPurchasePrice} ${m.currency ?? ''}`.trim() : '' },
        { label: 'Contract Reference', value: m.contractReference ?? '' },
        { label: 'HS Code', value: m.hsCode ?? '' },
        { label: 'Country of Origin', value: m.countryOfOrigin ?? '' },
      ]),
      build('inventory', 'Inventory & Storage', 'warehouse', [
        { label: 'Storage Location', value: m.storageLocation ?? '' },
        { label: 'Bin / Rack', value: m.warehouseBinRack ?? '' },
        { label: 'Shelf Life', value: m.shelfLifeDays != null ? `${m.shelfLifeDays} days` : '' },
        { label: 'Stocking Strategy', value: m.stockingStrategy ?? '' },
        { label: 'Safety Stock', value: m.safetyStock?.toString() ?? '' },
        { label: 'Maximum Stock Level', value: m.maximumStockLevel?.toString() ?? '' },
        { label: 'Storage Conditions', value: m.storageConditions ?? '', full: true },
      ]),
      build('quality', 'Quality & Inspection', 'fact_check', [
        { label: 'Inspection Type', value: m.inspectionType ?? '' },
        { label: 'Quality Spec Document', value: m.qualitySpecDocumentNo ?? '' },
        { label: 'Inspection Lot Size', value: m.inspectionLotSize?.toString() ?? '' },
        { label: 'Calibration Required', value: m.calibrationRequired ? 'Yes' : '' },
        { label: 'Calibration Interval', value: m.calibrationIntervalDays != null ? `${m.calibrationIntervalDays} days` : '' },
        { label: 'Sampling Procedure', value: m.samplingProcedure ?? '', full: true },
        { label: 'Test Parameters', value: m.testParameters ?? '', full: true },
        { label: 'Acceptance Criteria', value: m.acceptanceCriteria ?? '', full: true },
      ]),
      build('accounting', 'Accounting & Valuation', 'account_balance', [
        { label: 'Valuation Class', value: m.valuationClass ?? '' },
        { label: 'Valuation Type', value: m.valuationType ?? '' },
        { label: 'Standard Price', value: m.standardPrice != null ? `${m.standardPrice} ${m.currency ?? ''}`.trim() : '' },
        { label: 'Moving Average Price', value: m.movingAveragePrice != null ? `${m.movingAveragePrice} ${m.currency ?? ''}`.trim() : '' },
        { label: 'Cost Center', value: m.costCenter ?? '' },
        { label: 'GL Account', value: m.glAccountMapping ?? '' },
        { label: 'Tax Code', value: m.taxCode ?? '' },
      ]),
      build('safety', 'Safety & Compliance', 'health_and_safety', [
        { label: 'Hazard Classification', value: m.hazardClassification ?? '' },
        { label: 'MSDS Reference', value: m.msdsReferenceNo ?? '' },
        { label: 'PPE Requirements', value: m.ppeRequirements ?? '', full: true },
        { label: 'Handling Instructions', value: m.handlingInstructions ?? '', full: true },
        { label: 'Disposal Instructions', value: m.disposalInstructions ?? '', full: true },
        { label: 'Regulatory Compliance', value: m.regulatoryCompliance ?? '', full: true },
      ]),
      build('logistics', 'Logistics & Packaging', 'local_shipping', [
        { label: 'Packaging Type', value: m.packagingType ?? '' },
        { label: 'Packaging Dimensions', value: m.packagingDimensions ?? '' },
        { label: 'Packaging Weight', value: m.packagingWeight ?? '' },
        { label: 'Units per Package', value: m.unitsPerPackage?.toString() ?? '' },
        { label: 'Transportation Mode', value: m.transportationMode ?? '' },
        { label: 'Barcode / QR Required', value: m.barcodeQrCodeRequired ? 'Yes' : '' },
        { label: 'Special Transport', value: m.specialTransportRequirements ?? '', full: true },
      ]),
    ];
  });

  /** Document links present on the record, for the Documents card. */
  protected readonly documentLinks = computed(() => {
    const m = this.material();
    if (!m) return [] as { label: string; url: string; icon: string }[];
    return [
      { label: 'Datasheet', url: m.datasheetUrl ?? '', icon: 'description' },
      { label: 'Drawing / Sketch', url: m.drawingSketchUrl ?? '', icon: 'architecture' },
      { label: 'Technical Spec Sheet', url: m.technicalSpecSheetUrl ?? '', icon: 'fact_check' },
      { label: 'Quality Certificates', url: m.qualityCertificatesUrl ?? '', icon: 'verified' },
      { label: 'Compliance Certificates', url: m.complianceCertificatesUrl ?? '', icon: 'gavel' },
      { label: 'Vendor Quotation', url: m.vendorQuotationUrl ?? '', icon: 'request_quote' },
      { label: 'Inspection Reports', url: m.inspectionReportsUrl ?? '', icon: 'assignment' },
    ].filter((d) => !!d.url);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const res = await lastValueFrom(this.materialService.getMaterialById(id));
      this.material.set(res.data);
    } catch (err) {
      const httpErr = err as HttpErrorResponse;
      this.loadError.set(
        httpErr?.status === 404
          ? 'This material could not be found. It may have been deleted.'
          : 'Unable to load the material. Please try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  can(permission: string): boolean {
    return this.permissionService.hasPermission(permission);
  }

  edit(): void {
    const id = this.material()?.id;
    if (id) void this.router.navigate(['/admin/materials', id, 'edit']);
  }

  backToList(): void {
    void this.router.navigate(['/admin/materials']);
  }

  openUrl(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  protected statusClass(status: MaterialStatus | undefined): string {
    switch (status) {
      case MaterialStatus.ACTIVE:   return 'status-chip status-chip--active';
      case MaterialStatus.INACTIVE: return 'status-chip status-chip--inactive';
      case MaterialStatus.OBSOLETE: return 'status-chip status-chip--obsolete';
      default: return 'status-chip';
    }
  }
}
