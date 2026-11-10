/**
 * Compliance and Deviation items of a requisition. Both are lists of rows with
 * the same behaviour (add one after another, Sr# by position, required fields,
 * a text field that becomes required when a tick box is left unticked), so one
 * step component and one validator serve both, driven by a config.
 */

export type ChecklistKind = 'compliance' | 'deviation';

/** One compliance item (mirrors RequisitionComplianceDto). */
export interface RequisitionCompliance {
  requirement: string;
  /** Filled in by the vendor in the RFQ. */
  vendorResponse: string | null;
  compliant: boolean;
  remarks: string | null;
}

/** One deviation item (mirrors RequisitionDeviationDto). */
export interface RequisitionDeviation {
  clauseNo: string;
  rfqRequirement: string;
  vendorDeviation: boolean;
  justification: string | null;
}

export interface RequisitionComplianceResponse extends RequisitionCompliance {
  id: string;
  sequence: number;
}

export interface RequisitionDeviationResponse extends RequisitionDeviation {
  id: string;
  sequence: number;
}

/** A row while it is being edited: the field values, plus a key that survives re-ordering. */
export interface ChecklistRow {
  key: string;
  values: Record<string, string | boolean>;
}

export interface ChecklistColumn {
  key: string;
  label: string;
  type: 'text' | 'check';
  /** Always required. */
  required?: boolean;
  /** Required when this tick box (another column's key) is unticked. */
  requiredUnless?: string;
  placeholder?: string;
  maxLength?: number;
  /** Relative width of a text column. */
  flex?: number;
  /** Filled in by the vendor (in the RFQ) — shown here, never edited. */
  vendor?: boolean;
}

export interface ChecklistConfig {
  kind: ChecklistKind;
  title: string;
  icon: string;
  hint: string;
  addLabel: string;
  /** "Compliance item", "Deviation item" — used in messages. */
  itemLabel: string;
  emptyMessage: string;
  /** The whole list is the vendor's (entered in the RFQ): no adding, editing or removing here. */
  vendorOnly?: boolean;
  columns: ChecklistColumn[];
}

export const COMPLIANCE_CONFIG: ChecklistConfig = {
  kind: 'compliance',
  title: 'Compliance',
  icon: 'fact_check',
  hint: 'List the requirements the vendor must comply with. Compliant and Remarks are filled in by the vendor in the Request for Quotation and are shown here read-only.',
  addLabel: 'Add compliance item',
  itemLabel: 'Compliance item',
  emptyMessage: 'No compliance items have been added.',
  columns: [
    { key: 'requirement', label: 'Requirement', type: 'text', required: true, placeholder: 'e.g. Material to ASTM A106 Gr. B', maxLength: 2000, flex: 5 },
    { key: 'compliant', label: 'Compliant (Yes/No)', type: 'check', vendor: true },
    { key: 'remarks', label: 'Remarks', type: 'text', vendor: true, flex: 3 },
  ],
};

export const DEVIATION_CONFIG: ChecklistConfig = {
  kind: 'deviation',
  title: 'Deviation',
  icon: 'rule',
  hint: 'Deviations are entered by the vendor in the Request for Quotation. They are shown here read-only once the vendor has responded.',
  addLabel: 'Add deviation item',
  itemLabel: 'Deviation item',
  emptyMessage: 'No deviations yet — the vendor enters them in the Request for Quotation.',
  vendorOnly: true,
  columns: [
    { key: 'clauseNo', label: 'Clause No.', type: 'text', vendor: true, flex: 1 },
    { key: 'rfqRequirement', label: 'RFQ Requirement', type: 'text', vendor: true, flex: 3 },
    { key: 'vendorDeviation', label: 'Vendor Deviation (Yes/No)', type: 'check', vendor: true },
    { key: 'justification', label: 'Justification', type: 'text', vendor: true, flex: 3 },
  ],
};

export const CHECKLIST_CONFIGS: Record<ChecklistKind, ChecklistConfig> = {
  compliance: COMPLIANCE_CONFIG,
  deviation: DEVIATION_CONFIG,
};

/** What is wrong with one row, by column key (empty when the row is valid). */
export function checklistRowErrors(config: ChecklistConfig, row: ChecklistRow): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const col of config.columns) {
    if (col.type !== 'text' || col.vendor) continue;
    const value = String(row.values[col.key] ?? '').trim();
    if (value) continue;
    if (col.required) {
      errors[col.key] = `Enter the ${col.label.toLowerCase()}`;
    } else if (col.requiredUnless && !row.values[col.requiredUnless]) {
      const box = config.columns.find((c) => c.key === col.requiredUnless)?.label.replace(/\s*\(Yes\/No\)/, '') ?? col.requiredUnless;
      errors[col.key] = `Required when ${box} is not ticked`;
    }
  }
  return errors;
}

/** One message per invalid row, for the step blocker and the submit checks. */
export function checklistIssues(config: ChecklistConfig, rows: ChecklistRow[]): string[] {
  return rows.flatMap((row, index) => {
    const errors = checklistRowErrors(config, row);
    const first = Object.values(errors)[0];
    return first ? [`${config.itemLabel} ${index + 1}: ${first.charAt(0).toLowerCase()}${first.slice(1)}.`] : [];
  });
}

let rowSeq = 0;

/** An empty row with every column at its default. */
export function emptyChecklistRow(config: ChecklistConfig): ChecklistRow {
  const values: Record<string, string | boolean> = {};
  for (const col of config.columns) values[col.key] = col.type === 'check' ? false : '';
  return { key: `${config.kind}-${Date.now()}-${rowSeq++}`, values };
}

/** A row from saved data. */
export function checklistRowFrom(config: ChecklistConfig, data: object): ChecklistRow {
  const row = emptyChecklistRow(config);
  const source = data as Record<string, unknown>;
  for (const [key, v] of Object.entries(source)) {
    if (key === 'id' || key === 'sequence') continue;
    if (typeof v === 'boolean') row.values[key] = v;
    else if (v !== null && v !== undefined && typeof v !== 'object') row.values[key] = String(v);
  }
  for (const col of config.columns) {
    const v = source[col.key];
    row.values[col.key] = col.type === 'check' ? v === true : String(v ?? '');
  }
  return row;
}

/** Whether the vendor has answered a compliance row yet (in the RFQ). */
export function vendorHasAnswered(values: Record<string, unknown>): boolean {
  return values['compliant'] === true
    || !!String(values['remarks'] ?? '').trim()
    || !!String(values['vendorResponse'] ?? '').trim();
}

const text = (v: string | boolean | undefined): string => String(v ?? '').trim();

export function toComplianceRequest(rows: ChecklistRow[]): RequisitionCompliance[] {
  return rows.map((r) => ({
    requirement: text(r.values['requirement']),
    // The vendor's answers (entered in the RFQ) are sent back as they were.
    vendorResponse: text(r.values['vendorResponse']) || null,
    compliant: r.values['compliant'] === true,
    remarks: text(r.values['remarks']) || null,
  }));
}

export function toDeviationRequest(rows: ChecklistRow[]): RequisitionDeviation[] {
  return rows.map((r) => ({
    clauseNo: text(r.values['clauseNo']),
    rfqRequirement: text(r.values['rfqRequirement']),
    vendorDeviation: r.values['vendorDeviation'] === true,
    justification: text(r.values['justification']) || null,
  }));
}
