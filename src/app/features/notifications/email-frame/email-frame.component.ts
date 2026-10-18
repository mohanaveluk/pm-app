import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Shows an email's HTML exactly as it was sent, isolated in a sandboxed iframe:
 * no scripts run, its styles cannot leak into the application, and links open
 * in a new tab. The frame grows to the email's height.
 */
@Component({
  selector: 'app-email-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <iframe
      #frame
      class="email-frame"
      title="Email content"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      [attr.srcdoc]="srcdoc()"
      [style.height.px]="height()"
      (load)="fit()"
    ></iframe>
  `,
  styles: [`
    :host { display: block; }
    .email-frame { display: block; width: 100%; border: 0; background: transparent; }
  `],
})
export class EmailFrameComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  readonly html = input.required<string>();

  protected readonly height = signal(400);

  /**
   * The email, with links sent to a new tab. Trusted only for the iframe's
   * srcdoc — the sandbox (no allow-scripts) is what keeps it inert.
   */
  protected readonly srcdoc = computed<SafeHtml>(() => {
    const head = '<base target="_blank"><meta name="color-scheme" content="light">';
    const body = this.html() ?? '';
    const doc = /<head[^>]*>/i.test(body)
      ? body.replace(/<head([^>]*)>/i, `<head$1>${head}`)
      : `<!DOCTYPE html><html><head>${head}</head><body style="margin:0">${body}</body></html>`;
    return this.sanitizer.bypassSecurityTrustHtml(doc);
  });

  protected fit(): void {
    const doc = this.frame().nativeElement.contentDocument;
    if (!doc) return;
    const h = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
    if (h > 0) this.height.set(h + 8);
  }
}
