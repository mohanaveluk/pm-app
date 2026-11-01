import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProjectService } from '../../project/services/project.service';
import { MaterialCategoryService } from '../../material-category/services/material-category.service';
import { MaterialGroupService } from '../../material-group/services/material-group.service';
import { UnitOfMeasurementService } from '../../unit-of-measurement/services/unit-of-measurement.service';
import { MaterialRequisitionService } from './material-requisition.service';
import { RequisitionFormService } from './requisition-form.service';
import {
  RequisitionCandidate, RequisitionDocumentType, RequisitionLineSource,
} from '../models/material-requisition.model';

const PIPE: RequisitionCandidate = {
  materialId: 'm1', code: 'PIP-001', description: 'Carbon steel pipe', categoryName: 'Piping',
  groupName: null, uom: 'M', stockOnHand: 0, referenceQty: 12,
};
const VALVE: RequisitionCandidate = {
  materialId: 'm2', code: 'VLV-001', description: 'Gate valve', categoryName: 'Valves',
  groupName: null, uom: 'EA', stockOnHand: 0, referenceQty: null,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      RequisitionFormService,
      { provide: MaterialRequisitionService, useValue: { getWbsCostCodes: () => of({ data: [] }) } },
      { provide: ProjectService, useValue: { getActiveProjects: () => of({ data: [] }) } },
      { provide: MaterialCategoryService, useValue: { getActiveMaterialCategories: () => of({ data: [] }) } },
      { provide: MaterialGroupService, useValue: { getActiveMaterialGroups: () => of({ data: [] }) } },
      { provide: UnitOfMeasurementService, useValue: { getActiveUnitsOfMeasurement: () => of({ data: [] }) } },
    ],
  });
  return TestBed.inject(RequisitionFormService);
}

const MM = RequisitionLineSource.MATERIAL_MASTER;

