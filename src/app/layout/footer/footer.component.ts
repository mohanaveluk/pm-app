import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, MatIconModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
  readonly quickLinks = [
    { label: 'Home', path: '/home' },
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'About', path: '/about-us' },
    { label: 'Contact', path: '/contact' },
  ];
  readonly social = [
    { icon: 'language', label: 'Website' },
    { icon: 'code',     label: 'GitHub' },
    { icon: 'email',    label: 'Email' },
  ];
}
