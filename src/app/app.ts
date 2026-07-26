import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenExpiryService } from './core/services/token-expiry.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  private readonly tokenExpiryService = inject(TokenExpiryService);
  // Injected so it initializes at app bootstrap regardless of which layout
  // (public or admin) the current route renders — otherwise the dark-theme
  // class would only ever get applied once an admin-shell route loads.
  private readonly themeService = inject(ThemeService);

  constructor() {
    this.tokenExpiryService.startExpiryCheck();
  }
}
