import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'features',
    loadComponent: () => import('./features/features/features.component').then(m => m.FeaturesComponent),
  },
  {
    path: 'about-us',
    loadComponent: () => import('./features/about-us/about-us.component').then(m => m.AboutUsComponent),
  },
  {
    path: 'pricing',
    loadComponent: () => import('./features/pricing/pricing.component').then(m => m.PricingComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent),
  },
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register-organization',
        loadComponent: () => import('./features/auth/register-organization/register-organization.component').then(m => m.RegisterOrganizationComponent),
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/user/edit-profile/edit-profile.component').then(m => m.EditProfileComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['OrganizationAdmin', 'SuperAdmin'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/user-list/user-list.component').then(m => m.UserListComponent),
      },
      {
        path: 'users/create',
        loadComponent: () => import('./features/admin/users/create-user/create-user.component').then(m => m.CreateUserComponent),
      },
      {
        path: 'organization/profile',
        loadComponent: () => import('./features/admin/organization-profile/organization-profile.component').then(m => m.OrganizationProfileComponent),
      },
    ],
  },
  {
    path: 'manager',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Manager'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
