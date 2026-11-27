import { Component, inject, HostListener, ElementRef, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ProductList, Category } from '../../../core/models/product.models';
import { MediaUrlPipe } from '../../pipes/media-url.pipe';
import { mediaUrl } from '../../../core/utils/media';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive, FormsModule, NgIf, NgFor,
    MatToolbarModule, MatIconModule, MatButtonModule,
    MatMenuModule, MatInputModule, MatDividerModule,
    MediaUrlPipe
  ],
  template: `
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <div class="announcement-bar" *ngIf="announcements.length" role="marquee" aria-live="polite">
      <span>{{ announcements[0] }}</span>
    </div>

    <header class="site-header" role="banner">
      <div class="container header-inner">
        <!-- Hamburger (mobile) -->
        <button class="hamburger" (click)="toggleMobileMenu()" aria-label="Toggle navigation">
          <mat-icon>{{ mobileMenuOpen ? 'close' : 'menu' }}</mat-icon>
        </button>

        <!-- Logo -->
        <a routerLink="/" class="logo" aria-label="Home" (click)="closeMobileMenu()">
          <div class="logo-icon-wrap">
            <img src="/assets/images/logo.png" alt="Siddham Pharmacy logo" class="logo-img" width="44" height="44"/>
            <span class="logo-gold-ring" aria-hidden="true"></span>
          </div>
          <div class="logo-brand">
            <div class="logo-wordmark">
              <span class="logo-name">SIDDHAM</span>
              <span class="logo-sub">PHARMACY</span>
            </div>
            <span class="logo-tagline">Rooted in Ayurveda. Inspired by Wellness.</span>
          </div>
        </a>


        <!-- Actions -->
        <div class="header-actions">
          <a class="hdr-icon-btn" routerLink="/wishlist" matTooltip="Wishlist">
            <mat-icon>favorite_border</mat-icon>
            <span class="hdr-badge" *ngIf="wishlistService.count() > 0">{{ wishlistService.count() }}</span>
          </a>

          <a class="hdr-icon-btn hide-xs" routerLink="/compare" matTooltip="Compare">
            <mat-icon>compare_arrows</mat-icon>
            <span class="hdr-badge" *ngIf="productService.compareCount() > 0">{{ productService.compareCount() }}</span>
          </a>

          <a class="hdr-icon-btn" routerLink="/cart" matTooltip="Cart">
            <mat-icon>shopping_cart</mat-icon>
            <span class="hdr-badge" *ngIf="cartService.itemCount() > 0">{{ cartService.itemCount() }}</span>
          </a>

          <ng-container *ngIf="auth.isLoggedIn(); else loginBtn">
            <button mat-button [matMenuTriggerFor]="userMenu" class="user-btn">
              <mat-icon>account_circle</mat-icon>
              <span class="hide-sm">{{ auth.customerUser()?.firstName }}</span>
              <mat-icon class="hide-sm">arrow_drop_down</mat-icon>
            </button>
            <mat-menu #userMenu>
              <button mat-menu-item routerLink="/account/dashboard"><mat-icon>dashboard</mat-icon> My Account</button>
              <button mat-menu-item routerLink="/account/profile"><mat-icon>person</mat-icon> My Profile</button>
              <button mat-menu-item routerLink="/account/orders"><mat-icon>receipt_long</mat-icon> My Orders</button>
              <button mat-menu-item routerLink="/account/returns"><mat-icon>assignment_return</mat-icon> Returns</button>
              <button mat-menu-item routerLink="/account/referral"><mat-icon>card_giftcard</mat-icon> Referral & Rewards</button>
              <mat-divider />
              <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon> Logout</button>
            </mat-menu>
          </ng-container>

          <ng-template #loginBtn>
            <button mat-button routerLink="/auth/login" class="login-btn">
              <mat-icon>login</mat-icon>
              <span class="hide-sm">Login</span>
            </button>
          </ng-template>
        </div>
      </div>

      <!-- Desktop Navigation -->
      <nav class="main-nav desktop-nav" aria-label="Main navigation">
        <div class="container nav-inner">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
          <div class="mega-menu-wrapper" (mouseenter)="showMegaMenu=true" (mouseleave)="showMegaMenu=false">
            <a class="nav-link-shop" [class.active]="isShopActive">
              <span>Shop</span>
              <span class="shop-arrow">&#9660;</span>
            </a>
            <div class="mega-menu" *ngIf="showMegaMenu">
              <div class="mega-menu-inner container">
                <div class="mega-col">
                  <h5>By Category</h5>
                  <ng-container *ngFor="let cat of menuCategories">
                    <span class="mega-cat-parent" *ngIf="cat.subCategories.length">{{ cat.name }}</span>
                    <a *ngFor="let sub of cat.subCategories"
                       [routerLink]="['/products']" [queryParams]="{categoryId: sub.id}"
                       (click)="showMegaMenu=false" class="mega-cat-sub">{{ sub.name }}</a>
                    <a *ngIf="!cat.subCategories.length"
                       [routerLink]="['/products']" [queryParams]="{categoryId: cat.id}"
                       (click)="showMegaMenu=false">{{ cat.name }}</a>
                  </ng-container>
                </div>
                <div class="mega-col">
                  <h5>Ingredients</h5>
                  <a *ngFor="let ing of spotlightIngredients"
                     [routerLink]="['/products']" [queryParams]="{search: ing}"
                     (click)="showMegaMenu=false">{{ ing }}</a>
                </div>
                <div class="mega-quiz-col">
                  <div class="mega-quiz-card">
                    <div class="quiz-overlay">
                      <p class="quiz-eyebrow">Discover Your Dosha</p>
                      <h4 class="quiz-heading">Find what's right for your body type</h4>
                      <a routerLink="/dosha-quiz" class="quiz-btn" (click)="showMegaMenu=false">Start Quiz</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <a routerLink="/dosha-quiz" routerLinkActive="active">Dosha Quiz</a>
          <a routerLink="/consultation" routerLinkActive="active">Consultation</a>
          <a routerLink="/about" routerLinkActive="active">About</a>
          <a routerLink="/blogs" routerLinkActive="active">Blogs</a>
          <a routerLink="/gallery" routerLinkActive="active">Gallery</a>
          <a routerLink="/testimonials" routerLinkActive="active">Reviews</a>
          <a routerLink="/contact" routerLinkActive="active">Contact</a>
          <a routerLink="/track-order" routerLinkActive="active">Track Order</a>
        </div>
      </nav>

      <!-- Mobile Nav Drawer -->
      <div class="mobile-nav-overlay" *ngIf="mobileMenuOpen" (click)="closeMobileMenu()"></div>
      <nav class="mobile-nav" [class.open]="mobileMenuOpen" aria-label="Mobile navigation">
        <div class="mobile-nav-header">
          <span>Menu</span>
          <button mat-icon-button (click)="closeMobileMenu()"><mat-icon>close</mat-icon></button>
        </div>

        <div class="mobile-nav-user" *ngIf="auth.isLoggedIn()">
          <mat-icon>account_circle</mat-icon>
          <span>{{ auth.customerUser()?.firstName }} {{ auth.customerUser()?.lastName }}</span>
        </div>

        <div class="mobile-nav-links">
          <a routerLink="/" (click)="closeMobileMenu()"><mat-icon>home</mat-icon> Home</a>
          <a routerLink="/products" (click)="closeMobileMenu()"><mat-icon>storefront</mat-icon> Shop All</a>

          <div class="mobile-cat-section" *ngIf="menuCategories.length">
            <span class="mobile-nav-label">Categories</span>
            <ng-container *ngFor="let cat of menuCategories">
              <a *ngFor="let sub of cat.subCategories"
                [routerLink]="['/products']" [queryParams]="{categoryId: sub.id}"
                (click)="closeMobileMenu()" class="mobile-sub-link">{{ sub.name }}</a>
              <a *ngIf="!cat.subCategories.length"
                [routerLink]="['/products']" [queryParams]="{categoryId: cat.id}"
                (click)="closeMobileMenu()" class="mobile-sub-link">{{ cat.name }}</a>
            </ng-container>
          </div>

          <a routerLink="/dosha-quiz" (click)="closeMobileMenu()"><mat-icon>psychology</mat-icon> Dosha Quiz</a>
          <a routerLink="/consultation" (click)="closeMobileMenu()"><mat-icon>medical_services</mat-icon> Consultation</a>
          <a routerLink="/blogs" (click)="closeMobileMenu()"><mat-icon>article</mat-icon> Blogs</a>
          <a routerLink="/gallery" (click)="closeMobileMenu()"><mat-icon>photo_library</mat-icon> Gallery</a>
          <a routerLink="/testimonials" (click)="closeMobileMenu()"><mat-icon>star</mat-icon> Reviews</a>
          <a routerLink="/about" (click)="closeMobileMenu()"><mat-icon>info</mat-icon> About</a>
          <a routerLink="/contact" (click)="closeMobileMenu()"><mat-icon>contact_mail</mat-icon> Contact</a>
          <a routerLink="/track-order" (click)="closeMobileMenu()"><mat-icon>local_shipping</mat-icon> Track Order</a>
        </div>

        <div class="mobile-nav-footer">
          <ng-container *ngIf="auth.isLoggedIn(); else mobileLogin">
            <a routerLink="/account/dashboard" (click)="closeMobileMenu()"><mat-icon>dashboard</mat-icon> My Account</a>
            <a routerLink="/account/profile" (click)="closeMobileMenu()"><mat-icon>person</mat-icon> My Profile</a>
            <a routerLink="/account/orders" (click)="closeMobileMenu()"><mat-icon>receipt_long</mat-icon> My Orders</a>
            <button (click)="auth.logout(); closeMobileMenu()"><mat-icon>logout</mat-icon> Logout</button>
          </ng-container>
          <ng-template #mobileLogin>
            <a routerLink="/auth/login" (click)="closeMobileMenu()" class="mobile-login-btn">
              <mat-icon>login</mat-icon> Login / Register
            </a>
          </ng-template>
        </div>
      </nav>
    </header>
  `,
  styles: [`
    .skip-link {
      position: absolute; left: -9999px; top: 8px; z-index: 9999;
      background: var(--primary); color: #fff; padding: 8px 16px; border-radius: 4px;
      &:focus { left: 8px; }
    }

    .announcement-bar {
      background: var(--primary); color: #fff; text-align: center;
      padding: 8px; font-size: 13px; font-weight: 500;
    }

    .site-header {
      background: #fff; box-shadow: var(--shadow-sm);
      position: sticky; top: 0; z-index: 1000;
    }

    .header-inner {
      display: grid; grid-template-columns: auto 1fr auto;
      align-items: center; gap: 20px; padding: 10px 16px;
    }

    .logo {
      display: flex; align-items: center; gap: 13px;
      text-decoration: none; flex-shrink: 0;
    }

    .logo-icon-wrap {
      position: relative; flex-shrink: 0;
      width: 52px; height: 52px;
    }
    .logo-img {
      width: 52px; height: 52px; object-fit: contain;
      border-radius: 50%;
      position: relative; z-index: 1;
    }
    .logo-gold-ring {
      position: absolute; inset: -3px; border-radius: 50%;
      border: 1.5px solid #B59A5A;
      opacity: .55;
    }

    .logo-brand {
      display: flex; flex-direction: column; gap: 3px;
    }
    .logo-wordmark {
      display: flex; align-items: baseline; gap: 5px; line-height: 1;
    }
    .logo-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 22px; font-weight: 600; letter-spacing: .04em;
      color: #12372A; line-height: 1;
    }
    .logo-sub {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 13px; font-weight: 500; letter-spacing: .18em;
      color: #12372A; line-height: 1;
      border-left: 1px solid #B59A5A; padding-left: 6px; margin-left: 1px;
    }
    .logo-tagline {
      font-family: 'Inter', sans-serif;
      font-size: 9.5px; font-weight: 500; letter-spacing: .055em;
      color: #66736B; white-space: nowrap;
    }

    /* Search */
    .search-bar {
      max-width: 340px; width: 100%; margin: 0 auto; position: relative;
      display: flex; align-items: center;
      background: var(--bg); border-radius: 100px;
      padding: 0 12px; border: 1px solid var(--border);
      transition: border-color 0.2s, box-shadow 0.2s;
      &:focus-within { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(6,78,59,0.08); }
      mat-icon { color: var(--text-muted); font-size: 17px; flex-shrink: 0; }
      .search-input { flex: 1; border: none; background: transparent; padding: 8px 8px; font-size: 13px; outline: none; color: var(--text-primary); &::placeholder { color: #94a3b8; } }
      .clear-btn { flex-shrink: 0; width: 24px; height: 24px; }
    }

    .suggestions-dropdown {
      position: absolute; top: calc(100% + 8px); left: 0; right: 0;
      background: #fff; border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
      border: 1px solid var(--border); z-index: 2000; overflow: hidden;
    }

    .suggestion-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 16px;
      transition: background 0.15s; cursor: pointer;
      &:hover { background: var(--bg); }
      .sug-img { width: 40px; height: 40px; object-fit: contain; border-radius: 6px; border: 1px solid var(--border); }
      .sug-info { flex: 1; display: flex; flex-direction: column; .sug-name { font-size: 14px; font-weight: 500; color: var(--text-primary); } .sug-cat { font-size: 12px; color: var(--text-muted); } }
      .sug-price { font-size: 14px; font-weight: 700; color: var(--primary); }
    }

    .suggestion-all {
      display: block; padding: 10px 16px; text-align: center;
      font-size: 13px; font-weight: 600; color: var(--primary);
      background: var(--bg); border-top: 1px solid var(--border);
      &:hover { background: var(--primary-light); }
    }

    /* Actions */
    .header-actions { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }

    .hdr-icon-btn {
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 50%;
      color: var(--text-primary); text-decoration: none; cursor: pointer;
      transition: background .18s;
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
      &:hover { background: var(--bg); }
    }

    .hdr-badge {
      position: absolute; top: -4px; right: -4px;
      min-width: 18px; height: 18px; border-radius: 50%;
      background: #e53935; color: #fff;
      font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      padding: 0 3px;
      border: 2px solid #fff;
      pointer-events: none;
      box-shadow: 0 1px 4px rgba(229,57,53,0.4);
      line-height: 1;
    }

    /* Main Nav */
    .main-nav {
      border-top: 1px solid var(--border); background: var(--primary);
      .nav-inner { display: flex; align-items: center; gap: 0; flex-wrap: wrap; justify-content: center; }
      a {
        color: rgba(255,255,255,0.85); padding: 12px 16px; font-size: 13px; font-weight: 500;
        transition: background 0.2s, color 0.2s; white-space: nowrap; display: block;
        &:hover { color: #fff; background: rgba(0,0,0,0.15); }
        &.active { color: #fff; background: rgba(0,0,0,0.3); font-weight: 700; }
      }
    }

    .nav-link-shop {
      color: rgba(255,255,255,0.85); padding: 12px 16px; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: background 0.2s;
      display: inline-flex !important; align-items: center; gap: 6px; line-height: 1;
      &:hover, &.active { color: #fff; background: rgba(0,0,0,0.15); }
      .shop-arrow { font-size: 8px; line-height: 1; }
    }

    /* Mega Menu */
    /* static: the menu is placed against the whole header, so it opens in the middle of the page */
    .mega-menu-wrapper { position: static; }

    .mega-menu {
      position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      width: 100vw; max-width: 900px; background: #fff; box-shadow: var(--shadow-lg);
      border-radius: 0 0 var(--radius-md) var(--radius-md); border-top: 3px solid var(--primary);
      z-index: 999;
    }

    .mega-menu-inner {
      display: grid; grid-template-columns: 1fr 1fr 220px;
      gap: 0; padding: 24px 24px 24px 0;
    }

    .mega-col {
      padding: 0 24px;
      border-right: 1px solid var(--border);
      h5 { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin: 0 0 12px; }
      a { display: block; padding: 5px 0; font-size: 13px; color: var(--text-secondary); transition: color 0.15s; &:hover { color: var(--primary); } }
    }

    .mega-cat-parent {
      display: block; font-size: 11px; font-weight: 700; text-transform: uppercase;
      color: var(--text-muted); letter-spacing: .8px; margin: 14px 0 4px;
      &:first-child { margin-top: 0; }
    }
    .mega-cat-sub { padding-left: 10px !important; }

    .mega-quiz-col { padding-left: 20px; }
    .mega-quiz-card {
      height: 100%; min-height: 180px; border-radius: var(--radius-md); overflow: hidden;
      background-image: url(mediaUrl('/uploads/heroes/hero-dosha-quiz.jpg'));
      background-size: cover; background-position: center; position: relative;
    }
    .quiz-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(160deg, rgba(6,78,59,0.78) 0%, rgba(6,78,59,0.50) 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 20px; gap: 8px; text-align: center;
    }
    .quiz-eyebrow {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px;
      color: rgba(255,255,255,0.70); margin: 0;
    }
    .quiz-heading {
      font-size: 14px; font-weight: 700; color: #fff; margin: 0 0 4px; line-height: 1.4;
    }
    .quiz-btn {
      display: inline-block; padding: 9px 22px;
      background: var(--primary); color: #fff; border-radius: 100px;
      font-size: 12px; font-weight: 700; letter-spacing: .3px;
      border: 2px solid rgba(255,255,255,0.35);
      transition: background 0.2s, transform 0.15s, border-color 0.2s;
      &:hover { background: #065f46; border-color: rgba(255,255,255,0.6); transform: translateY(-1px); }
    }

    /* Hamburger - hidden on desktop */
    .hamburger {
      display: none; align-items: center; justify-content: center;
      width: 40px; height: 40px; border: none; background: transparent;
      cursor: pointer; border-radius: 8px; color: var(--text-primary);
      transition: background 0.2s; flex-shrink: 0;
      mat-icon { font-size: 24px; width: 24px; height: 24px; line-height: 24px; }
      &:hover { background: var(--bg); }
    }

    /* Desktop nav */
    .desktop-nav { display: block; }

    /* Mobile overlay */
    .mobile-nav-overlay {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1100;
    }

    /* Mobile nav drawer */
    .mobile-nav {
      display: none; position: fixed; top: 0; left: 0; bottom: 0; width: 300px;
      background: #fff; z-index: 1200; overflow-y: auto;
      transform: translateX(-100%); transition: transform 0.28s cubic-bezier(.4,0,.2,1);
      box-shadow: 4px 0 20px rgba(0,0,0,0.15);
      &.open { transform: translateX(0); }
    }

    .mobile-nav-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 16px 12px; border-bottom: 1px solid var(--border);
      background: var(--primary); color: #fff;
      span { font-size: 16px; font-weight: 700; letter-spacing: .02em; }
      button { color: #fff; }
    }

    .mobile-nav-user {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-bottom: 1px solid var(--border);
      background: #f0fdf4; font-size: 14px; font-weight: 600; color: var(--primary);
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }

    .mobile-nav-links {
      padding: 8px 0;
      a, button {
        display: flex; align-items: center; gap: 12px;
        padding: 13px 20px; font-size: 14px; color: var(--text-primary);
        text-decoration: none; border: none; background: transparent;
        width: 100%; cursor: pointer; transition: background 0.15s;
        mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--primary); }
        &:hover { background: var(--bg); color: var(--primary); }
      }
    }

    .mobile-nav-label {
      display: block; font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: var(--text-muted); padding: 12px 20px 4px;
    }

    .mobile-sub-link {
      padding-left: 48px !important; font-size: 13px !important;
      color: var(--text-secondary) !important;
    }

    .mobile-cat-section { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 4px 0; margin: 4px 0; }

    .mobile-nav-footer {
      border-top: 2px solid var(--border); padding: 8px 0;
      a, button {
        display: flex; align-items: center; gap: 12px;
        padding: 13px 20px; font-size: 14px; color: var(--text-secondary);
        text-decoration: none; border: none; background: transparent;
        width: 100%; cursor: pointer; transition: background 0.15s;
        mat-icon { font-size: 20px; width: 20px; height: 20px; }
        &:hover { background: var(--bg); }
      }
    }

    .mobile-login-btn {
      color: var(--primary) !important; font-weight: 600;
      mat-icon { color: var(--primary) !important; }
    }


    @media (max-width: 900px) {
      .logo-brand { display: none; }
      .mega-menu { display: none; }
      /* !important: the Material icon / button styles also set display, and the logged-in icon + name + arrow were squeezed into one small button */
      .hide-sm { display: none !important; }
    }

    @media (max-width: 768px) {
      .hamburger { display: flex; }
      .desktop-nav { display: none; }
      .desktop-search { display: none !important; }
      .mobile-nav { display: block; }
      .mobile-nav-overlay { display: block; }
      .header-inner { grid-template-columns: auto 1fr auto; gap: 8px; padding: 8px 12px; }
      .hide-xs { display: none !important; }
      .user-btn, .login-btn {
        width: 40px !important; height: 40px !important; min-width: 40px !important;
        padding: 0 !important; border-radius: 50% !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        flex-shrink: 0;
      }
    }

    @media (max-width: 480px) {
      .logo-img { width: 36px; height: 36px; }
      .logo-icon-wrap { width: 36px; height: 36px; }
      .header-actions { gap: 2px; }
      .hdr-icon-btn { width: 36px; height: 36px; }
      .hamburger { width: 36px; height: 36px; }
      .user-btn, .login-btn {
        width: 36px !important; height: 36px !important; min-width: 36px !important;
      }
    }
  `]
})
export class HeaderComponent implements OnInit {
  auth = inject(AuthService);
  cartService = inject(CartService);
  productService = inject(ProductService);
  wishlistService = inject(WishlistService);
  private router = inject(Router);
  private el = inject(ElementRef);

