import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgModel, FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { inject } from '@angular/core';
import { ContentService } from '../../../core/services/content.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule, FormsModule, NgIf],
  template: `
    <footer class="site-footer">
      <div class="container footer-grid">
        <!-- Brand -->
        <div class="footer-brand">
          <a class="footer-logo" routerLink="/" style="text-decoration:none;color:inherit;cursor:pointer" aria-label="Home">
            <img src="/assets/images/logo.png" alt="Sidham Pharmacy" class="footer-logo-img"/>
            <span class="footer-brand-name">Sidham Pharmacy</span>
          </a>
          <p>Sidham Pharmacy is a modern, reliable e-commerce platform providing a wide range of authentic medicines and healthcare essentials with fast delivery and exceptional customer care.</p>
          <div class="social-links">
            <a href="https://facebook.com" class="social-btn facebook" aria-label="Follow us on Facebook" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.931-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
            </a>
            <a href="https://youtube.com" class="social-btn youtube" aria-label="Subscribe on YouTube" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a href="https://pinterest.com" class="social-btn pinterest" aria-label="Follow us on Pinterest" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
            </a>
            <a href="https://instagram.com" class="social-btn instagram" aria-label="Follow us on Instagram" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            </a>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><a routerLink="/">Home</a></li>
            <li><a routerLink="/about">About SIDHAM</a></li>
            <li><a routerLink="/products">Products</a></li>
            <li><a routerLink="/gallery">Gallery</a></li>
            <li><a routerLink="/activities">Activities</a></li>
            <li><a routerLink="/blogs">Blogs</a></li>
            <li><a routerLink="/testimonials">Testimonials</a></li>
            <li><a routerLink="/contact">Contact Us</a></li>
            <li><a routerLink="/track-order">Track Your Order</a></li>
          </ul>
        </div>

        <!-- Trust -->
        <div class="footer-links">
          <h4>Why Sidham</h4>
          <ul>
            <li><a routerLink="/why-choose-us">Why Choose Us</a></li>
            <li><a routerLink="/quality-assurance">Quality Assurance</a></li>
            <li><a routerLink="/manufacturing">Manufacturing Process</a></li>
            <li><a routerLink="/certifications">Our Certifications</a></li>
            <li><a routerLink="/lab-testing">Lab Testing</a></li>
            <li><a routerLink="/consultation">Book Consultation</a></li>
            <li><a routerLink="/dosha-quiz">Dosha Quiz</a></li>
            <li><a routerLink="/faqs">FAQs</a></li>
          </ul>
        </div>

        <!-- Newsletter -->
        <div class="footer-newsletter">
          <h4>Stay Updated</h4>
          <p>Subscribe to our newsletter for the latest deals and news.</p>
          <div class="newsletter-form">
            <label for="newsletter-email" class="visually-hidden">Your email address</label>
            <input id="newsletter-email" [(ngModel)]="email" type="email" placeholder="Enter your email" class="newsletter-input" autocomplete="email" aria-label="Enter your email address" />
            <button mat-flat-button color="primary" (click)="subscribe()" [disabled]="subscribing" aria-label="Subscribe to newsletter">
              {{ subscribing ? 'Subscribing...' : 'Subscribe' }}
            </button>
          </div>
          <p *ngIf="subscribeMsg" class="subscribe-msg">{{ subscribeMsg }}</p>
          <div class="trust-badges">
            <img src="/assets/images/ssl.png"      alt="SSL Secured"       class="trust-img" />
            <img src="/assets/images/secure.png"   alt="Secure Website"    class="trust-img" />
            <img src="/assets/images/razorpay.jpg" alt="Razorpay Accepted" class="trust-img razorpay" />
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="container footer-bottom-inner">
          <p class="copyright">&copy; {{ year }} Sidham Pharmacy. All rights reserved.</p>
          <nav class="footer-policy-links" aria-label="Policy links">
            <a routerLink="/page/privacy-policy">Privacy Policy</a>
            <span class="sep" aria-hidden="true">·</span>
            <a routerLink="/page/terms-conditions">Terms &amp; Conditions</a>
            <span class="sep" aria-hidden="true">·</span>
            <a routerLink="/page/shipping-policy">Shipping Policy</a>
            <span class="sep" aria-hidden="true">·</span>
            <a routerLink="/page/return-policy">Return Policy</a>
            <span class="sep" aria-hidden="true">·</span>
            <a routerLink="/page/refund-policy">Refund Policy</a>
          </nav>
        </div>
      </div>

      <!-- WhatsApp Float -->
      <a class="whatsapp-btn" href="https://wa.me/91XXXXXXXXXX" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
        <mat-icon aria-hidden="true">chat</mat-icon>
      </a>
    </footer>
  `,
  styles: [`
    .site-footer {
      background: #052e16;
      color: rgba(255,255,255,0.8);
      margin-top: 64px;
      position: relative;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 2fr;
      gap: 40px;
      padding: 48px 16px;

      @media (max-width: 1024px) and (min-width: 768px) { grid-template-columns: 1fr 1fr; gap: 28px; padding: 40px 24px; }
      @media (max-width: 767px) { grid-template-columns: 1fr; gap: 28px; padding: 36px 16px; }
    }

    .footer-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .footer-logo-img {
      height: 48px;
      width: 48px;
      object-fit: contain;
      border-radius: 50%;
      background: #fff;
      padding: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .footer-brand-name {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.3px;
      line-height: 1.2;
    }

    p { font-size: 14px; line-height: 1.6; margin: 0 0 16px; }

    .social-links {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .social-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.8);
      transition: background 0.2s, color 0.2s, transform 0.2s, border-color 0.2s;

      svg { width: 18px; height: 18px; }

      &:hover { transform: translateY(-3px); color: #fff; }

      &.facebook:hover  { background: #1877F2; border-color: #1877F2; }
      &.youtube:hover   { background: #FF0000; border-color: #FF0000; }
      &.pinterest:hover { background: #E60023; border-color: #E60023; }
      &.instagram:hover {
        background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
        border-color: #dc2743;
      }
    }

    .footer-links {
      h4 { color: #fff; font-size: 16px; font-weight: 700; margin: 0 0 16px; }
      ul { list-style: none; padding: 0; margin: 0; }
      li { margin-bottom: 8px; }
      a { font-size: 14px; color: rgba(255,255,255,0.7); transition: color 0.2s;
        &:hover { color: var(--accent); } }
    }

    .footer-newsletter {
      h4 { color: #fff; font-size: 16px; font-weight: 700; margin: 0 0 8px; }
    }

    .newsletter-form {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .newsletter-input {
      flex: 1;
      min-width: 180px;
      padding: 10px 14px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-size: 14px;
      outline: none;
      &::placeholder { color: rgba(255,255,255,0.5); }
      &:focus { border-color: var(--accent); }
    }

    .subscribe-msg { font-size: 12px; color: var(--accent); margin-top: 8px; }

    .footer-bottom {
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .footer-bottom-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding: 18px 16px;

      @media (max-width: 767px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        padding: 16px;
      }
    }

    .footer-policy-links {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;

      a {
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        white-space: nowrap;
        transition: color 0.2s;
        &:hover { color: var(--accent); }
      }

      .sep {
        font-size: 12px;
        color: rgba(255,255,255,0.25);
      }

      @media (max-width: 767px) {
        a { font-size: 11px; }
        gap: 4px 6px;
        padding-right: 64px;
      }
    }

    .trust-badges {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .trust-img {
      height: 75px;
      width: auto;
      object-fit: contain;
      background: #fff;
      border-radius: 8px;
      padding: 5px 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);

      &.razorpay { height: 62px; }

      @media (max-width: 767px) {
        height: 52px;
        &.razorpay { height: 44px; }
      }
    }

    .copyright {
      font-size: 13px;
      color: rgba(255,255,255,0.45);
      margin: 0;
      text-align: center;
    }

    .visually-hidden {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }

    .whatsapp-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      background: #25d366;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 4px 16px rgba(37,211,102,0.4);
      z-index: 999;
      transition: transform 0.2s;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
      &:hover { transform: scale(1.1); }
    }
  `]
})
export class FooterComponent {
  private contentService = inject(ContentService);
  year = new Date().getFullYear();
  email = '';
  subscribing = false;
  subscribeMsg = '';

  subscribe(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email || !emailRegex.test(this.email)) {
      this.subscribeMsg = 'Please enter a valid email address.';
      return;
    }
    this.subscribing = true;
    this.subscribeMsg = '';
    this.contentService.subscribe(this.email).subscribe({
      next: () => {
        this.subscribeMsg = 'Thank you for subscribing!';
        this.email = '';
        this.subscribing = false;
      },
      error: () => {
        this.subscribeMsg = 'Subscription failed. Try again.';
        this.subscribing = false;
      }
    });
  }
}
