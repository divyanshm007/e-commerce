import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/services/auth.service';

interface NavItem { icon: string; label: string; route: string; }
interface NavGroup { title: string; items: NavItem[]; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, TooltipModule],
  template: `
    <div class="admin-shell">

      <!-- Mobile overlay -->
      <div class="adm-overlay" *ngIf="mobileOpen" (click)="closeMobileMenu()"></div>

      <!-- ===== SIDEBAR ===== -->
      <nav class="adm-sidebar" [class.collapsed]="collapsed" [class.mobile-open]="mobileOpen">

        <!-- Logo -->
        <div class="adm-logo">
          <a class="logo-mark" routerLink="/admin/dashboard" style="text-decoration:none;color:inherit;cursor:pointer" *ngIf="!collapsed" aria-label="Dashboard">
            <img src="assets/images/logo.png" alt="Logo" class="logo-img" />
            <div class="logo-text">
              <span class="logo-name">Sidham</span>
              <span class="logo-sub">Admin Panel</span>
            </div>
          </a>
          <a class="logo-icon-only" routerLink="/admin/dashboard" style="text-decoration:none;color:inherit;cursor:pointer" *ngIf="collapsed" aria-label="Dashboard">
            <img src="assets/images/logo.png" alt="Logo" class="logo-img-sm" />
          </a>
          <button class="collapse-btn" (click)="toggleMenu()"
            [pTooltip]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            tooltipPosition="right">
            <i class="pi" [class]="collapsed ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
          </button>
        </div>

        <!-- Nav groups -->
        <div class="adm-nav">
          <ng-container *ngFor="let group of navGroups">
            <div class="nav-section-label" *ngIf="!collapsed">{{ group.title }}</div>
            <div class="nav-section-divider" *ngIf="collapsed"></div>
            <a *ngFor="let item of group.items"
               class="nav-item"
               [routerLink]="['/admin', item.route]"
               routerLinkActive="active"
               [pTooltip]="collapsed ? item.label : ''"
               tooltipPosition="right"
               (click)="closeMobileMenu()">
              <i class="pi" [class]="item.icon"></i>
              <span *ngIf="!collapsed">{{ item.label }}</span>
            </a>
          </ng-container>
        </div>

        <!-- User footer -->
        <div class="adm-user" *ngIf="!collapsed">
          <div class="user-avatar">{{ initials }}</div>
          <div class="user-info">
            <p class="user-name">{{ auth.user()?.fullName }}</p>
            <p class="user-role">Super Admin</p>
          </div>
          <button class="logout-btn" (click)="auth.adminLogout()"
            pTooltip="Sign out" tooltipPosition="top">
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
        <div class="adm-user-collapsed" *ngIf="collapsed">
          <div class="user-avatar-sm" pTooltip="{{ auth.user()?.fullName }}" tooltipPosition="right">
            {{ initials }}
          </div>
          <button class="logout-btn" (click)="auth.adminLogout()"
            pTooltip="Sign out" tooltipPosition="right">
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </nav>

      <!-- ===== MAIN ===== -->
      <div class="adm-main" [class.expanded]="collapsed">

        <!-- Topbar -->
        <header class="adm-topbar">
          <button class="menu-btn" (click)="toggleMenu()" title="Toggle sidebar">
            <i class="pi pi-bars"></i>
          </button>

          <div class="topbar-brand">
            <span class="topbar-env-badge">Admin</span>
          </div>

          <div class="topbar-right">
            <a class="topbar-icon-btn" routerLink="/" target="_blank"
              pTooltip="View storefront" tooltipPosition="bottom">
              <i class="pi pi-external-link"></i>
            </a>
            <button class="topbar-icon-btn notif-btn"
              pTooltip="Notifications" tooltipPosition="bottom">
              <i class="pi pi-bell"></i>
              <span class="notif-dot"></span>
            </button>
            <div class="topbar-divider"></div>
            <div class="topbar-user">
              <div class="topbar-avatar">{{ initials }}</div>
              <div class="topbar-user-info">
                <span class="topbar-name">{{ auth.user()?.fullName }}</span>
                <span class="topbar-role">Super Admin</span>
              </div>
              <i class="pi pi-chevron-down topbar-caret"></i>
            </div>
          </div>
        </header>

        <!-- Page content -->
        <div class="adm-content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Shell ── */
    .admin-shell {
      display: flex;
      min-height: 100vh;
      background: #F6F8FA;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }

    /* ── Sidebar ── */
    .adm-sidebar {
      width: 256px;
      min-height: 100vh;
      background: #0F172A;
      color: #fff;
      flex-shrink: 0;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      z-index: 200;
      transition: width 0.25s cubic-bezier(.4,0,.2,1), transform 0.28s cubic-bezier(.4,0,.2,1);
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.06) transparent;

      &.collapsed { width: 64px; }

      &::-webkit-scrollbar { width: 3px; }
      &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
    }

    /* Logo area */
    .adm-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      height: 56px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .logo-mark {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .logo-img {
      width: 32px;
      height: 32px;
      object-fit: contain;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .logo-icon-only {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }

    .logo-img-sm {
      width: 30px;
      height: 30px;
      object-fit: contain;
      border-radius: 6px;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
      min-width: 0;
    }

    .logo-name {
      font-size: 14px;
      font-weight: 700;
      color: #F9FAFB;
      letter-spacing: -0.2px;
      white-space: nowrap;
    }

    .logo-sub {
      font-size: 10px;
      font-weight: 500;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .collapse-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: none;
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;

      &:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.75); }

      .pi { font-size: 11px; }
    }

    /* Nav */
    .adm-nav {
      flex: 1;
      padding: 6px 0 8px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-section-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.9px;
      color: rgba(255,255,255,0.2);
      text-transform: uppercase;
      padding: 14px 16px 4px;
      white-space: nowrap;
      overflow: hidden;
    }

    .nav-section-divider {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 8px 12px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      margin: 1px 8px;
      border-radius: 8px;
      color: rgba(255,255,255,0.5);
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-decoration: none;
      transition: background 0.1s, color 0.1s;
      cursor: pointer;

      .pi {
        font-size: 14px;
        flex-shrink: 0;
        width: 16px;
        text-align: center;
      }

      &:hover {
        background: rgba(255,255,255,0.07);
        color: rgba(255,255,255,0.85);
      }

      &.active {
        background: rgba(15,118,110,0.2);
        color: #2DD4BF;
        font-weight: 600;
      }
    }

    /* Collapsed nav centering */
    .adm-sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 9px;
      margin: 1px 8px;
      gap: 0;
    }

    /* User footer */
    .adm-user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-top: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .adm-user-collapsed {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px 8px;
      border-top: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0F766E, #14B8A6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      flex-shrink: 0;
    }

    .user-avatar-sm {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0F766E, #14B8A6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 11px;
      cursor: default;
    }

    .user-info { flex: 1; overflow: hidden; }

    .user-name {
      font-size: 12.5px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 10.5px;
      color: rgba(255,255,255,0.3);
      margin: 1px 0 0;
    }

    .logout-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;

      .pi { font-size: 13px; }

      &:hover { background: rgba(239,68,68,0.15); color: #F87171; }
    }

    /* ── Main content ── */
    .adm-main {
      flex: 1;
      margin-left: 256px;
      min-height: 100vh;
      background: #F6F8FA;
      transition: margin-left 0.25s cubic-bezier(.4,0,.2,1);
      display: flex;
      flex-direction: column;

      &.expanded { margin-left: 64px; }
    }

    /* ── Topbar ── */
    .adm-topbar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      padding: 0 20px;
      height: 56px;
      border-bottom: 1px solid #E5E7EB;
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .menu-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
      background: transparent;
      color: #6B7280;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.1s, color 0.1s, border-color 0.1s;
      flex-shrink: 0;

      .pi { font-size: 14px; }

      &:hover { background: #F9FAFB; color: #111827; border-color: #D1D5DB; }
    }

    .topbar-brand { flex: 1; display: flex; align-items: center; }

    .topbar-env-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 6px;
      background: #F0FDFA;
      color: #0F766E;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border: 1px solid #CCFBF1;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .topbar-icon-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: #6B7280;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.1s, color 0.1s;
      position: relative;

      .pi { font-size: 15px; }

      &:hover { background: #F3F4F6; color: #111827; }
    }

    .notif-btn { position: relative; }

    .notif-dot {
      position: absolute;
      top: 9px;
      right: 9px;
      width: 7px;
      height: 7px;
      background: #0F766E;
      border-radius: 50%;
      border: 1.5px solid #fff;
    }

    .topbar-divider {
      width: 1px;
      height: 18px;
      background: #E5E7EB;
      margin: 0 6px;
      flex-shrink: 0;
    }

    .topbar-user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 10px 5px 6px;
      border: 1px solid #E5E7EB;
      border-radius: 22px;
      cursor: pointer;
      transition: background 0.1s, border-color 0.1s;

      &:hover { background: #F9FAFB; border-color: #D1D5DB; }
    }

    .topbar-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0F766E, #14B8A6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
    }

    .topbar-user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .topbar-name { font-size: 12.5px; font-weight: 600; color: #111827; white-space: nowrap; }
    .topbar-role { font-size: 10px; color: #0F766E; font-weight: 500; }

    .topbar-caret { font-size: 10px; color: #9CA3AF; }

    /* ── Page content ── */
    .adm-content { flex: 1; }

    /* ── Mobile overlay ── */
    .adm-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); z-index: 199;
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      .adm-sidebar { transform: translateX(-100%); width: 256px !important; }
      .adm-sidebar.mobile-open { transform: translateX(0); }
      .adm-main { margin-left: 0 !important; }
      .topbar-user-info { display: none; }
      .topbar-caret { display: none; }
      .topbar-env-badge { display: none; }
    }

    @media (max-width: 480px) {
      .adm-topbar { padding: 0 12px; }
    }
  `]
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  collapsed = false;
  mobileOpen = false;

  toggleMenu(): void {
    if (window.innerWidth <= 768) {
      this.mobileOpen = !this.mobileOpen;
      document.body.style.overflow = this.mobileOpen ? 'hidden' : '';
    } else {
      this.collapsed = !this.collapsed;
    }
  }

  closeMobileMenu(): void {
    this.mobileOpen = false;
    document.body.style.overflow = '';
  }

  get initials(): string {
    const u = this.auth.user();
    if (!u) return 'SA';
    const parts = u.fullName?.split(' ') ?? [];
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : u.fullName?.slice(0, 2).toUpperCase() ?? 'SA';
  }

  navGroups: NavGroup[] = [
    {
      title: 'Main',
      items: [{ icon: 'pi-home', label: 'Dashboard', route: 'dashboard' }]
    },
    {
      title: 'Catalog',
      items: [
        { icon: 'pi-th-large', label: 'Categories', route: 'categories' },
        { icon: 'pi-box',      label: 'Products',   route: 'products'   },
      ]
    },
    {
      title: 'Commerce',
      items: [
        { icon: 'pi-file-check',    label: 'Orders',    route: 'orders'    },
        { icon: 'pi-truck',         label: 'Fulfilment', route: 'fulfilment' },
        { icon: 'pi-times-circle',  label: 'Cancel Requests', route: 'cancel-requests' },
        { icon: 'pi-users',         label: 'Customers', route: 'customers' },
        { icon: 'pi-shopping-cart', label: 'Carts',     route: 'carts'     },
        { icon: 'pi-star',          label: 'Reviews',   route: 'reviews'   },
        { icon: 'pi-tag',           label: 'Coupons',   route: 'coupons'   },
        { icon: 'pi-credit-card',   label: 'Payments',  route: 'payments'  },
      ]
    },
    {
      title: 'Content',
      items: [
        { icon: 'pi-images',         label: 'Banners',      route: 'banners'      },
        { icon: 'pi-image',          label: 'Gallery',      route: 'gallery'      },
        { icon: 'pi-comment',        label: 'Testimonials', route: 'testimonials' },
        { icon: 'pi-question-circle',label: 'FAQs',       route: 'faqs'       },
        { icon: 'pi-book',           label: 'Blogs',      route: 'blogs'      },
        { icon: 'pi-list-check',     label: 'Quizzes',    route: 'quizzes'    },
        { icon: 'pi-envelope',       label: 'Newsletter', route: 'newsletter' },
        { icon: 'pi-file-edit',      label: 'Pages',       route: 'pages'       },
        { icon: 'pi-info-circle',    label: 'About Page',  route: 'about-page'  },
        { icon: 'pi-verified',       label: 'Trust Pages', route: 'trust-pages' },
      ]
    },
    {
      title: 'Customer Care',
      items: [
        { icon: 'pi-calendar',      label: 'Consultations',    route: 'consultations'    },
        { icon: 'pi-comments',      label: 'Contact Messages', route: 'contact-messages' },
        { icon: 'pi-history',       label: 'Returns',          route: 'returns'          },
        { icon: 'pi-gift',          label: 'Referrals',        route: 'referrals'        },
      ]
    },
    {
      title: 'Analytics',
      items: [{ icon: 'pi-chart-bar', label: 'Reports', route: 'reports' }]
    },
    {
      title: 'System',
      items: [{ icon: 'pi-cog', label: 'Settings', route: 'settings' }]
    },
  ];
}
