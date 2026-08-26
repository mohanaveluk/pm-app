import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UploadedDocument {
  url: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

interface MaterialSpecificationDocumentResponse {
  message: string;
  url: string;
}

/**
 * POST /v1/materials/specification/document — multipart upload backed by
 * MaterialController.uploadMaterialSpecificationDocument. The endpoint only
 * returns { message, url }; the rest of UploadedDocument is filled in from
 * the File object the caller already has.
 */
@Injectable({ providedIn: 'root' })
export class MaterialDocumentUploadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/materials`;

  readonly isConfigured = true;

  upload(file: File): Observable<UploadedDocument> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http
      .post<MaterialSpecificationDocumentResponse>(`${this.baseUrl}/specification/document`, formData)
      .pipe(
        map((res) => ({
          url: res.url,
          fileName: file.name,
          sizeBytes: file.size,
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
        })),
      );
  }
}
