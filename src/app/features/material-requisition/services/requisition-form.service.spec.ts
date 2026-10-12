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
      expect(issues).toContain('Select a WBS / cost code.');
      expect(issues).toContain('Set the required-on-site date.');
      expect(issues).toContain('Enter a quantity for at least one material.');
    });

    it('is empty once the requisition is complete', () => {
      const s = setup();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      s.header.patchValue({ projectId: 'p1', wbsCostCodeId: 'w1', requiredOnSiteDate: tomorrow });
      s.setQuantity(PIPE, 5, MM, null);
      s.commitQuantity('m1');

      expect(s.submitIssues()).toEqual([]);
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
  });
});
