import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UploadedDocument {
  url: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

/**
 * Extension point for document/photo uploads.
 *
 * The Material API stores **URLs** (`datasheetUrl`, `photos[]`, …) and the
 * application currently exposes only one upload endpoint — the profile-avatar
 * route — which is not a general document store. Rather than route engineering
 * datasheets through an avatar endpoint or fabricate a storage URL, this service
 * reports itself unconfigured and the Documents step falls back to URL entry,
 * which the backend genuinely supports.
 *
 * When a document service lands, override this provider (or replace the body of
 * `upload`) and the drag-and-drop area in the Documents step becomes live with
 * no template changes.
 */
@Injectable({ providedIn: 'root' })
export class MaterialDocumentUploadService {
  /** Whether a real upload endpoint is wired up. */
  readonly isConfigured = false;

  /** Human-readable reason shown in the UI while uploads are unavailable. */
  readonly unavailableReason =
    'Direct file upload needs the shared Document Service, which is not available yet. ' +
    'Paste a document URL from your existing storage in the meantime.';

  upload(_file: File): Observable<UploadedDocument> {
    return new Observable<UploadedDocument>((subscriber) => {
      subscriber.error(new Error(this.unavailableReason));
    });
  }
}
