import { pickMaterialSection, toMaterialFormValue, toMaterialRequest } from './material.mapper';
import { Material } from '../models/material.model';

const stored = {
  shortDescription: 'Pipe', materialCategoryId: 'c', materialGroupId: 'g', unitOfMeasurementId: 'u',
  criticalityLevel: 'MEDIUM', remarks: 'note',
  isStockItem: false, isSerialized: true, isBatchManaged: true,
  storageLocation: 'WH-A',
} as unknown as Material;

describe('material mapper — Material Control Type lives on the Inventory step', () => {
  it('rehydrates the flags into the inventory section, not general', () => {
    const form = toMaterialFormValue(stored);

    expect(form.inventory).toMatchObject({ isStockItem: false, isSerialized: true, isBatchManaged: true });
    expect(form.general).not.toHaveProperty('isStockItem');
    expect(form.general.remarks).toBe('note');
  });

  it('defaults to a warehouse-managed, non-serialized, non-batch item', () => {
    const form = toMaterialFormValue({ shortDescription: 'x' } as unknown as Material);
    expect(form.inventory).toMatchObject({ isStockItem: true, isSerialized: false, isBatchManaged: false });
  });

  it('still sends the flags as core request fields', () => {
    const request = toMaterialRequest(toMaterialFormValue(stored));
    expect(request).toMatchObject({ isStockItem: false, isSerialized: true, isBatchManaged: true });
  });

  it('saves the flags with the inventory step and no longer with the general step', () => {
    const request = toMaterialRequest(toMaterialFormValue(stored));

    expect(pickMaterialSection(request, 'inventory')).toMatchObject({
      isStockItem: false, isSerialized: true, isBatchManaged: true,
      inventory: { storageLocation: 'WH-A' },
    });
    const general = pickMaterialSection(request, 'general');
    expect(general).not.toHaveProperty('isStockItem');
    expect(general).not.toHaveProperty('isSerialized');
    expect(general).not.toHaveProperty('isBatchManaged');
    expect(general).toMatchObject({ shortDescription: 'Pipe', remarks: 'note' });
  });
});