describe('RequisitionFormService', () => {
  describe('lines', () => {
    it('keeps a typed quantity out of the lines until the field is left', () => {
      const s = setup();
      s.setQuantity(PIPE, 5, MM, null);

      expect(s.quantityOf('m1')).toBe(5);
      expect(s.lineCount()).toBe(0);

      s.commitQuantity('m1');
      expect(s.lineCount()).toBe(1);
    });

    it('puts the most recently entered row first', () => {
      const s = setup();
      s.setQuantity(PIPE, 5, MM, null);
      s.commitQuantity('m1');
      s.setQuantity(VALVE, 2, MM, null);
      s.commitQuantity('m2');

      expect(s.lines().map((l) => l.materialId)).toEqual(['m2', 'm1']);
    });

    it('drops an empty or zero quantity when the field is left', () => {
      const s = setup();
      s.setQuantity(PIPE, 5, MM, null);
      s.commitQuantity('m1');
      s.setQuantity(PIPE, 0, MM, null);
      s.commitQuantity('m1');

      expect(s.lineCount()).toBe(0);
      expect(s.quantityOf('m1')).toBeNull();
    });

    it('keeps the source a line was first picked from', () => {
      const s = setup();
      s.setQuantity(PIPE, 5, RequisitionLineSource.BOM, 'boq.xlsx');
      s.commitQuantity('m1');
      s.setQuantity(PIPE, 7, MM, null);

      const [line] = s.lines();
      expect(line.requestedQty).toBe(7);
      expect(line.source).toBe(RequisitionLineSource.BOM);
      expect(line.sourceReference).toBe('boq.xlsx');
    });

    it('applies reference quantities only where the source supplied one', () => {
      const s = setup();
      const applied = s.applyReferenceQuantities([PIPE, VALVE], RequisitionLineSource.EARLIER_MR, '0003');

      expect(applied).toBe(1);
      expect(s.lines().map((l) => l.materialId)).toEqual(['m1']);
    });

    it('clears everything', () => {
      const s = setup();
      s.setQuantity(PIPE, 5, MM, null);
      s.commitQuantity('m1');
      s.clearLines();

      expect(s.lineCount()).toBe(0);
    });
  });

  describe('selection checkbox', () => {
    it('ticks a row as soon as a quantity is typed', () => {
      const s = setup();
      s.setQuantity(PIPE, 3, MM, null);

      expect(s.isSelected('m1')).toBe(true);
    });

    it('pins a ticked row to the top without a quantity and flags it incomplete', () => {
      const s = setup();
      s.setQuantity(PIPE, 5, MM, null);
      s.commitQuantity('m1');
      s.setSelected(VALVE, true, MM, null);

      expect(s.selectedLines().map((l) => l.materialId)).toEqual(['m2', 'm1']);
      expect(s.incompleteLines().map((l) => l.materialId)).toEqual(['m2']);
      expect(s.lineCount()).toBe(1);
      expect(s.submitIssues().some((i) => i.includes('all the selected materials'))).toBe(true);
    });

    it('keeps a ticked row when its quantity field is left empty', () => {
      const s = setup();
      s.setSelected(VALVE, true, MM, null);
      s.commitQuantity('m2');

      expect(s.isSelected('m2')).toBe(true);
    });

    it('unticking clears the quantity and the line', () => {
      const s = setup();
      s.setSelected(PIPE, true, MM, null);
      s.setQuantity(PIPE, 4, MM, null);
      s.commitQuantity('m1');
      s.setSelected(PIPE, false, MM, null);

      expect(s.isSelected('m1')).toBe(false);
      expect(s.quantityOf('m1')).toBeNull();
      expect(s.selectedLines()).toHaveLength(0);
    });

    it('removing a line unticks it', () => {
      const s = setup();
      s.setSelected(PIPE, true, MM, null);
      s.removeLine('m1');

      expect(s.isSelected('m1')).toBe(false);
    });
  });

  describe('change tracking', () => {
    it('reports unsaved changes after a line is entered and clears them on save', () => {
      const s = setup();
      expect(s.hasUnsavedChanges()).toBe(false);

      s.setQuantity(PIPE, 5, MM, null);
      expect(s.hasUnsavedChanges()).toBe(true);

      s.markSaved();
      expect(s.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('submitIssues', () => {
    it('lists what is missing', () => {
      const s = setup();
      const issues = s.submitIssues();

      expect(issues).toContain('Select a project.');
      expect(issues).toContain('Select a WBS.');
      expect(issues).toContain('Set the required-on-site date.');
      expect(issues).toContain('Enter a quantity for at least one material.');
      expect(issues).toContain('Assign at least one reviewer.');
      expect(issues).toContain('Assign at least one approver.');
    });

    it('is empty once the requisition is complete', () => {
      const s = setup();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      s.header.patchValue({
        projectId: 'p1', wbsCostCodeId: 'w1', requiredOnSiteDate: tomorrow,
        reviewerIds: ['u-r1'], approverIds: ['u-a1'],
      });
      s.setQuantity(PIPE, 5, MM, null);
      s.commitQuantity('m1');

      expect(s.submitIssues()).toEqual([]);
    });

    it('lets the same person be both reviewer and approver', () => {
      const s = setup();
      s.userOptions.set([{ id: 'u-1', name: 'Asha Nair', email: 'a@x.com', position: null, role: null }]);
      s.header.patchValue({ reviewerIds: ['u-1'], approverIds: ['u-1'] });

      expect(s.submitIssues().some((i) => i.includes('cannot be both'))).toBe(false);
    });

    it('rejects a required-on-site date in the past', () => {
      const s = setup();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      s.header.patchValue({ projectId: 'p1', wbsCostCodeId: 'w1', requiredOnSiteDate: yesterday });

      expect(s.submitIssues().some((i) => i.includes('past'))).toBe(true);
    });
  });

  describe('documents', () => {
    const doc = (name: string) => ({
      documentName: name, documentUrl: `https://x/${name}`, fileName: name, mimeType: null, fileSizeBytes: 1,
    });

    it('allows one covering document, a new one replacing the old', () => {
      const s = setup();
      s.addDocument({ ...doc('a.pdf'), documentType: RequisitionDocumentType.COVERING_DOCUMENT });
      s.addDocument({ ...doc('b.pdf'), documentType: RequisitionDocumentType.COVERING_DOCUMENT });

      expect(s.documents()).toHaveLength(1);
      expect(s.coveringDocument()?.fileName).toBe('b.pdf');
    });

    it('keeps several supporting documents', () => {
      const s = setup();
      s.addDocument({ ...doc('a.pdf'), documentType: RequisitionDocumentType.SPECIFICATION });
      s.addDocument({ ...doc('b.pdf'), documentType: RequisitionDocumentType.PROJECT_DOCUMENT });

      expect(s.supportingDocuments()).toHaveLength(2);
    });
  });

  describe('toRequest', () => {
    it('sends only lines with a quantity and omits the code', () => {
      const s = setup();
      s.header.patchValue({ projectId: 'p1', wbsCostCodeId: 'w1', mrNumber: '  ', requiredOnSiteDate: new Date(2030, 0, 15) });
      s.setQuantity(PIPE, 5, MM, null);
      s.commitQuantity('m1');
      s.setQuantity(VALVE, 0, MM, null);

      const req = s.toRequest(false);

      expect(req.items).toEqual([{ materialId: 'm1', requestedQty: 5, source: MM, sourceReference: null }]);
      expect(req.requiredOnSiteDate).toBe('2030-01-15');
      expect(req.mrNumber).toBeNull();
      expect(req.submit).toBe(false);
      expect(Object.keys(req)).not.toContain('code');
    });

    it('sends the short item description, and none when left blank', () => {
      const s = setup();
      s.header.patchValue({ projectId: 'p1', shortDescription: ' CS pipes for Unit 100 ' });
      expect(s.toRequest(false).shortDescription).toBe('CS pipes for Unit 100');

      s.header.patchValue({ shortDescription: '   ' });
      expect(s.toRequest(false).shortDescription).toBeNull();
    });

    it('sends the reviewers and approvers in the order chosen', () => {
      const s = setup();
      s.header.patchValue({ projectId: 'p1', reviewerIds: ['u-r2', 'u-r1'], approverIds: ['u-a1'] });

      const req = s.toRequest(false);

      expect(req.reviewerIds).toEqual(['u-r2', 'u-r1']);
      expect(req.approverIds).toEqual(['u-a1']);
    });

    const loaded = (status: string, permissions: Record<string, boolean> | null) => ({
      id: 'mr-1', code: '0001', mrNumber: '0001', status, projectId: 'p1',
      projectCode: '0042', projectName: 'Unit 4', clientCode: null, clientName: null,
      wbsCostCodeId: 'w1', budgetHead: null, requiredOnSiteDate: '2030-01-15', mtoReference: null,
      pidReference: null, isometricReference: null, areaUnit: null, remarks: null,
      items: [], documents: [], permissions,
      participants: [
        { id: 'p1', role: 'REVIEWER', userId: 'u-r1', userName: 'R One', userEmail: 'r1@x.com', sequence: 1 },
        { id: 'p2', role: 'APPROVER', userId: 'u-a1', userName: 'A One', userEmail: 'a1@x.com', sequence: 1 },
      ],
    }) as never;

    it('lets the requester change both lists while under review', () => {
      const s = setup();
      s.load(loaded('UNDER_REVIEW', { canEditReviewers: true, canEditApprovers: true }));

      expect(s.reviewersLocked()).toBe(false);
      expect(s.approversLocked()).toBe(false);
      expect(s.toRequest(false)).toMatchObject({ reviewerIds: ['u-r1'], approverIds: ['u-a1'] });
    });

    it('locks the reviewers once reviewed but keeps the approvers open', () => {
      const s = setup();
      s.load(loaded('REVIEWED', { canEditReviewers: false, canEditApprovers: true }));

      expect(s.reviewersLocked()).toBe(true);
      expect(s.header.get('reviewerIds')!.disabled).toBe(true);
      expect(s.selectedReviewers().map((u) => u.name)).toEqual(['R One']);
      const keys = Object.keys(s.toRequest(false));
      expect(keys).not.toContain('reviewerIds');
      expect(keys).toContain('approverIds');
    });

    it('locks both for someone who is not the requester (a reviewer editing)', () => {
      const s = setup();
      s.load(loaded('UNDER_REVIEW', { canEditReviewers: false, canEditApprovers: false }));

      expect(s.reviewersLocked()).toBe(true);
      expect(s.approversLocked()).toBe(true);
      expect(s.submitIssues().some((i) => i.includes('Assign at least'))).toBe(false);
    });

    it('falls back to the status when the API sent no permissions', () => {
      const s = setup();
      s.load(loaded('APPROVED', null));
      expect(s.reviewersLocked()).toBe(true);
      expect(s.approversLocked()).toBe(true);
    });
  });

  describe('importFrom', () => {
    const source = (extra: Record<string, unknown> = {}) => ({
      id: 'mr-7', code: '0007', mrNumber: 'MR-0007', status: 'APPROVED', projectId: 'p1',
      projectCode: '0042', projectName: 'Unit 4', clientCode: null, clientName: null,
      wbsCostCodeId: 'w1', budgetHead: 'CAPEX', shortDescription: 'CS pipes', requiredOnSiteDate: '2000-01-01',
      mtoReference: 'MTO-1', pidReference: null, isometricReference: null, areaUnit: null, remarks: 'As before',
      permissions: { canEditReviewers: false, canEditApprovers: false },
      items: [
        { materialId: 'm1', materialCode: 'PIP-001', materialDescription: 'Pipe', uom: 'M', requestedQty: 12,
          stockOnHand: 0, source: 'MATERIAL_MASTER', sourceReference: null, lineNumber: 1 },
      ],
      documents: [{ id: 'd1', documentType: 'SPECIFICATION', documentName: 'Spec', documentUrl: 'https://x/spec.pdf',
        fileName: 'spec.pdf', mimeType: 'application/pdf', fileSizeBytes: 10 }],
      participants: [
        { id: 'p1', role: 'REVIEWER', userId: 'u-1', userName: 'Asha', userEmail: 'a@x.com', sequence: 1 },
        { id: 'p2', role: 'APPROVER', userId: 'u-1', userName: 'Asha', userEmail: 'a@x.com', sequence: 1 },
      ],
      ...extra,
    }) as never;

    it('copies everything into a new, editable requisition', () => {
      const s = setup();
      s.importFrom(source());
      const req = s.toRequest(false);

      expect(req).toMatchObject({
        projectId: 'p1', wbsCostCodeId: 'w1', budgetHead: 'CAPEX', shortDescription: 'CS pipes',
        mtoReference: 'MTO-1', remarks: 'As before', mrNumber: null,
        // The same person stays in both lists.
        reviewerIds: ['u-1'], approverIds: ['u-1'],
      });
      expect(req.items).toEqual([
        { materialId: 'm1', requestedQty: 12, source: RequisitionLineSource.EARLIER_MR, sourceReference: 'MR-0007' },
      ]);
      expect(req.documents).toEqual([expect.objectContaining({ documentUrl: 'https://x/spec.pdf' })]);
      expect(s.reviewersLocked()).toBe(false);
      expect(s.approversLocked()).toBe(false);
      expect(s.hasUnsavedChanges()).toBe(true);
    });

    it('clears a required-on-site date already in the past, and keeps a future one', () => {
      const s = setup();
      s.importFrom(source());
      expect(s.header.get('requiredOnSiteDate')!.value).toBeNull();

      s.importFrom(source({ requiredOnSiteDate: '2099-06-30' }));
      expect(s.toRequest(false).requiredOnSiteDate).toBe('2099-06-30');
    });

    it('lets the user change a quantity or drop a line before saving', () => {
      const s = setup();
      s.importFrom(source());
      s.setQuantity(PIPE, 20, RequisitionLineSource.EARLIER_MR, 'MR-0007');
      s.commitQuantity('m1');
      expect(s.toRequest(false).items?.[0]?.requestedQty).toBe(20);
    });

    it('carries the compliance and deviation items over, in Sr# order', () => {
      const s = setup();
      s.importFrom(source({
        compliances: [
          { id: 'c2', sequence: 2, requirement: 'B', vendorResponse: 'b', compliant: false, remarks: 'why' },
          { id: 'c1', sequence: 1, requirement: 'A', vendorResponse: 'a', compliant: true, remarks: null },
        ],
        deviations: [{ id: 'd1', sequence: 1, clauseNo: '4.2', rfqRequirement: 'R', vendorDeviation: true, justification: null }],
      }));
      const req = s.toRequest(false);
      expect(req.compliances?.map((c) => c.requirement)).toEqual(['A', 'B']);
      expect(req.deviations).toEqual([{ clauseNo: '4.2', rfqRequirement: 'R', vendorDeviation: true, justification: null }]);
    });

    it('leaves out reviewers / approvers who can no longer be assigned, and names them', () => {
      const s = setup();
      const withDeleted = source({
        participants: [
          { id: 'p1', role: 'REVIEWER', userId: 'u-1', userName: 'Asha', userEmail: 'a@x.com', sequence: 1 },
          { id: 'p2', role: 'REVIEWER', userId: 'u-gone', userName: 'klp plo', userEmail: 'k@x.com', sequence: 2 },
          { id: 'p3', role: 'APPROVER', userId: 'u-gone', userName: 'klp plo', userEmail: 'k@x.com', sequence: 1 },
        ],
      });
      const active = [{ id: 'u-1', name: 'Asha', email: 'a@x.com', position: null, role: null }];

      const dropped = s.importFrom(withDeleted, active);

      expect(dropped).toEqual(['klp plo']);
      expect(s.toRequest(false)).toMatchObject({ reviewerIds: ['u-1'], approverIds: [] });
      expect(s.allUserOptions().map((u) => u.id)).toEqual(['u-1']);
      expect(s.submitIssues()).toContain('Assign at least one approver.');
    });
  });
});
