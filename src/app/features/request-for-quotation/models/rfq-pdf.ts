import { RfqStatus } from './rfq.model';

/** An RFQ can be downloaded as a PDF once it has been issued (a draft is not a document yet). */
export const canDownloadRfqPdf = (status: RfqStatus | null | undefined): boolean => !!status && status !== 'DRAFT';

/** The message for a failed download (the API answers with JSON inside a Blob). */
export async function pdfErrorMessage(err: unknown): Promise<string> {
  const body = (err as { error?: unknown })?.error;
  if (body instanceof Blob) {
    try {
      const parsed = JSON.parse(await body.text()) as { message?: string | string[] };
      const m = parsed.message;
      if (m) return Array.isArray(m) ? m.join(' ') : m;
    } catch { /* not JSON */ }
  }
  return 'Unable to download the PDF. Please try again.';
}