  searchQuery = '';
  showSuggestions = false;
  suggestions: ProductList[] = [];
  showMegaMenu = false;
  mobileMenuOpen = false;
  announcements: string[] = ['🌿 Free shipping on orders above ₹999!'];

  private searchSubject = new Subject<string>();

  menuCategories: Array<Category & { subCategories: Category[] }> = [];
  spotlightIngredients = ['Ashwagandha', 'Turmeric', 'Neem', 'Amla', 'Brahmi', 'Shatavari'];

  get isShopActive(): boolean {
    return this.router.url.startsWith('/products');
  }

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => q.length > 1 ? this.productService.getAll({ search: q, pageSize: 6 }) : of(null))
    ).subscribe(res => {
      this.suggestions = res?.data?.items ?? [];
      this.showSuggestions = this.suggestions.length > 0;
    });
  }

  ngOnInit(): void {
    this.cartService.loadCart().subscribe({ error: () => {} });
    this.productService.getRootCategories().subscribe(res => {
      const roots: Category[] = res?.data ?? [];
      this.menuCategories = roots
        .filter(cat => cat.isActive)
        .map(cat => ({
          ...cat,
          subCategories: (cat.subCategories ?? []).filter(s => s.isActive && s.productCount > 0)
        }))
        .filter(cat => cat.productCount > 0 || cat.subCategories.length > 0);
    });
  }

  onSearchInput(query: string): void {
    if (!query.trim()) { this.closeSuggestions(); return; }
    this.searchSubject.next(query.trim());
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], { queryParams: { search: this.searchQuery.trim() } });
      this.closeSuggestions();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.closeSuggestions();
  }

  closeSuggestions(): void {
    this.showSuggestions = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target)) this.closeSuggestions();
  }
}
