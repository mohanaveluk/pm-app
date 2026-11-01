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
  vendorResponse: string;
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
  columns: ChecklistColumn[];
}

export const COMPLIANCE_CONFIG: ChecklistConfig = {
  kind: 'compliance',
  title: 'Compliance',
  icon: 'fact_check',
  hint: 'List each requirement and the vendor\'s response. Tick Compliant when the response meets it; when it does not, say why in Remarks.',
  addLabel: 'Add compliance item',
  itemLabel: 'Compliance item',
  emptyMessage: 'No compliance items have been added.',
  columns: [
    { key: 'requirement', label: 'Requirement', type: 'text', required: true, placeholder: 'e.g. Material to ASTM A106 Gr. B', maxLength: 2000, flex: 3 },
    { key: 'vendorResponse', label: 'Vendor Response', type: 'text', required: true, placeholder: 'What the vendor confirmed', maxLength: 2000, flex: 3 },
    { key: 'compliant', label: 'Compliant (Yes/No)', type: 'check' },
    { key: 'remarks', label: 'Remarks', type: 'text', requiredUnless: 'compliant', placeholder: 'Required when not compliant', maxLength: 2000, flex: 2 },
  ],
};

export const DEVIATION_CONFIG: ChecklistConfig = {
  kind: 'deviation',
  title: 'Deviation',
  icon: 'rule',
  hint: 'List each RFQ clause the vendor\'s offer is checked against. Tick Vendor Deviation when the vendor deviates; otherwise give the justification.',
  addLabel: 'Add deviation item',
  itemLabel: 'Deviation item',
  emptyMessage: 'No deviation items have been added.',
  columns: [
    { key: 'clauseNo', label: 'Clause No.', type: 'text', required: true, placeholder: 'e.g. 4.2.1', maxLength: 50, flex: 1 },
    { key: 'rfqRequirement', label: 'RFQ Requirement', type: 'text', required: true, placeholder: 'What the RFQ asks for', maxLength: 2000, flex: 3 },
    { key: 'vendorDeviation', label: 'Vendor Deviation (Yes/No)', type: 'check' },
    { key: 'justification', label: 'Justification', type: 'text', requiredUnless: 'vendorDeviation', placeholder: 'Required when not ticked', maxLength: 2000, flex: 3 },
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
    if (col.type !== 'text') continue;
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
  for (const col of config.columns) {
    const v = source[col.key];
    row.values[col.key] = col.type === 'check' ? v === true : String(v ?? '');
  }
  return row;
}

const text = (v: string | boolean | undefined): string => String(v ?? '').trim();

export function toComplianceRequest(rows: ChecklistRow[]): RequisitionCompliance[] {
  return rows.map((r) => ({
    requirement: text(r.values['requirement']),
    vendorResponse: text(r.values['vendorResponse']),
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
