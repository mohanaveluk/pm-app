import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PermissionService } from './permission.service';
import { AuthService } from '../../services';
import { AppRole } from '../../models/role.model';
import { VendorRfqAccessService } from './vendor-rfq-access.service';

function setup(role: AppRole, external = false, acknowledgedTotal = 0) {
  TestBed.configureTestingModule({
    providers: [
      PermissionService,
      { provide: AuthService, useValue: { role: signal(role), isExternal: signal(external) } },
      { provide: VendorRfqAccessService, useValue: { summary: signal(external ? { acknowledgedTotal } : null) } },
    ],
  });
  return TestBed.inject(PermissionService);
}

describe('PermissionService', () => {
  it('grants everything to SuperAdmin via the wildcard', () => {
    const service = setup('SuperAdmin');
    expect(service.hasPermission('anything.at.all')).toBe(true);
    expect(service.hasPermission('system.manage')).toBe(true);
  });

  it('grants OrganizationAdmin the permissions in its matrix but not system.manage', () => {
    const service = setup('OrganizationAdmin');
    expect(service.hasPermission('users.manage')).toBe(true);
    expect(service.hasPermission('system.manage')).toBe(false);
  });

  it('restricts WarehouseManager to warehouse/materials/baseline permissions', () => {
    const service = setup('WarehouseManager');
    expect(service.hasPermission('warehouse.manage')).toBe(true);
    expect(service.hasPermission('materials.view')).toBe(true);
    expect(service.hasPermission('vendors.manage')).toBe(false);
    expect(service.hasPermission('users.manage')).toBe(false);
  });

  it('gives a plain User only the baseline dashboard/profile permissions', () => {
    const service = setup('User');
    expect(service.hasPermission('dashboard.view')).toBe(true);
    expect(service.hasPermission('profile.view')).toBe(true);
    expect(service.hasPermission('projects.view')).toBe(false);
  });

  it('hasAnyPermission is satisfied by a single matching permission', () => {
    const service = setup('QAManager');
    expect(service.hasAnyPermission(['po.manage', 'qa.view'])).toBe(true);
    expect(service.hasAnyPermission(['po.manage', 'vendors.manage'])).toBe(false);
  });

  it('hasAllPermissions requires every permission to be granted', () => {
    const service = setup('ProcurementManager');
    expect(service.hasAllPermissions(['vendors.view', 'po.approve'])).toBe(true);
    expect(service.hasAllPermissions(['vendors.view', 'qa.manage'])).toBe(false);
  });

  it('hasRole checks the current role against a single value or a list', () => {
    const service = setup('ProjectManager');
    expect(service.hasRole('ProjectManager')).toBe(true);
    expect(service.hasRole(['ProjectManager', 'DisciplineLead'])).toBe(true);
    expect(service.hasRole('WarehouseManager')).toBe(false);
  });

  it('gives a vendor (external) account the RFQ response screens, and the menu once it has acknowledged an RFQ', () => {
    const before = setup('User', true, 0);
    expect(before.hasPermission('rfq.respond')).toBe(true);
    expect(before.hasPermission('rfq.vendor-menu')).toBe(false);
    expect(before.hasPermission('rfq.view')).toBe(false);
    TestBed.resetTestingModule();
    const after = setup('User', true, 1);
    expect(after.hasPermission('rfq.vendor-menu')).toBe(true);
  });

  it('does not give internal users the vendor RFQ screens', () => {
    const service = setup('User');
    expect(service.hasPermission('rfq.respond')).toBe(false);
  });

  it('keeps requisition reviews and approvals internal-only, even though the User role grants them', () => {
    const internal = setup('User');
    expect(internal.hasPermission('material-requisitions.review')).toBe(true);
    expect(internal.hasPermission('material-requisitions.approve')).toBe(true);
    TestBed.resetTestingModule();
    const vendor = setup('User', true, 1);
    expect(vendor.hasPermission('material-requisitions.review')).toBe(false);
    expect(vendor.hasPermission('material-requisitions.approve')).toBe(false);
    expect(vendor.hasPermission('profile.view')).toBe(true);
  });
});
