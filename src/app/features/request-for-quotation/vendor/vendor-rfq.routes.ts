import { Routes } from '@angular/router';

/**
 * The vendor's RFQ screens (external users), mounted at /vendor-rfqs:
 * the list of RFQs issued to its vendor, the RFQ Acknowledgement Form, and the
 * response screen where it prices and answers an acknowledged RFQ.
 */
export const VENDOR_RFQ_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./vendor-rfq-list/vendor-rfq-list.component').then((m) => m.VendorRfqListComponent),
    data: { breadcrumb: '' },
  },
  {
    path: ':id/acknowledge',
    loadComponent: () =>
      import('./rfq-acknowledgement/rfq-acknowledgement.component').then((m) => m.RfqAcknowledgementComponent),
    data: { breadcrumb: 'Acknowledgement' },
  },
  {
    path: ':id',
    loadComponent: () => import('./rfq-vendor-response/rfq-vendor-response.component').then((m) => m.RfqVendorResponseComponent),
    data: { breadcrumb: 'Response' },
  },
];
