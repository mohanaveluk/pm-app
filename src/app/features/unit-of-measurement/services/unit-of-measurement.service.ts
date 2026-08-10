import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UomType } from '../models/unit-of-measurement.model';
import {
  CreateUnitOfMeasurementRequest, UnitOfMeasurementQueryParams, UpdateUnitOfMeasurementRequest,
} from '../models/unit-of-measurement-request.model';
import {
  PagedUnitOfMeasurementResponse, UnitOfMeasurementDeleteResponse,
  UnitOfMeasurementOptionsResponse, UnitOfMeasurementResponse,
} from '../models/unit-of-measurement-response.model';

/**
 * Thin HTTP layer over the real UnitOfMeasurementController. Every method maps
 * 1:1 to a documented endpoint — no synthesized routes.
 *
 * Note there are no enable/disable endpoints on this controller (unlike Material
 * Category / Group): activation is a field update carried by PUT, matching the
 * Department master's pattern.
 */
@Injectable({ providedIn: 'root' })
export class UnitOfMeasurementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/unit-of-measurements`;

  /** GET /unit-of-measurements — paginated, searchable, filterable by type/status. */
  getUnitsOfMeasurement(params: UnitOfMeasurementQueryParams): Observable<PagedUnitOfMeasurementResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('limit', params.limit)
      .set('sortBy', params.sortBy)
      .set('sortOrder', params.sortOrder);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.uomType) httpParams = httpParams.set('uomType', params.uomType);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);

    return this.http.get<PagedUnitOfMeasurementResponse>(this.baseUrl, { params: httpParams });
  }

  /**
   * GET /unit-of-measurements/active — slim list for dropdowns.
   * Pass uomType to scope the list to one measurement family.
   */
  getActiveUnitsOfMeasurement(uomType?: UomType): Observable<UnitOfMeasurementOptionsResponse> {
    const params = uomType ? new HttpParams().set('uomType', uomType) : undefined;
    return this.http.get<UnitOfMeasurementOptionsResponse>(`${this.baseUrl}/active`, { params });
  }

  /** GET /unit-of-measurements/:id */
  getUnitOfMeasurementById(id: string): Observable<UnitOfMeasurementResponse> {
    return this.http.get<UnitOfMeasurementResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /unit-of-measurements — organizationId is resolved server-side from the token. */
  createUnitOfMeasurement(request: CreateUnitOfMeasurementRequest): Observable<UnitOfMeasurementResponse> {
    return this.http.post<UnitOfMeasurementResponse>(this.baseUrl, request);
  }

  /** PUT /unit-of-measurements/:id — `code` is rejected by the API. */
  updateUnitOfMeasurement(id: string, request: UpdateUnitOfMeasurementRequest): Observable<UnitOfMeasurementResponse> {
    return this.http.put<UnitOfMeasurementResponse>(`${this.baseUrl}/${id}`, request);
  }

  /** DELETE /unit-of-measurements/:id — soft delete; 409 when referenced downstream. */
  deleteUnitOfMeasurement(id: string): Observable<UnitOfMeasurementDeleteResponse> {
    return this.http.delete<UnitOfMeasurementDeleteResponse>(`${this.baseUrl}/${id}`);
  }
}
