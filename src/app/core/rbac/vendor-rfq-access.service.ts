import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services';
import { environment } from '../../../environments/environment';

interface VendorSummary {
  awaitingAcknowledgement: number;
  acknowledged: number;
  responded: number;
  acknowledgedTotal: number;
  total: number;
}

/**
 * For vendor (external) accounts: their RFQs by stage (the counters on the
 * vendor RFQ list). Loaded on sign-in and refreshed after the vendor
 * acknowledges an RFQ.
 */
@Injectable({ providedIn: 'root' })
export class VendorRfqAccessService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly summary = signal<VendorSummary | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user?.isExternal && this.auth.authenticated()) this.refresh();
      else this.summary.set(null);
    });
  }

  refresh(): void {
    this.http.get<{ data: VendorSummary }>(`${environment.apiUrl}/v1/rfqs/vendor/summary`).subscribe({
      next: (res) => this.summary.set(res.data ?? null),
      error: () => this.summary.set(null),
    });
  }
}
