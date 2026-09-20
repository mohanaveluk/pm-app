import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';

type VerifyState = 'verifying' | 'success' | 'error';

/**
 * Landing page for the link emailed to a newly-added user:
 * /auth/verifyemail/:userGuid/:code — verifies on load and reports the outcome.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly state = signal<VerifyState>('verifying');
  protected readonly message = signal('');

  ngOnInit(): void {
    const userGuid = this.route.snapshot.paramMap.get('userGuid') ?? '';
    const code = this.route.snapshot.paramMap.get('code') ?? '';

    if (!userGuid || !code) {
      this.fail('This verification link is incomplete. Please use the link from your email.');
      return;
    }

    this.auth.verifyEmail(userGuid, code).subscribe({
      next: (res) => {
        this.message.set(res?.message || 'Your email address has been verified.');
        this.state.set('success');
      },
      error: (err: HttpErrorResponse) => this.fail(this.messageFor(err)),
    });
  }

  private fail(message: string): void {
    this.message.set(message);
    this.state.set('error');
  }

  private messageFor(err: HttpErrorResponse): string {
    const serverMessage = err.error?.message;
    const text = Array.isArray(serverMessage) ? serverMessage.join(' · ') : serverMessage;
    if (err.status === 410) {
      return text || 'This verification link has expired. Ask your administrator to send a new one.';
    }
    if (err.status === 0) {
      return 'Unable to reach the server. Check your connection and try again.';
    }
    return text || 'We could not verify your email. The link may be invalid or already used.';
  }
}
