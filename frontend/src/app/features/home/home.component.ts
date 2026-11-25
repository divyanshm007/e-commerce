import {
  Component, OnDestroy, AfterViewInit,
  inject, signal, HostListener, ViewEncapsulation, NgZone
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { ContentService } from '../../core/services/content.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';
import { ProductList, ProductDetail } from '../../core/models/product.models';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  category?: string;
  author: string;
  publishedAt?: string;
  sortOrder: number;
  isActive: boolean;
}

interface Faq {
  id: string;
  question: string;
  answer: string;
  category?: string;
  sortOrder: number;
  isActive: boolean;
}

interface Testimonial {
  id: string;
  customerName: string;
  customerTitle?: string;
  avatarUrl?: string;
  message: string;
  rating: number;
  sortOrder: number;
  isActive: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, NgFor, NgIf, CurrencyPipe, MediaUrlPipe],
  template: `

<!-- LOGO INTRO -->
<div class="lc-intro" id="lc-intro">
  <img class="lc-intro-logo" src="/assets/images/logo.png" alt="Sidham Pharmacy" id="lc-intro-img">
</div>

<!-- ══ SMOOTH SCROLL WRAPPER ══ -->
<div class="lc-wrap" id="lc-wrap">

  <!-- ══════════════ HERO SLIDER ══════════════ -->
  <section class="lc-hero" id="lc-hero"
    (touchstart)="onHeroTouchStart($event)"
    (touchend)="onHeroTouchEnd($event)">

    <!-- Slide backgrounds -->
    <div class="lc-slider-track">
      <div *ngFor="let slide of slides; let i = index"
           class="lc-slide" [class.lc-slide-a]="currentSlide() === i">
        <div class="lc-slide-bg"
             [style.backgroundImage]="'url(' + slide.bg + ')'"
             [style]="{'--bg-pos': slide.bgPos, '--bg-pos-m': slide.bgPosMobile}"></div>
        <div class="lc-slide-ov"></div>
      </div>
    </div>

    <!-- Content panels — one per slide -->
    <div *ngFor="let slide of slides; let i = index"
         class="lc-hc" [class.lc-hc-a]="currentSlide() === i">

      <!-- Botanical stem decoration -->
      <div class="lc-bot" aria-hidden="true">
        <svg width="52" height="190" viewBox="0 0 52 190" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="26" y1="190" x2="26" y2="0" stroke="rgba(96,140,55,0.42)" stroke-width="0.9"/>
          <ellipse cx="26" cy="38"  rx="15" ry="6.5" transform="rotate(-38 26 38)"  stroke="rgba(96,140,55,0.42)" stroke-width="0.9" fill="none"/>
          <ellipse cx="26" cy="38"  rx="15" ry="6.5" transform="rotate(142 26 38)"  stroke="rgba(96,140,55,0.42)" stroke-width="0.9" fill="none"/>
          <ellipse cx="26" cy="88"  rx="12" ry="5.5" transform="rotate(-32 26 88)"  stroke="rgba(96,140,55,0.36)" stroke-width="0.9" fill="none"/>
          <ellipse cx="26" cy="88"  rx="12" ry="5.5" transform="rotate(148 26 88)"  stroke="rgba(96,140,55,0.36)" stroke-width="0.9" fill="none"/>
          <ellipse cx="26" cy="134" rx="9"  ry="4.5" transform="rotate(-28 26 134)" stroke="rgba(96,140,55,0.28)" stroke-width="0.9" fill="none"/>
          <ellipse cx="26" cy="134" rx="9"  ry="4.5" transform="rotate(152 26 134)" stroke="rgba(96,140,55,0.28)" stroke-width="0.9" fill="none"/>
          <circle cx="26" cy="4" r="3" fill="rgba(185,155,55,0.55)"/>
        </svg>
      </div>

      <div class="lc-hc-text">
        <!-- Eyebrow -->
        <p class="lc-ey hero-rv hero-rv-d1">{{ slide.eyebrow }}</p>

        <!-- Ornamental divider -->
        <div class="lc-orn hero-rv hero-rv-d2" aria-hidden="true">
          <span class="lc-orn-l"></span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 0L7.8 4.2L12 6L7.8 7.8L6 12L4.2 7.8L0 6L4.2 4.2Z" fill="rgba(185,155,55,0.75)"/>
          </svg>
          <span class="lc-orn-r"></span>
        </div>

        <!-- Main heading -->
        <h1 class="lc-sh hero-rv hero-rv-d3">
          <span *ngFor="let line of slide.heading" class="lc-sh-ln">{{ line }}</span>
        </h1>

        <!-- Description -->
        <p class="lc-sp hero-rv hero-rv-d4">{{ slide.desc }}</p>

        <!-- CTA -->
        <a class="lc-scta hero-rv hero-rv-d5" [routerLink]="slide.cta.link" (click)="pauseSlider()">
          {{ slide.cta.label }}
          <span class="lc-scta-icon" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="17" cy="17" r="16" fill="rgba(201,168,76,0.18)" stroke="rgba(201,168,76,0.65)" stroke-width="1"/>
              <path d="M12 17h10M18.5 13l4 4-4 4" stroke="#c9a84c" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </a>

        <!-- Sub-text -->
        <p class="lc-ssub">{{ slide.sub }}</p>
      </div>
    </div>

    <!-- Prev arrow -->
    <button class="lc-nav lc-nav-p" (click)="pauseSlider(); prevSlide()" aria-label="Previous slide">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M11 4L6 9l5 5"/>
      </svg>
    </button>

    <!-- Next arrow -->
    <button class="lc-nav lc-nav-n" (click)="pauseSlider(); nextSlide()" aria-label="Next slide">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M7 4l5 5-5 5"/>
      </svg>
    </button>

    <!-- Pagination dots -->
    <div class="lc-dots" role="tablist">
      <button *ngFor="let slide of slides; let i = index"
              class="lc-dot" [class.lc-dot-a]="currentSlide() === i"
              (click)="pauseSlider(); goToSlide(i)"
              [attr.aria-label]="'Go to slide ' + (i + 1)"
              role="tab" [attr.aria-selected]="currentSlide() === i"></button>
    </div>

    <!-- Scroll hint -->
    <div class="lc-scroll-cue"><div class="lc-sc-line"></div><span>SCROLL</span></div>

  </section>

  <!-- ══════════════ PROMO STRIP ══════════════ -->
  <div class="lc-promo" aria-label="Promotional announcements" role="marquee">
    <div class="lc-promo-track">
      <span class="lc-promo-seg" *ngFor="let _ of promoRepeats">
        <span class="lc-ps-sep">✦</span>
        <span class="lc-ps-t">Special Ayurvedic Offer</span>
        <span class="lc-ps-hl"> Shop Now &amp; Save</span>
        <span class="lc-ps-sep">❈</span>
        <span class="lc-ps-t">Pure Herbal Wellness</span>
        <span class="lc-ps-hl"> Crafted With Care</span>
        <span class="lc-ps-sep">✦</span>
        <span class="lc-ps-t">GMP Certified</span>
        <span class="lc-ps-hl"> 100% Natural</span>
        <span class="lc-ps-sep">❈</span>
        <span class="lc-ps-t">Free Shipping</span>
        <span class="lc-ps-hl"> Above ₹999</span>
        <span class="lc-ps-sep">✦</span>
        <span class="lc-ps-t">Explore Our Herbal Collection</span>
        <span class="lc-ps-sep">❈</span>
        <span class="lc-ps-t">Authentic Ayurvedic Formulations</span>
        <span class="lc-ps-hl"> Seasonal Offers</span>
      </span>
    </div>
  </div>

  <!-- ══════════════ PRODUCT SHOWCASE ══════════════ -->
  <div class="ps" id="ps">

    <!-- Fade edges so cards blend smoothly into section -->
    <div class="ps-edge-l" aria-hidden="true"></div>
    <div class="ps-edge-r" aria-hidden="true"></div>

    <!-- Section heading -->
    <div class="ps-head rv rv-up">
      <div class="ps-eye">
        <span class="ps-eye-line"></span>
        FEATURED PRODUCTS
        <span class="ps-eye-line ps-eye-r"></span>
      </div>
      <h2 class="ps-h2">Nature's Finest <em>Ayurvedic Formulations</em></h2>
    </div>

    <!-- Carousel wrapper — always moving, no hover pause -->
    <div class="ps-strip-wrap">

      <!-- ── Loading: skeleton cards ── -->
      <div class="ps-skeletons" *ngIf="showcaseLoading()">
        <div class="ps-skel-card" *ngFor="let _ of [1,2,3,4,5]">
          <div class="ps-skel-img"></div>
          <div class="ps-skel-line"></div>
          <div class="ps-skel-line ps-skel-sm"></div>
          <div class="ps-skel-btn"></div>
        </div>
      </div>

      <!-- ── Error / empty ── -->
      <div class="ps-empty" *ngIf="!showcaseLoading() && (showcaseError() || !showcaseProducts().length)">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <circle cx="17" cy="17" r="16" stroke="rgba(201,168,76,0.4)" stroke-width="1.2"/>
          <path d="M17 10v8m0 4h.01" stroke="#C9A84C" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <p>{{ showcaseError() ? 'Unable to load products at this time.' : 'No featured products available.' }}</p>
        <a [routerLink]="['/products']">Browse All Products →</a>
      </div>

      <!-- ── Infinite marquee: always running, 2 identical sets ── -->
      <div class="ps-track"
           *ngIf="!showcaseLoading() && !showcaseError() && showcaseProducts().length">
        <div class="ps-set" *ngFor="let _ of [0,1]">
          <div class="ps-card" *ngFor="let p of showcaseProducts()">

            <!-- Discount badge -->
            <div class="ps-badge" *ngIf="psDiscount(p) > 0">{{ psDiscount(p) }}% OFF</div>

            <!-- Product image — fills the arch top of the window card -->
            <a class="ps-img-wrap" [routerLink]="['/products', p.slug]" tabindex="-1" aria-hidden="true">
              <img [src]="p.primaryImageUrl | mediaUrl" [alt]="p.name"
                   class="ps-img" loading="lazy" (error)="psImgErr($event)">
            </a>

            <!-- Card body -->
            <div class="ps-body">
              <div class="ps-cat">{{ p.categoryName || 'Ayurvedic' }}</div>
              <a class="ps-name" [routerLink]="['/products', p.slug]">{{ p.name }}</a>

              <!-- Star rating -->
              <div class="ps-stars" *ngIf="p.averageRating > 0"
                   [attr.aria-label]="p.averageRating + ' out of 5 stars'">
                <span *ngFor="let i of [1,2,3,4,5]" class="ps-star"
                      [class.ps-star-e]="i > psRound(p.averageRating)">★</span>
                <span class="ps-rv" *ngIf="p.reviewCount > 0">({{ p.reviewCount }})</span>
              </div>

              <!-- Price -->
              <div class="ps-price">
                <span class="ps-pc">{{ (p.discountPrice || p.price) | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="ps-pm" *ngIf="p.discountPrice && p.discountPrice < p.price">
                  {{ p.price | currency:'INR':'symbol':'1.0-0' }}
                </span>
              </div>

              <!-- Add to cart -->
              <button class="ps-btn" (click)="psAddToCart(p)"
                      [disabled]="p.stockQuantity <= 0 || psIsAdding(p.id)">
                <ng-container *ngIf="p.stockQuantity <= 0">Out of Stock</ng-container>
                <ng-container *ngIf="p.stockQuantity > 0 && psIsAdding(p.id)">Adding…</ng-container>
                <ng-container *ngIf="p.stockQuantity > 0 && !psIsAdding(p.id)">
                  <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden="true"
                       style="vertical-align:-1px;margin-right:5px">
                    <path d="M1 1h2l1.68 7.39a1 1 0 00.97.77h5.46a1 1 0 00.97-.75L13 5H3"
                          stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="5.5" cy="11.5" r=".8" fill="currentColor"/>
                    <circle cx="10.5" cy="11.5" r=".8" fill="currentColor"/>
                  </svg>
                  Add to Cart
                </ng-container>
              </button>
            </div>

          </div><!-- /ps-card -->
        </div><!-- /ps-set -->
      </div><!-- /ps-track -->

    </div><!-- /ps-strip-wrap -->

  </div><!-- /ps -->

  <!-- ══════════════ CATEGORIES ══════════════ -->
  <section class="cat-sec" id="categories">

    <!-- Full-bleed background -->
    <div class="cat-bg" aria-hidden="true"></div>
    <!-- Top soft fade-in from previous section -->
    <div class="cat-fade-top" aria-hidden="true"></div>
    <!-- Bottom soft fade-out into next section -->
    <div class="cat-fade-bot" aria-hidden="true"></div>

    <div class="cat-inner">

      <!-- Heading -->
      <div class="cat-head rv rv-up">
        <div class="cat-eye">
          <span class="cat-eye-line"></span>
          EXPLORE OUR CATEGORIES
          <span class="cat-eye-line cat-eye-line-r"></span>
        </div>
        <h2 class="cat-h2">Discover Ayurveda, <em>One Category at a Time</em></h2>
        <p class="cat-sub">Explore thoughtfully crafted Ayurvedic products rooted in traditional knowledge and made for modern wellness.</p>
        <!-- ornament -->
        <div class="cat-orn" aria-hidden="true">
          <svg width="44" height="18" viewBox="0 0 44 18" fill="none">
            <path d="M22 16 C22 16 4 10 4 5 C4 2.5 7.5 1 11 2.5 C11 2.5 9 5 12 7.5 C15 9.5 22 9 22 9 C22 9 29 9.5 32 7.5 C35 5 33 2.5 33 2.5 C36.5 1 40 2.5 40 5 C40 10 22 16 22 16Z"
                  stroke="#B99A52" stroke-width="0.7" fill="rgba(185,154,82,0.06)"/>
          </svg>
        </div>
      </div>

      <!-- Loading skeletons -->
      <div class="cat-grid cat-grid-center" *ngIf="catLoading()">
        <div class="cat-skel" *ngFor="let _ of [1,2,3,4]">
          <div class="cat-skel-frame"></div>
          <div class="cat-skel-line cat-skel-l1"></div>
          <div class="cat-skel-line cat-skel-l2"></div>
        </div>
      </div>

      <!-- Error -->
      <div class="cat-state" *ngIf="!catLoading() && catError()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b99a52" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" stroke-linecap="round"/></svg>
        <span>Unable to load categories.</span>
        <button class="cat-retry" (click)="loadCategories()">Retry</button>
      </div>

      <!-- Empty -->
      <div class="cat-state" *ngIf="!catLoading() && !catError() && catList().length === 0">
        <span>Explore our Ayurvedic collection.</span>
      </div>

      <!-- Cards — auto-centered when few items -->
      <div class="cat-grid rv-stagger"
           [class.cat-grid-center]="catList().length <= 3"
           *ngIf="!catLoading() && !catError() && catList().length > 0">

        <a class="cat-card"
           *ngFor="let cat of catList()"
           [routerLink]="['/products']"
           [queryParams]="{categoryId: cat.id}">

          <!-- Painted image frame -->
          <div class="cat-frame-wrap">
            <!-- decorative offset layer (painted edge illusion) -->
            <div class="cat-frame-deco" aria-hidden="true"></div>
            <div class="cat-img-wrap">
              <img class="cat-img"
                   [src]="cat.imageUrl | mediaUrl"
                   [alt]="cat.name"
                   loading="lazy"
                   (error)="catImgErr($event)"/>
              <!-- inner vignette -->
              <div class="cat-vignette" aria-hidden="true"></div>
            </div>
          </div>

          <!-- Body -->
          <div class="cat-body">
            <h3 class="cat-name">{{ cat.name }}</h3>
          </div>

          <!-- Botanical leaf overlay -->
          <img class="cat-leaf" src="/assets/images/leafs.png" alt="" aria-hidden="true" loading="lazy"/>

        </a>
      </div>

      <!-- Explore all button -->
      <div class="cat-explore-wrap rv rv-up">
        <a class="cat-explore-btn" [routerLink]="['/products']">
          Explore All Products
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
      </div>

    </div><!-- /cat-inner -->
  </section>

  <!-- ══════════════ ABOUT ══════════════ -->
  <section class="ab" id="ab">

    <!-- Stage: bg + product share the same box → bottom: 0 = same ground line on both -->
    <div class="ab-stage rv rv-right rv-slow" aria-hidden="true">
      <img class="ab-bg" src="/assets/images/about-bg.png" alt="">
      <img class="ab-prod" src="/assets/images/about-product.png" alt="Sidham Pharmacy Ayurvedic product composition" loading="lazy">
      <div class="ab-veil"></div>
    </div>

    <!-- Text: absolute on section right side, within section min-height -->
    <div class="ab-inner">
      <div class="ab-left rv rv-left">

        <!-- Eyebrow -->
        <div class="ab-eye">
          <span class="ab-eye-line" aria-hidden="true"></span>
          ABOUT SIDHAM PHARMACY
        </div>

        <!-- Heading -->
        <h2 class="ab-h2">
          Rooted in Ayurveda.<br>
          <em>Inspired by Wellness.</em>
        </h2>

        <!-- Intro paragraphs -->
        <div class="ab-intro">
          <p>Welcome to <strong class="ab-gold">Sidham Pharmacy</strong>, the Ayurvedic brand of M/S Ganpati Herbal Ayurveda, based in Phalsanda Jattan, Kurukshetra, Haryana — a place deeply connected with the spiritual heritage and timeless science of Ayurveda.</p>
          <p>We manufacture our own Ayurvedic products under <strong class="ab-gold">GMP</strong> and <strong class="ab-gold">Ministry of AYUSH</strong> guidelines — classical medicines, herbal tonics, tablets and supplements, crafted from carefully selected <strong class="ab-gold">herbs &amp; minerals</strong>.</p>
        </div>

        <!-- Trust indicators -->
        <div class="ab-trust" aria-label="Certifications and highlights">
          <div class="ab-ti">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1l1.8 3.8L13 6l-3 2.8.7 4L7 10.8l-3.7 2 .7-4L1 6l4.2-1.2z" stroke="#C9A84C" stroke-width="1.1" stroke-linejoin="round" fill="none"/></svg>
            <span><strong class="ab-gold">GMP</strong> Standards</span>
          </div>
          <div class="ab-ti">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1l1.8 3.8L13 6l-3 2.8.7 4L7 10.8l-3.7 2 .7-4L1 6l4.2-1.2z" stroke="#C9A84C" stroke-width="1.1" stroke-linejoin="round" fill="none"/></svg>
            <span>Ministry of <strong class="ab-gold">AYUSH</strong></span>
          </div>
          <div class="ab-ti">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1l1.8 3.8L13 6l-3 2.8.7 4L7 10.8l-3.7 2 .7-4L1 6l4.2-1.2z" stroke="#C9A84C" stroke-width="1.1" stroke-linejoin="round" fill="none"/></svg>
            <span><strong class="ab-gold">Family Founded</strong></span>
          </div>
          <div class="ab-ti">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1l1.8 3.8L13 6l-3 2.8.7 4L7 10.8l-3.7 2 .7-4L1 6l4.2-1.2z" stroke="#C9A84C" stroke-width="1.1" stroke-linejoin="round" fill="none"/></svg>
            <span>Ayurvedic Formulations</span>
          </div>
        </div>

        <!-- Second text block -->
        <div class="ab-intro ab-intro-2">
          <p><strong class="ab-gold">Sidham Pharmacy</strong> is a <strong class="ab-gold">family-founded</strong> and family-run Ayurvedic company dedicated to preserving <strong class="ab-gold">authentic Ayurveda</strong> while meeting the needs of modern healthcare.</p>
          <p>Our mission: to make <strong class="ab-gold">pure</strong>, <strong class="ab-gold">affordable</strong> and <strong class="ab-gold">high-quality</strong> Ayurvedic medicines accessible to everyone — bridging ancient wisdom with modern standards of excellence.</p>
        </div>


      </div><!-- /ab-left -->
    </div><!-- /ab-inner -->

    <!-- ── LEADERSHIP ── -->
    <div class="ab-lead-wrap">
      <div class="ab-lead-hd">
        <div class="ab-eye ab-eye-center">
          <span class="ab-eye-line" aria-hidden="true"></span>
          OUR LEADERSHIP
          <span class="ab-eye-line" aria-hidden="true"></span>
        </div>
        <h3 class="ab-lead-h3">Tradition Meets Vision</h3>
        <p class="ab-lead-sub">Carrying forward this vision, Sidham Pharmacy is guided by a dedicated team combining Ayurvedic knowledge, medical expertise, operational excellence and family values.</p>
      </div>

      <div class="ab-lead-grid rv-stagger-sm">

        <div class="ab-person">
          <div class="ab-person-top">
            <div class="ab-person-initials">BS</div>
            <div>
              <div class="ab-person-name">Mr. Bhupinder Singh</div>
              <div class="ab-person-role">Chief Executive Officer</div>
            </div>
          </div>
          <p class="ab-person-desc">Leads the company's growth with a focus on innovation, operational excellence and customer satisfaction.</p>
        </div>

        <div class="ab-person">
          <div class="ab-person-top">
            <div class="ab-person-initials">DG</div>
            <div>
              <div class="ab-person-name">Dr. Gourav</div>
              <div class="ab-person-role">Medical Director</div>
            </div>
          </div>
          <p class="ab-person-desc">Drives research and product innovation with a strong focus on Ayurvedic formulations, herbal supplements and therapeutic products.</p>
        </div>

        <div class="ab-person">
          <div class="ab-person-top">
            <div class="ab-person-initials">AS</div>
            <div>
              <div class="ab-person-name">Dr. Aarti Saini</div>
              <div class="ab-person-role">B.A.M.S., M.S.</div>
            </div>
          </div>
          <p class="ab-person-desc">Contributes Ayurvedic expertise with a focus on women's wellness and chronic disease management.</p>
        </div>

        <div class="ab-person">
          <div class="ab-person-top">
            <div class="ab-person-initials">PS</div>
            <div>
              <div class="ab-person-name">Mrs. Pooja Saini</div>
              <div class="ab-person-role">Operations &amp; Accounts</div>
            </div>
          </div>
          <p class="ab-person-desc">Oversees computer operations, accounting and workforce supervision — maintaining efficient and transparent operations.</p>
        </div>

      </div><!-- /ab-lead-grid -->

      <!-- Closing values bar -->
      <div class="ab-values-bar">
        <span class="ab-sep-sym">✦</span>
        <span>Family Values</span>
        <span class="ab-sep-sym">•</span>
        <span>Ayurvedic Knowledge</span>
        <span class="ab-sep-sym">•</span>
        <span>Medical Excellence</span>
        <span class="ab-sep-sym">•</span>
        <span>Spiritual Commitment</span>
        <span class="ab-sep-sym">✦</span>
      </div>

    </div><!-- /ab-lead-wrap -->

  </section>

  <!-- ══════════════ FEATURED PRODUCT CAROUSEL ══════════════ -->
  <section class="fp" id="fp">

    <div class="fp-head rv rv-up">
      <div class="fp-eye">
        <span class="fp-eye-line"></span>
        FEATURED PRODUCT
        <span class="fp-eye-line fp-eye-r"></span>
      </div>
      <h2 class="fp-h2">Nature's <em>Finest Selection</em></h2>
    </div>

    <!-- Loading skeleton -->
    <div class="fp-skel" *ngIf="showcaseLoading()">
      <div class="fp-skel-inner">
        <div class="fp-skel-img"></div>
        <div class="fp-skel-info">
          <div class="fp-skel-line fp-skel-l1"></div>
          <div class="fp-skel-line fp-skel-l2"></div>
          <div class="fp-skel-line fp-skel-l3"></div>
          <div class="fp-skel-line fp-skel-l4"></div>
          <div class="fp-skel-line fp-skel-l5"></div>
          <div class="fp-skel-btn"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div class="fp-msg" *ngIf="!showcaseLoading() && showcaseError()">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="#a87c3e" stroke-width="1.5"/><path d="M12 8v4m0 4h.01" stroke="#a87c3e" stroke-width="1.5" stroke-linecap="round"/></svg>
      <p>Unable to load product details.</p>
    </div>

    <!-- Empty -->
    <div class="fp-msg" *ngIf="!showcaseLoading() && !showcaseError() && !showcaseProducts().length">
      <p>No featured products available.</p>
    </div>

    <!-- Main stage: nav arrows + card -->
    <div class="fp-stage" *ngIf="!showcaseLoading() && !showcaseError() && showcaseProducts().length"
         (mouseenter)="fpMouseEnter()" (mouseleave)="fpMouseLeave()">

      <button class="fp-nav fp-nav-l" (click)="fpPrev()" [disabled]="fpTransitioning()" aria-label="Previous product">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      <div class="fp-card-wrap" [class.fp-floating]="fpFloating()">
        <div class="fp-card"
             [class.fp-exit-next]="fpExiting() && fpDirection() === 'next'"
             [class.fp-exit-prev]="fpExiting() && fpDirection() === 'prev'"
             [class.fp-enter-next]="fpEntering() && fpDirection() === 'next'"
             [class.fp-enter-prev]="fpEntering() && fpDirection() === 'prev'"
             (touchstart)="fpTouchStart($event)"
             (touchend)="fpTouchEnd($event)">

          <!-- LEFT: full-cover image -->
          <div class="fp-img-col rv rv-left rv-slow">
            <div class="fp-img-wrap">
              <div class="fp-decor" aria-hidden="true">
                <svg class="fp-leaf fp-leaf-tl" width="110" height="110" viewBox="0 0 110 110" fill="none">
                  <ellipse cx="22" cy="88" rx="20" ry="9" transform="rotate(-42 22 88)" fill="#4a7c3f" opacity="0.16"/>
                  <ellipse cx="42" cy="68" rx="26" ry="10" transform="rotate(-55 42 68)" fill="#3d6b35" opacity="0.13"/>
                  <path d="M6 104 Q 38 52 80 24" stroke="#3d6b35" stroke-width="1.5" opacity="0.20" fill="none"/>
                </svg>
                <svg class="fp-leaf fp-leaf-br" width="100" height="100" viewBox="0 0 100 100" fill="none">
                  <ellipse cx="78" cy="22" rx="18" ry="8" transform="rotate(38 78 22)" fill="#4a7c3f" opacity="0.16"/>
                  <ellipse cx="58" cy="42" rx="24" ry="9" transform="rotate(52 58 42)" fill="#3d6b35" opacity="0.13"/>
                  <path d="M94 6 Q 62 48 18 74" stroke="#3d6b35" stroke-width="1.5" opacity="0.18" fill="none"/>
                </svg>
              </div>
              <img [src]="fpCurrentProduct()?.primaryImageUrl | mediaUrl"
                   [alt]="fpCurrentProduct()?.name"
                   class="fp-img" (error)="fpImgErr($event)">
            </div>
            <div class="fp-dots" *ngIf="showcaseProducts().length > 1">
              <span *ngFor="let p of showcaseProducts(); let i = index"
                    class="fp-dot" [class.fp-dot-a]="i === fpIndex()"></span>
            </div>
          </div>

          <!-- RIGHT: product info -->
          <div class="fp-info-col rv rv-right">

            <div class="fp-badges">
              <span class="fp-badge fp-badge-ay">Ayurvedic</span>
              <span class="fp-badge"
                    [class.fp-badge-in]="(fpCurrentProduct()?.stockQuantity ?? 0) > 0"
                    [class.fp-badge-out]="(fpCurrentProduct()?.stockQuantity ?? 0) <= 0">
                {{ (fpCurrentProduct()?.stockQuantity ?? 0) > 0 ? 'In Stock' : 'Out of Stock' }}
              </span>
              <span class="fp-badge fp-badge-bs" *ngIf="fpCurrentProduct()?.isBestSeller">Bestseller</span>
            </div>

            <h2 class="fp-name">{{ fpCurrentProduct()?.name }}</h2>

            <div class="fp-rating">
              <div class="fp-stars">
                <span *ngFor="let i of [1,2,3,4,5]" class="fp-star"
                      [class.fp-star-e]="i > fpRound(fpCurrentProduct()?.averageRating ?? 0)">★</span>
              </div>
              <span class="fp-rating-num" *ngIf="(fpCurrentProduct()?.averageRating ?? 0) > 0">
                {{ (fpCurrentProduct()?.averageRating ?? 0).toFixed(1) }}
              </span>
              <span class="fp-rv-sep" *ngIf="(fpCurrentProduct()?.reviewCount ?? 0) > 0">|</span>
              <span class="fp-rv-ct">
                {{ (fpCurrentProduct()?.reviewCount ?? 0) > 0
                   ? '(' + fpCurrentProduct()?.reviewCount + ' reviews)'
                   : 'Be the first to review' }}
              </span>
            </div>

            <div class="fp-price-block">
              <span class="fp-price">
                {{ ((fpCurrentProduct()?.discountPrice || fpCurrentProduct()?.price) ?? 0) | currency:'INR':'symbol':'1.0-0' }}
              </span>
              <ng-container *ngIf="fpCurrentProduct()?.discountPrice && (fpCurrentProduct()?.discountPrice ?? 0) < (fpCurrentProduct()?.price ?? 0)">
                <span class="fp-mrp">MRP {{ fpCurrentProduct()?.price | currency:'INR':'symbol':'1.0-0' }}</span>
                <span class="fp-save">You save {{ ((fpCurrentProduct()?.price ?? 0) - (fpCurrentProduct()?.discountPrice ?? 0)) | currency:'INR':'symbol':'1.0-0' }}</span>
              </ng-container>
            </div>
            <p class="fp-tax-note">Inclusive of all taxes</p>

            <div class="fp-divider" aria-hidden="true"></div>

            <div class="fp-meta">
              <div class="fp-meta-chip">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" stroke="#4a7c3f" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.5" stroke="#4a7c3f" stroke-width="1.4"/></svg>
                <span>{{ fpDetail()?.manufacturer || 'Siddham Pharmacy' }}</span>
              </div>
              <div class="fp-meta-chip" *ngIf="fpDetail()?.dosageForm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#4a7c3f" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="#4a7c3f" stroke-width="1.5" stroke-linecap="round"/></svg>
                <span>{{ fpDetail()?.dosageForm }}</span>
              </div>
              <div class="fp-meta-chip" *ngIf="fpDetail()?.packaging">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="#4a7c3f" stroke-width="1.5" stroke-linejoin="round"/></svg>
                <span>{{ fpDetail()?.packaging }}</span>
              </div>
              <div class="fp-meta-chip" *ngIf="fpCurrentProduct()?.categoryName">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h7" stroke="#4a7c3f" stroke-width="1.5" stroke-linecap="round"/></svg>
                <span>{{ fpCurrentProduct()?.categoryName }}</span>
              </div>
            </div>

            <div class="fp-qty-row">
              <span class="fp-qty-lbl">Quantity</span>
              <div class="fp-qty">
                <button class="fp-qty-btn" (click)="fpDecQty()" [disabled]="fpQty() <= 1" aria-label="Decrease">−</button>
                <span class="fp-qty-num">{{ fpQty() }}</span>
                <button class="fp-qty-btn" (click)="fpIncQty()" [disabled]="fpQty() >= 10" aria-label="Increase">+</button>
              </div>
            </div>

            <button class="fp-atc"
                    (click)="fpAddToCart()"
                    [disabled]="!fpCurrentProduct() || (fpCurrentProduct()?.stockQuantity ?? 0) <= 0 || fpAdding()"
                    [class.fp-atc-oos]="fpCurrentProduct() && (fpCurrentProduct()?.stockQuantity ?? 0) <= 0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                   *ngIf="fpCurrentProduct() && (fpCurrentProduct()?.stockQuantity ?? 0) > 0">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span *ngIf="!fpCurrentProduct()">Loading…</span>
              <span *ngIf="fpCurrentProduct() && (fpCurrentProduct()?.stockQuantity ?? 0) <= 0">Out of Stock</span>
              <span *ngIf="fpCurrentProduct() && (fpCurrentProduct()?.stockQuantity ?? 0) > 0 && fpAdding()">Adding…</span>
              <span *ngIf="fpCurrentProduct() && (fpCurrentProduct()?.stockQuantity ?? 0) > 0 && !fpAdding()">Add to Cart</span>
            </button>

            <div class="fp-trust">
              <div class="fp-tr">
                <div class="fp-tr-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" stroke="#3a6628" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.5" stroke="#3a6628" stroke-width="1.4"/></svg></div>
                <span>100% Authentic</span>
              </div>
              <div class="fp-tr">
                <div class="fp-tr-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="1" y="3" width="15" height="13" rx="1" stroke="#3a6628" stroke-width="1.5"/><path d="M16 8h4l3 3v5h-7V8z" stroke="#3a6628" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="1.5" stroke="#3a6628" stroke-width="1.5"/><circle cx="18.5" cy="18.5" r="1.5" stroke="#3a6628" stroke-width="1.5"/></svg></div>
                <span>Fast Delivery</span>
              </div>
              <div class="fp-tr">
                <div class="fp-tr-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="1 4 1 10 7 10" stroke="#3a6628" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10" stroke="#3a6628" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <span>Easy Returns</span>
              </div>
              <div class="fp-tr">
                <div class="fp-tr-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#3a6628" stroke-width="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#3a6628" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <span>Secure Payment</span>
              </div>
            </div>

            <p class="fp-sku" *ngIf="fpDetail()?.sku">SKU: <span>{{ fpDetail()?.sku }}</span></p>

          </div><!-- /fp-info-col -->
        </div><!-- /fp-card -->
      </div><!-- /fp-card-wrap -->

      <button class="fp-nav fp-nav-r" (click)="fpNext()" [disabled]="fpTransitioning()" aria-label="Next product">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

    </div><!-- /fp-stage -->

  </section>

  <!-- ══════════════ PROMO STRIP (repeat) ══════════════ -->
  <div class="lc-promo" aria-label="Promotional announcements" role="marquee">
    <div class="lc-promo-track">
      <span class="lc-promo-seg" *ngFor="let _ of promoRepeats">
        <span class="lc-ps-sep">✦</span>
        <span class="lc-ps-t">Special Ayurvedic Offer</span>
        <span class="lc-ps-hl"> Shop Now &amp; Save</span>
        <span class="lc-ps-sep">❈</span>
        <span class="lc-ps-t">Pure Herbal Wellness</span>
        <span class="lc-ps-hl"> Crafted With Care</span>
        <span class="lc-ps-sep">✦</span>
        <span class="lc-ps-t">GMP Certified</span>
        <span class="lc-ps-hl"> 100% Natural</span>
        <span class="lc-ps-sep">❈</span>
        <span class="lc-ps-t">Free Shipping</span>
        <span class="lc-ps-hl"> Above ₹999</span>
        <span class="lc-ps-sep">✦</span>
        <span class="lc-ps-t">Explore Our Herbal Collection</span>
        <span class="lc-ps-sep">❈</span>
        <span class="lc-ps-t">Authentic Ayurvedic Formulations</span>
        <span class="lc-ps-hl"> Seasonal Offers</span>
      </span>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════
       PRODUCT COLLECTION CAROUSEL
  ══════════════════════════════════════════════════ -->
  <section class="fpc" id="fpc" *ngIf="!showcaseLoading() && !showcaseError() && showcaseProducts().length">

    <!-- Full-bleed strip + wall: no outer padding -->
    <div class="fpc-full">

      <!-- ── 13% LEFT STRIP: one product at a time, auto-rotates ── -->
      <div class="fpc-strip">
        <div class="fpc-strip-slide"
             [class.fpc-exit-next]="fpcExiting() && fpcDirection() === 'next'"
             [class.fpc-exit-prev]="fpcExiting() && fpcDirection() === 'prev'"
             [class.fpc-enter-next]="fpcEntering() && fpcDirection() === 'next'"
             [class.fpc-enter-prev]="fpcEntering() && fpcDirection() === 'prev'">
          <img [src]="fpcCurrentProduct()?.primaryImageUrl | mediaUrl"
               [alt]="fpcCurrentProduct()?.name"
               class="fpc-strip-img" (error)="fpImgErr($event)">
          <div class="fpc-strip-ov">
            <span class="fpc-strip-tag" *ngIf="fpcCurrentProduct()?.isBestSeller">Bestseller</span>
            <p class="fpc-strip-name">{{ fpcCurrentProduct()?.name }}</p>
            <p class="fpc-strip-price">
              {{ ((fpcCurrentProduct()?.discountPrice || fpcCurrentProduct()?.price) ?? 0) | currency:'INR':'symbol':'1.0-0' }}
            </p>
            <button class="fpc-strip-add"
                    (click)="fpcAddToCart()"
                    [disabled]="(fpcCurrentProduct()?.stockQuantity ?? 0) <= 0 || fpcAdding()">
              {{ (fpcCurrentProduct()?.stockQuantity ?? 0) <= 0 ? 'Out of Stock' : fpcAdding() ? '…' : 'Add to Cart' }}
            </button>
          </div>
        </div>
        <!-- progress dots -->
        <div class="fpc-strip-dots">
          <span *ngFor="let p of showcaseProducts(); let i = index"
                class="fpc-strip-dot" [class.fpc-strip-dot-a]="i === fpcIndex()"></span>
        </div>
      </div>

      <!-- ── 87% RIGHT WALL: infinite right-to-left marquee ── -->
      <div class="fpc-wall"
           (mouseenter)="fpcMouseEnter()" (mouseleave)="fpcMouseLeave()">
        <div class="fpc-wall-fade fpc-wall-fade-l"></div>
        <div class="fpc-wall-fade fpc-wall-fade-r"></div>
        <div class="fpc-marquee-outer">
          <div class="fpc-marquee" [class.fpc-marquee-paused]="fpcHovered()">
            <div class="fpc-pc"
                 *ngFor="let p of fpcDoubledProducts(); let i = index"
                 [class.fpc-pc-active]="(i % showcaseProducts().length) === fpcIndex()"
                 (click)="fpcSetMarqueeIndex(i)">
              <div class="fpc-pc-img">
                <img [src]="p.primaryImageUrl | mediaUrl" [alt]="p.name"
                     class="fpc-pc-photo" (error)="fpImgErr($event)">
                <span class="fpc-pc-bs" *ngIf="p.isBestSeller">Bestseller</span>
                <div class="fpc-pc-hover-cta">Select</div>
              </div>
              <div class="fpc-pc-body">
                <div class="fpc-pc-name">{{ p.name }}</div>
                <div class="fpc-pc-stars">
                  <span *ngFor="let s of [1,2,3,4,5]"
                        [class.fpc-pc-se]="s > fpRound(p.averageRating)">★</span>
                </div>
                <div class="fpc-pc-price">
                  {{ (p.discountPrice || p.price) | currency:'INR':'symbol':'1.0-0' }}
                  <s class="fpc-pc-mrp" *ngIf="p.discountPrice && p.discountPrice < p.price">
                    {{ p.price | currency:'INR':'symbol':'1.0-0' }}
                  </s>
                </div>
                <button class="fpc-pc-add"
                        (click)="psAddToCart(p); $event.stopPropagation()"
                        [disabled]="p.stockQuantity <= 0 || psIsAdding(p.id)">
                  {{ p.stockQuantity <= 0 ? 'Out of Stock' : psIsAdding(p.id) ? '…' : 'Add' }}
                </button>
              </div>
            </div>
          </div><!-- /fpc-marquee -->
        </div><!-- /fpc-marquee-outer -->
      </div><!-- /fpc-wall -->

    </div><!-- /fpc-full -->

  </section>

  <!-- ══════════════ WHY CHOOSE US ══════════════ -->
  <section class="wcu" id="wcu">

    <!-- Decorative floating dots (left zone, purely visual) -->
    <span class="wcu-dot wcu-dot-1" aria-hidden="true"></span>
    <span class="wcu-dot wcu-dot-2" aria-hidden="true"></span>
    <span class="wcu-dot wcu-dot-3" aria-hidden="true"></span>

    <!-- Right content panel with subtle glass -->
    <div class="wcu-content rv rv-right rv-slow">

      <!-- Corner botanical curves -->
      <svg class="wcu-deco wcu-deco-tl" aria-hidden="true" width="60" height="60" viewBox="0 0 60 60" fill="none">
        <path d="M2 58 C2 30 30 2 58 2" stroke="#B99A52" stroke-width="0.6" fill="none" opacity="0.35"/>
        <path d="M2 48 C2 26 26 2 48 2" stroke="#B99A52" stroke-width="0.4" fill="none" opacity="0.22"/>
        <circle cx="2" cy="58" r="2" fill="#B99A52" opacity="0.28"/>
        <circle cx="58" cy="2" r="2" fill="#B99A52" opacity="0.28"/>
      </svg>
      <svg class="wcu-deco wcu-deco-br" aria-hidden="true" width="60" height="60" viewBox="0 0 60 60" fill="none">
        <path d="M58 2 C58 30 30 58 2 58" stroke="#B99A52" stroke-width="0.6" fill="none" opacity="0.35"/>
        <path d="M58 12 C58 34 34 58 12 58" stroke="#B99A52" stroke-width="0.4" fill="none" opacity="0.22"/>
        <circle cx="58" cy="2" r="2" fill="#B99A52" opacity="0.28"/>
        <circle cx="2" cy="58" r="2" fill="#B99A52" opacity="0.28"/>
      </svg>

      <!-- Heading block -->
      <div class="wcu-head">
        <!-- Lotus ornament -->
        <div class="wcu-lotus" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 28 C16 28 8 20 8 13 C8 8.5 11.5 5 16 5 C20.5 5 24 8.5 24 13 C24 20 16 28 16 28Z" stroke="#B99A52" stroke-width="0.85" fill="none"/>
            <path d="M16 5 C16 5 9 2.5 5.5 7 C3 10 5.5 16 10 17.5" stroke="#B99A52" stroke-width="0.75" fill="none"/>
            <path d="M16 5 C16 5 23 2.5 26.5 7 C29 10 26.5 16 22 17.5" stroke="#B99A52" stroke-width="0.75" fill="none"/>
            <path d="M16 5 C16 5 12 0.5 7.5 1.5 C4.5 2.5 3 7 5.5 10.5" stroke="#B99A52" stroke-width="0.6" fill="none" opacity="0.55"/>
            <path d="M16 5 C16 5 20 0.5 24.5 1.5 C27.5 2.5 29 7 26.5 10.5" stroke="#B99A52" stroke-width="0.6" fill="none" opacity="0.55"/>
            <circle cx="16" cy="5" r="1.8" fill="#B99A52" opacity="0.65"/>
            <circle cx="16" cy="28" r="1.2" fill="#B99A52" opacity="0.35"/>
          </svg>
        </div>

        <!-- Eyebrow -->
        <div class="wcu-eye">
          <span class="wcu-eye-line" aria-hidden="true"></span>
          WHY CHOOSE US
          <span class="wcu-eye-line" aria-hidden="true"></span>
        </div>

        <!-- Main heading -->
        <h2 class="wcu-h2">
          Rooted in <em>Tradition.</em><br>
          Crafted for Modern <em>Wellness.</em>
        </h2>

        <!-- Gold ornamental rule -->
        <div class="wcu-ornament" aria-hidden="true">
          <span class="wcu-orn-line"></span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2C6 2 4 4 4 7c0 3 3 6 5 7 2-1 5-4 5-7 0-3-2-5-5-5z" stroke="#B99A52" stroke-width="0.8" fill="none"/>
            <path d="M9 7v4M7 9h4" stroke="#B99A52" stroke-width="0.7" stroke-linecap="round"/>
          </svg>
          <span class="wcu-orn-line"></span>
        </div>

        <p class="wcu-intro">Authentic Ayurvedic wellness, thoughtfully crafted with traditional knowledge and modern quality standards.</p>
      </div>

      <!-- Feature grid: 3 cols × 2 rows -->
      <div class="wcu-grid rv-stagger">

        <!-- Row separator -->
        <div class="wcu-row-sep" aria-hidden="true"></div>

        <div class="wcu-item">
          <div class="wcu-icon-wrap" aria-hidden="true">
            <span class="wcu-icon-leaf wcu-icon-leaf-l" aria-hidden="true"></span>
            <div class="wcu-icon">
              <!-- Leaf / Sprout -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#174D3C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22V12"/><path d="M5 3a1 1 0 0 0 0 14c3.5 0 7-1.5 9-4.5C11.5 9 8 7 5 3z"/><path d="M19 3a1 1 0 0 1 0 14c-3.5 0-7-1.5-9-4.5C13 9 16 7 19 3z"/>
              </svg>
            </div>
            <span class="wcu-icon-leaf wcu-icon-leaf-r" aria-hidden="true"></span>
          </div>
          <div class="wcu-item-text">
            <strong class="wcu-item-h">100% Authentic Ayurveda</strong>
            <p class="wcu-item-p">Traditional formulations crafted with carefully selected herbs and ingredients.</p>
          </div>
        </div>

        <div class="wcu-item">
          <div class="wcu-icon-wrap" aria-hidden="true">
            <span class="wcu-icon-leaf wcu-icon-leaf-l" aria-hidden="true"></span>
            <div class="wcu-icon">
              <!-- ShieldCheck -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#174D3C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <span class="wcu-icon-leaf wcu-icon-leaf-r" aria-hidden="true"></span>
          </div>
          <div class="wcu-item-text">
            <strong class="wcu-item-h">GMP Certified</strong>
            <p class="wcu-item-p">Manufactured with consistent quality and responsible production practices.</p>
          </div>
        </div>

        <div class="wcu-item">
          <div class="wcu-icon-wrap" aria-hidden="true">
            <span class="wcu-icon-leaf wcu-icon-leaf-l" aria-hidden="true"></span>
            <div class="wcu-icon">
              <!-- BadgeCheck -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#174D3C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <span class="wcu-icon-leaf wcu-icon-leaf-r" aria-hidden="true"></span>
          </div>
          <div class="wcu-item-text">
            <strong class="wcu-item-h">AYUSH Compliant</strong>
            <p class="wcu-item-p">Products prepared according to applicable Ayurvedic standards and guidelines.</p>
          </div>
        </div>

        <div class="wcu-item">
          <div class="wcu-icon-wrap" aria-hidden="true">
            <span class="wcu-icon-leaf wcu-icon-leaf-l" aria-hidden="true"></span>
            <div class="wcu-icon">
              <!-- UsersRound -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#174D3C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 21a8 8 0 0 0-5.3-7.5"/><circle cx="17" cy="8" r="4" stroke-width="1.1"/>
              </svg>
            </div>
            <span class="wcu-icon-leaf wcu-icon-leaf-r" aria-hidden="true"></span>
          </div>
          <div class="wcu-item-text">
            <strong class="wcu-item-h">Family Founded</strong>
            <p class="wcu-item-p">A family-led Ayurvedic journey built on knowledge, values and trust.</p>
          </div>
        </div>

        <div class="wcu-item">
          <div class="wcu-icon-wrap" aria-hidden="true">
            <span class="wcu-icon-leaf wcu-icon-leaf-l" aria-hidden="true"></span>
            <div class="wcu-icon">
              <!-- Award -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#174D3C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
            </div>
            <span class="wcu-icon-leaf wcu-icon-leaf-r" aria-hidden="true"></span>
          </div>
          <div class="wcu-item-text">
            <strong class="wcu-item-h">Quality You Can Trust</strong>
            <p class="wcu-item-p">Focused on purity, consistency and reliable product quality.</p>
          </div>
        </div>

        <div class="wcu-item">
          <div class="wcu-icon-wrap" aria-hidden="true">
            <span class="wcu-icon-leaf wcu-icon-leaf-l" aria-hidden="true"></span>
            <div class="wcu-icon">
              <!-- Truck -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#174D3C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
              </svg>
            </div>
            <span class="wcu-icon-leaf wcu-icon-leaf-r" aria-hidden="true"></span>
          </div>
          <div class="wcu-item-text">
            <strong class="wcu-item-h">Fast &amp; Reliable Delivery</strong>
            <p class="wcu-item-p">Ayurvedic wellness products delivered safely across India.</p>
          </div>
        </div>

      </div><!-- /wcu-grid -->

    </div><!-- /wcu-content -->

    <!-- ══ BOTANICAL DIVIDER — anchored to WCU bottom-right ══ -->
    <!-- position:absolute bottom:0 right:0 inside wcu, so it NEVER touches cards -->
    <div class="bot-div" aria-hidden="true">
      <img class="bot-div-img" src="/assets/images/lsize.png" alt=""/>
    </div>

  </section>

  <!-- ══════════════ TESTIMONIALS ══════════════ -->
  <section class="tst" id="tst"
    (mouseenter)="tstPause()" (mouseleave)="tstResume()"
    (touchstart)="tstTouchStart($event)" (touchend)="tstTouchEnd($event)">

    <!-- Faint circular mandala bg -->
    <svg class="tst-mandala" aria-hidden="true" viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="260" cy="260" r="240" stroke="#b99a52" stroke-width="0.5" opacity="0.10"/>
      <circle cx="260" cy="260" r="200" stroke="#b99a52" stroke-width="0.4" opacity="0.08"/>
      <circle cx="260" cy="260" r="160" stroke="#b99a52" stroke-width="0.3" opacity="0.07"/>
      <circle cx="260" cy="260" r="120" stroke="#b99a52" stroke-width="0.3" opacity="0.06"/>
      <g opacity="0.07" stroke="#b99a52" stroke-width="0.4">
        <line x1="260" y1="20"  x2="260" y2="500"/>
        <line x1="20"  y1="260" x2="500" y2="260"/>
        <line x1="90"  y1="90"  x2="430" y2="430"/>
        <line x1="430" y1="90"  x2="90"  y2="430"/>
        <line x1="52"  y1="175" x2="468" y2="345"/>
        <line x1="52"  y1="345" x2="468" y2="175"/>
        <line x1="175" y1="52"  x2="345" y2="468"/>
        <line x1="345" y1="52"  x2="175" y2="468"/>
      </g>
    </svg>

    <!-- Floating gold dots -->
    <span class="tst-dot tst-dot-1" aria-hidden="true"></span>
    <span class="tst-dot tst-dot-2" aria-hidden="true"></span>
    <span class="tst-dot tst-dot-3" aria-hidden="true"></span>
    <span class="tst-dot tst-dot-4" aria-hidden="true"></span>

    <!-- Botanical corner lines -->
    <svg class="tst-bot tst-bot-tl" aria-hidden="true" width="80" height="80" viewBox="0 0 80 80" fill="none">
      <path d="M2 78 C2 38 38 2 78 2" stroke="#2d6b4a" stroke-width="0.7" opacity="0.18"/>
      <path d="M2 58 C2 30 30 2 58 2" stroke="#2d6b4a" stroke-width="0.5" opacity="0.12"/>
      <path d="M18 78 C10 60 20 20 58 10" stroke="#b99a52" stroke-width="0.4" opacity="0.14"/>
    </svg>
    <svg class="tst-bot tst-bot-tr" aria-hidden="true" width="80" height="80" viewBox="0 0 80 80" fill="none">
      <path d="M78 78 C78 38 42 2 2 2" stroke="#2d6b4a" stroke-width="0.7" opacity="0.18"/>
      <path d="M78 58 C78 30 50 2 22 2" stroke="#2d6b4a" stroke-width="0.5" opacity="0.12"/>
    </svg>
    <svg class="tst-bot tst-bot-bl" aria-hidden="true" width="80" height="80" viewBox="0 0 80 80" fill="none">
      <path d="M2 2 C2 42 38 78 78 78" stroke="#2d6b4a" stroke-width="0.7" opacity="0.18"/>
      <path d="M2 22 C2 50 30 78 58 78" stroke="#2d6b4a" stroke-width="0.5" opacity="0.12"/>
    </svg>
    <svg class="tst-bot tst-bot-br" aria-hidden="true" width="80" height="80" viewBox="0 0 80 80" fill="none">
      <path d="M78 2 C78 42 42 78 2 78" stroke="#2d6b4a" stroke-width="0.7" opacity="0.18"/>
      <path d="M78 22 C78 50 50 78 22 78" stroke="#2d6b4a" stroke-width="0.5" opacity="0.12"/>
    </svg>

    <div class="tst-inner">

      <!-- Section heading -->
      <div class="tst-head rv rv-up">
        <!-- Lotus ornament -->
        <div class="tst-lotus" aria-hidden="true">
          <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
            <path d="M18 26 C18 26 6 18 6 10 C6 5.6 9.8 2 14 4 C14 4 14 4 14 4 C14 4 11 8 14 12 C16 15 18 14 18 14 C18 14 20 15 22 12 C25 8 22 4 22 4 C26.2 2 30 5.6 30 10 C30 18 18 26 18 26Z" stroke="#B99A52" stroke-width="0.9" fill="rgba(185,154,82,0.07)"/>
            <path d="M18 24 C18 24 10 17 10 11 C10 8 12 6 14.5 7" stroke="#B99A52" stroke-width="0.6" opacity="0.5"/>
            <path d="M18 24 C18 24 26 17 26 11 C26 8 24 6 21.5 7" stroke="#B99A52" stroke-width="0.6" opacity="0.5"/>
            <circle cx="18" cy="10" r="2" fill="rgba(185,154,82,0.35)"/>
          </svg>
        </div>
        <div class="tst-eye">
          <span class="tst-eye-line"></span>
          WHAT OUR CUSTOMERS SAY
          <span class="tst-eye-line"></span>
        </div>
        <h2 class="tst-h2">Trusted by Families.<br><em>Rooted in Ayurveda.</em></h2>
        <div class="tst-orn" aria-hidden="true">
          <span class="tst-orn-l"></span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 0L8.75 5.25L14 7L8.75 8.75L7 14L5.25 8.75L0 7L5.25 5.25Z" fill="#B99A52" opacity="0.7"/>
          </svg>
          <span class="tst-orn-r"></span>
        </div>
        <p class="tst-sub">Real experiences from people who have chosen Siddham Pharmacy as part of their wellness journey.</p>
      </div>

      <!-- Loading state -->
      <div class="tst-loading" *ngIf="tstLoading()">
        <div class="tst-skel-track">
          <div class="tst-skel-card" *ngFor="let _ of [1,2,3]">
            <div class="tst-skel-line tst-sl-1"></div>
            <div class="tst-skel-line tst-sl-2"></div>
            <div class="tst-skel-line tst-sl-3"></div>
            <div class="tst-skel-line tst-sl-4"></div>
          </div>
        </div>
      </div>

      <!-- Error state -->
      <div class="tst-empty" *ngIf="!tstLoading() && tstError()">
        <p>Unable to load testimonials right now.</p>
      </div>

      <!-- Empty state -->
      <div class="tst-empty" *ngIf="!tstLoading() && !tstError() && tstTestimonials().length === 0">
        <p>No testimonials yet.</p>
      </div>

      <!-- Carousel -->
      <div class="tst-stage rv rv-up rv-d2" *ngIf="!tstLoading() && !tstError() && tstTestimonials().length > 0">
        <div class="tst-track" [style.transform]="'translateX(-' + (tstActive() * (100 / tstVisible())) + '%)'">
          <div class="tst-card"
               *ngFor="let t of tstLoop(); let i = index"
               [class.tst-card-center]="tstIsCenter(i)">

            <!-- Stars -->
            <div class="tst-stars">
              <svg *ngFor="let s of tstStars(t.rating); let si = index"
                   width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6Z"
                      [attr.fill]="s ? '#C9A84C' : 'none'"
                      [attr.stroke]="s ? 'none' : 'rgba(185,154,82,0.35)'"
                      stroke-width="1.5"/>
              </svg>
            </div>

            <!-- Message -->
            <p class="tst-msg">"{{ t.message }}"</p>

            <!-- Customer info -->
            <div class="tst-author">
              <div class="tst-avatar" *ngIf="t.avatarUrl">
                <img [src]="t.avatarUrl" [alt]="t.customerName" (error)="tstImgErr($event)">
              </div>
              <div class="tst-avatar tst-avatar-init" *ngIf="!t.avatarUrl">
                {{ t.customerName.charAt(0) }}
              </div>
              <div class="tst-author-text">
                <strong class="tst-name">{{ t.customerName }}</strong>
                <span class="tst-loc" *ngIf="t.customerTitle">{{ t.customerTitle }}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="tst-nav" *ngIf="!tstLoading() && tstTestimonials().length > 0">
        <button class="tst-arr tst-arr-l" (click)="tstPrev()" aria-label="Previous testimonial">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div class="tst-dots">
          <button class="tst-dot-btn"
                  *ngFor="let t of tstTestimonials(); let i = index"
                  [class.tst-dot-active]="tstActivePage() === i"
                  (click)="tstGoTo(i)"
                  [attr.aria-label]="'Go to testimonial ' + (i + 1)">
          </button>
        </div>

        <button class="tst-arr tst-arr-r" (click)="tstNext()" aria-label="Next testimonial">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <!-- Bottom trust line -->
      <div class="tst-trust" *ngIf="!tstLoading() && tstTestimonials().length > 0">
        <div class="tst-trust-stars">
          <svg *ngFor="let _ of [1,2,3,4,5]" width="11" height="11" viewBox="0 0 24 24" fill="#C9A84C"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6Z"/></svg>
        </div>
        <span class="tst-trust-txt">Your trust inspires our tradition &nbsp;·&nbsp; Trusted Ayurvedic Wellness</span>
      </div>

    </div><!-- /tst-inner -->
  </section>

  <!-- ══════════════ PROMOTION BANNER ══════════════ -->
  <div class="promo-banner rv rv-scale">
    <img class="promo-banner-img" src="/assets/images/promotion.png" alt="Special Promotion" loading="lazy"/>
  </div>

  <!-- ══════════════ FAQ ══════════════ -->
  <section class="faq" id="faq">

    <!-- Full-bleed background -->
    <div class="faq-bg" aria-hidden="true"></div>
    <!-- Soft cream overlay for readability -->
    <div class="faq-ov" aria-hidden="true"></div>

    <!-- Foreground decorative elements -->
    <span class="faq-dot faq-dot-1" aria-hidden="true"></span>
    <span class="faq-dot faq-dot-2" aria-hidden="true"></span>
    <span class="faq-dot faq-dot-3" aria-hidden="true"></span>

    <svg class="faq-deco faq-deco-tl" aria-hidden="true" width="100" height="160" viewBox="0 0 100 160" fill="none">
      <path d="M50 155 Q50 80 50 10" stroke="#2d6b4a" stroke-width="0.8" opacity="0.20"/>
      <ellipse cx="50" cy="60"  rx="28" ry="11" transform="rotate(-38 50 60)"  stroke="#2d6b4a" stroke-width="0.7" opacity="0.18" fill="rgba(45,107,74,0.04)"/>
      <ellipse cx="50" cy="60"  rx="28" ry="11" transform="rotate(142 50 60)"  stroke="#2d6b4a" stroke-width="0.7" opacity="0.18" fill="rgba(45,107,74,0.04)"/>
      <ellipse cx="50" cy="100" rx="20" ry="8"  transform="rotate(-32 50 100)" stroke="#2d6b4a" stroke-width="0.6" opacity="0.14" fill="rgba(45,107,74,0.03)"/>
      <ellipse cx="50" cy="100" rx="20" ry="8"  transform="rotate(148 50 100)" stroke="#2d6b4a" stroke-width="0.6" opacity="0.14" fill="rgba(45,107,74,0.03)"/>
      <circle cx="50" cy="10" r="3" fill="#b99a52" opacity="0.25"/>
    </svg>
    <svg class="faq-deco faq-deco-tr" aria-hidden="true" width="100" height="160" viewBox="0 0 100 160" fill="none">
      <path d="M50 155 Q50 80 50 10" stroke="#2d6b4a" stroke-width="0.8" opacity="0.20"/>
      <ellipse cx="50" cy="60"  rx="28" ry="11" transform="rotate(-38 50 60)"  stroke="#2d6b4a" stroke-width="0.7" opacity="0.18" fill="rgba(45,107,74,0.04)"/>
      <ellipse cx="50" cy="60"  rx="28" ry="11" transform="rotate(142 50 60)"  stroke="#2d6b4a" stroke-width="0.7" opacity="0.18" fill="rgba(45,107,74,0.04)"/>
      <ellipse cx="50" cy="100" rx="20" ry="8"  transform="rotate(-32 50 100)" stroke="#2d6b4a" stroke-width="0.6" opacity="0.14" fill="rgba(45,107,74,0.03)"/>
      <ellipse cx="50" cy="100" rx="20" ry="8"  transform="rotate(148 50 100)" stroke="#2d6b4a" stroke-width="0.6" opacity="0.14" fill="rgba(45,107,74,0.03)"/>
      <circle cx="50" cy="10" r="3" fill="#b99a52" opacity="0.25"/>
    </svg>

    <div class="faq-inner">

      <!-- ── TOP HEADING (centered) ── -->
      <div class="faq-head rv rv-up">
        <!-- lotus ornament -->
        <div class="faq-head-lotus" aria-hidden="true">
          <svg width="34" height="26" viewBox="0 0 34 26" fill="none">
            <path d="M17 24 C17 24 5 16 5 9 C5 5.2 8.6 2 12.5 4 C12.5 4 10 7.5 13 11 C15 13.5 17 13 17 13 C17 13 19 13.5 21 11 C24 7.5 21.5 4 21.5 4 C25.4 2 29 5.2 29 9 C29 16 17 24 17 24Z" stroke="#B99A52" stroke-width="0.8" fill="rgba(185,154,82,0.06)"/>
            <circle cx="17" cy="9" r="2" fill="rgba(185,154,82,0.30)"/>
          </svg>
        </div>
        <div class="faq-head-eye">
          <span class="faq-head-line"></span>
          COMMON QUESTIONS
          <span class="faq-head-line faq-head-line-r"></span>
        </div>
        <h2 class="faq-head-h2">Everything You <em>Need to Know.</em></h2>
        <p class="faq-head-sub">Answers to common questions about our Ayurvedic products, ordering, delivery, and wellness journey.</p>
        <div class="faq-head-orn" aria-hidden="true">
          <span class="faq-head-rl"></span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 0L7.3 4.7L12 6L7.3 7.3L6 12L4.7 7.3L0 6L4.7 4.7Z" fill="#B99A52" opacity="0.55"/>
          </svg>
          <span class="faq-head-rl faq-head-rl-r"></span>
        </div>
      </div>

      <!-- ── ACCORDION (centered container) ── -->
      <div class="faq-box rv rv-up rv-d2">

        <!-- Loading -->
        <div class="faq-loading" *ngIf="faqLoading()">
          <div class="faq-skel-row" *ngFor="let _ of [1,2,3,4,5]">
            <div class="faq-skel-num"></div>
            <div class="faq-skel-q"></div>
          </div>
        </div>

        <!-- Error -->
        <div class="faq-state" *ngIf="!faqLoading() && faqError()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b99a52" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="#b99a52"/></svg>
          Unable to load FAQs right now. Please try again later.
        </div>

        <!-- Empty -->
        <div class="faq-state" *ngIf="!faqLoading() && !faqError() && faqList().length === 0">
          No FAQs available at the moment.
        </div>

        <!-- Accordion items -->
        <div class="faq-acc" *ngIf="!faqLoading() && !faqError() && faqList().length > 0">
          <div class="faq-item"
               *ngFor="let f of faqVisible(); let i = index"
               [class.faq-item-open]="faqOpen() === i">

            <button class="faq-row"
                    (click)="faqToggle(i)"
                    [attr.aria-expanded]="faqOpen() === i"
                    [attr.aria-controls]="'faq-ans-' + i"
                    [id]="'faq-btn-' + i">
              <span class="faq-num">{{ (i + 1).toString().padStart(2, '0') }}</span>
              <span class="faq-q-text">{{ f.question }}</span>
              <span class="faq-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.2"
                     stroke-linecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12" class="faq-icon-h"/>
                </svg>
              </span>
            </button>

            <div class="faq-ans-wrap"
                 [id]="'faq-ans-' + i"
                 role="region"
                 [attr.aria-labelledby]="'faq-btn-' + i"
                 [style.maxHeight]="faqOpen() === i ? faqAnswerHeight(i) : '0px'">
              <div class="faq-ans" [id]="'faq-ans-inner-' + i">
                <svg class="faq-ans-leaf" aria-hidden="true" width="16" height="24" viewBox="0 0 16 24" fill="none">
                  <path d="M8 22 C8 22 0 14 0 7 C0 3.2 3.6 0 8 2 C12.4 0 16 3.2 16 7 C16 14 8 22 8 22Z" stroke="#2d6b4a" stroke-width="0.7" fill="rgba(45,107,74,0.08)" opacity="0.60"/>
                </svg>
                <p>{{ f.answer }}</p>
                <span class="faq-cat" *ngIf="f.category">{{ f.category }}</span>
              </div>
            </div>

            <div class="faq-sep" aria-hidden="true"></div>
          </div>
          <!-- Show more / less toggle -->
          <div class="faq-more-wrap" *ngIf="faqList().length > 6">
            <button class="faq-more-btn" (click)="faqShowAll.set(!faqShowAll())">
              <span *ngIf="!faqShowAll()">Know More</span>
              <span *ngIf="faqShowAll()">Show Less</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [style.transform]="faqShowAll() ? 'rotate(180deg)' : 'rotate(0deg)'"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </div>
      </div><!-- /faq-box -->

      <!-- ── BOTTOM CTA ── -->
      <div class="faq-cta rv rv-up rv-d4" *ngIf="!faqLoading() && faqList().length > 0">
        <p class="faq-cta-lbl">Still have questions?</p>
        <a class="faq-cta-btn" routerLink="/contact">
          Talk to Our Team
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <a class="faq-cta-sec" routerLink="/products">Explore Our Products →</a>
      </div>

    </div><!-- /faq-inner -->
  </section>

  <!-- ══════════════ BLOG ══════════════ -->
  <section class="blg" id="blog">

    <!-- background image layer -->
    <div class="blg-bg" aria-hidden="true"></div>

    <!-- subtle botanical side decorations -->
    <svg class="blg-deco blg-deco-l" aria-hidden="true" width="80" height="200" viewBox="0 0 80 200" fill="none">
      <path d="M40 195 Q40 100 40 10" stroke="#2d6b4a" stroke-width="0.8" opacity="0.14"/>
      <ellipse cx="40" cy="70"  rx="26" ry="10" transform="rotate(-36 40 70)"  stroke="#2d6b4a" stroke-width="0.65" opacity="0.15" fill="rgba(45,107,74,0.04)"/>
      <ellipse cx="40" cy="70"  rx="26" ry="10" transform="rotate(144 40 70)"  stroke="#2d6b4a" stroke-width="0.65" opacity="0.15" fill="rgba(45,107,74,0.04)"/>
      <ellipse cx="40" cy="120" rx="18" ry="7"  transform="rotate(-30 40 120)" stroke="#2d6b4a" stroke-width="0.55" opacity="0.11" fill="rgba(45,107,74,0.03)"/>
      <ellipse cx="40" cy="120" rx="18" ry="7"  transform="rotate(150 40 120)" stroke="#2d6b4a" stroke-width="0.55" opacity="0.11" fill="rgba(45,107,74,0.03)"/>
      <circle cx="40" cy="10" r="2.5" fill="#b99a52" opacity="0.22"/>
    </svg>
    <svg class="blg-deco blg-deco-r" aria-hidden="true" width="80" height="200" viewBox="0 0 80 200" fill="none">
      <path d="M40 195 Q40 100 40 10" stroke="#2d6b4a" stroke-width="0.8" opacity="0.14"/>
      <ellipse cx="40" cy="70"  rx="26" ry="10" transform="rotate(-36 40 70)"  stroke="#2d6b4a" stroke-width="0.65" opacity="0.15" fill="rgba(45,107,74,0.04)"/>
      <ellipse cx="40" cy="70"  rx="26" ry="10" transform="rotate(144 40 70)"  stroke="#2d6b4a" stroke-width="0.65" opacity="0.15" fill="rgba(45,107,74,0.04)"/>
      <ellipse cx="40" cy="120" rx="18" ry="7"  transform="rotate(-30 40 120)" stroke="#2d6b4a" stroke-width="0.55" opacity="0.11" fill="rgba(45,107,74,0.03)"/>
      <ellipse cx="40" cy="120" rx="18" ry="7"  transform="rotate(150 40 120)" stroke="#2d6b4a" stroke-width="0.55" opacity="0.11" fill="rgba(45,107,74,0.03)"/>
      <circle cx="40" cy="10" r="2.5" fill="#b99a52" opacity="0.22"/>
    </svg>

    <div class="blg-inner">

      <!-- ── HEADING ── -->
      <div class="blg-head rv rv-up">
        <div class="blg-eye">
          <span class="blg-eye-line"></span>FROM OUR JOURNAL<span class="blg-eye-line blg-eye-line-r"></span>
        </div>
        <h2 class="blg-h2">Ancient Wisdom.<br><em>Modern Wellness.</em></h2>
        <p class="blg-sub">Discover Ayurvedic knowledge, wellness practices, herbal insights, and timeless traditions from Sidham Pharmacy.</p>
        <!-- leaf ornament -->
        <div class="blg-orn" aria-hidden="true">
          <svg width="48" height="22" viewBox="0 0 48 22" fill="none">
            <path d="M24 20 C24 20 4 12 4 6 C4 2.6 8.4 0 13 2.2 C13 2.2 10 5.8 14 9.4 C17 12.2 24 11.2 24 11.2 C24 11.2 31 12.2 34 9.4 C38 5.8 35 2.2 35 2.2 C39.6 0 44 2.6 44 6 C44 12 24 20 24 20Z" stroke="#B99A52" stroke-width="0.8" fill="rgba(185,154,82,0.07)"/>
            <path d="M14 6 Q24 10 34 6" stroke="#B99A52" stroke-width="0.5" opacity="0.40"/>
            <circle cx="24" cy="6" r="1.8" fill="rgba(185,154,82,0.35)"/>
          </svg>
        </div>
      </div>

      <!-- ── LOADING SKELETON ── -->
      <div class="blg-grid blg-grid-loading" *ngIf="blgLoading()">
        <div class="blg-skel-card" *ngFor="let _ of [1,2,3,4]">
          <div class="blg-skel-img"></div>
          <div class="blg-skel-body">
            <div class="blg-skel-cat"></div>
            <div class="blg-skel-t1"></div>
            <div class="blg-skel-t2"></div>
            <div class="blg-skel-ex"></div>
            <div class="blg-skel-meta"></div>
          </div>
        </div>
      </div>

      <!-- ── EMPTY / ERROR ── -->
      <div class="blg-state" *ngIf="!blgLoading() && (blgError() || blgPosts().length === 0)">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B99A52" stroke-width="1.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        <span *ngIf="blgError()">Unable to load articles. Please check back soon.</span>
        <span *ngIf="!blgError() && blgPosts().length === 0">New stories are coming soon.</span>
      </div>

      <!-- ── BLOG CARDS GRID ── -->
      <div class="blg-grid rv-stagger" *ngIf="!blgLoading() && blgPosts().length > 0">
        <article class="blg-card"
                 *ngFor="let p of blgPosts(); let i = index"
                 [class.blg-card-feat]="i === 0"
                 [routerLink]="['/blogs', p.slug]">

          <!-- image -->
          <div class="blg-card-img-wrap">
            <img class="blg-card-img"
                 [src]="p.coverImageUrl || '/assets/images/feature.png'"
                 [alt]="p.title"
                 loading="lazy"/>
            <span class="blg-feat-badge" *ngIf="i === 0" aria-label="Featured">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5Z" fill="#B99A52" opacity="0.80"/></svg>
              FEATURED
            </span>
          </div>

          <!-- body -->
          <div class="blg-card-body">
            <div class="blg-card-cat" *ngIf="p.category">{{ p.category }}</div>
            <h3 class="blg-card-title">{{ p.title }}</h3>
            <p class="blg-card-excerpt">{{ p.excerpt }}</p>
            <div class="blg-card-meta">
              <span class="blg-card-date" *ngIf="p.publishedAt">{{ blgDate(p.publishedAt) }}</span>
              <span class="blg-card-author" *ngIf="p.author"> · {{ p.author }}</span>
            </div>
            <span class="blg-card-link">
              Read Article
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
          </div>

        </article>
      </div>

      <!-- ── CTA ── -->
      <div class="blg-cta rv rv-up rv-d3" *ngIf="!blgLoading() && blgPosts().length > 0">
        <p class="blg-cta-lbl">Explore All Articles</p>
        <a class="blg-cta-btn" routerLink="/blogs">
          VIEW ALL BLOGS
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <!-- divider -->
        <div class="blg-cta-div" aria-hidden="true">
          <span class="blg-cta-rl"></span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 0L7.3 4.7L12 6L7.3 7.3L6 12L4.7 7.3L0 6L4.7 4.7Z" fill="#B99A52" opacity="0.50"/></svg>
          <span class="blg-cta-rl blg-cta-rl-r"></span>
        </div>
      </div>

    </div><!-- /blg-inner -->
  </section>

</div><!-- /lc-wrap -->
  `,
  styles: [`

/* ═══════════════════════════════════════════
   REVEAL ANIMATION SYSTEM
═══════════════════════════════════════════ */

/* ── Hidden base state ── */
/* ═══════════════════════════════════════════════════════════════
   PREMIUM SCROLL REVEAL SYSTEM — Cinematic Botanical Motion
   Philosophy: calm, organic, intentional — not template-like.
   Each section has its own motion personality via scoped CSS.
════════════════════════════════════════════════════════════════ */

/* ── Base: all reveal elements start hidden ── */
.rv {
  opacity: 0;
  transition:
    opacity     1.25s cubic-bezier(0.22, 1, 0.36, 1),
    transform   1.25s cubic-bezier(0.22, 1, 0.36, 1),
    filter      1.10s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Named motion presets ── */

/* Gentle editorial rise — headings & text blocks */
.rv-up     { transform: translateY(22px); filter: blur(1px); }

/* Promotional / banner — scale from slightly smaller, no direction */
.rv-scale  { transform: scale(0.97); filter: blur(2px); }

/* Focus reveal — product images, key visuals */
.rv-focus  { transform: scale(0.97); filter: blur(6px); }

/* Paint reveal — category cards, artworks */
.rv-paint  { transform: scale(0.95); filter: blur(3px); }

/* Paper reveal — testimonial cards */
.rv-paper  { transform: scale(0.97); filter: blur(2px); }

/* Botanical breath — WCU icons, features */
.rv-breath { transform: scale(0.93); filter: none; }

/* Background scale — large bg panels */
.rv-bg     { transform: scale(1.04); filter: blur(4px); }

/* Subtle — fine-detail elements, decorative */
.rv-subtle { transform: translateY(12px); filter: blur(0.5px); }

/* ── Visible state ── */
.rv.is-vis {
  opacity: 1;
  transform: translateY(0) translateX(0) scale(1);
  filter: blur(0);
}

/* ── Duration overrides ── */
.rv-slow   { transition-duration: 1.55s; }
.rv-fast   { transition-duration: 0.85s; }

/* ── Delay utilities ── */
.rv-d1 { transition-delay: 180ms; }
.rv-d2 { transition-delay: 340ms; }
.rv-d3 { transition-delay: 500ms; }
.rv-d4 { transition-delay: 660ms; }
.rv-d5 { transition-delay: 820ms; }
.rv-d6 { transition-delay: 980ms; }
.rv-d7 { transition-delay: 1140ms; }

/* ═══════════════════════════════════════════════════════════════
   STAGGER SYSTEMS — generic base (overridden per section below)
════════════════════════════════════════════════════════════════ */

.rv-stagger > *:not([aria-hidden]) {
  opacity: 0;
  transform: translateY(18px);
  filter: blur(1px);
  transition:
    opacity   1.15s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.15s cubic-bezier(0.22, 1, 0.36, 1),
    filter    1.00s cubic-bezier(0.22, 1, 0.36, 1);
}
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(1)   { opacity:1; transform:none; filter:blur(0); transition-delay:   0ms; }
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(2)   { opacity:1; transform:none; filter:blur(0); transition-delay: 150ms; }
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(3)   { opacity:1; transform:none; filter:blur(0); transition-delay: 300ms; }
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(4)   { opacity:1; transform:none; filter:blur(0); transition-delay: 450ms; }
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(5)   { opacity:1; transform:none; filter:blur(0); transition-delay: 600ms; }
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(6)   { opacity:1; transform:none; filter:blur(0); transition-delay: 750ms; }
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(7)   { opacity:1; transform:none; filter:blur(0); transition-delay: 900ms; }
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(8)   { opacity:1; transform:none; filter:blur(0); transition-delay:1050ms; }
.rv-stagger.is-vis > *:not([aria-hidden]):nth-child(n+9) { opacity:1; transform:none; filter:blur(0); transition-delay:1200ms; }

/* Smaller stagger — leadership cards, FAQ rows */
.rv-stagger-sm > * {
  opacity: 0;
  transform: scale(0.96);
  filter: blur(1px);
  transition:
    opacity   1.00s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.00s cubic-bezier(0.22, 1, 0.36, 1),
    filter    0.90s cubic-bezier(0.22, 1, 0.36, 1);
}
.rv-stagger-sm.is-vis > *:nth-child(1)   { opacity:1; transform:none; filter:blur(0); transition-delay:  0ms; }
.rv-stagger-sm.is-vis > *:nth-child(2)   { opacity:1; transform:none; filter:blur(0); transition-delay:100ms; }
.rv-stagger-sm.is-vis > *:nth-child(3)   { opacity:1; transform:none; filter:blur(0); transition-delay:200ms; }
.rv-stagger-sm.is-vis > *:nth-child(4)   { opacity:1; transform:none; filter:blur(0); transition-delay:300ms; }
.rv-stagger-sm.is-vis > *:nth-child(5)   { opacity:1; transform:none; filter:blur(0); transition-delay:400ms; }
.rv-stagger-sm.is-vis > *:nth-child(6)   { opacity:1; transform:none; filter:blur(0); transition-delay:500ms; }
.rv-stagger-sm.is-vis > *:nth-child(n+7) { opacity:1; transform:none; filter:blur(0); transition-delay:600ms; }

/* ═══════════════════════════════════════════════════════════════
   SECTION PERSONALITIES — scoped overrides per section
   These override the generic stagger motion for each context.
════════════════════════════════════════════════════════════════ */

/* — CATEGORIES: paint reveal — scale + blur like artwork being uncovered */
.cat-sec .rv-stagger > *:not([aria-hidden]) {
  transform: scale(0.95);
  filter: blur(3px);
  transition:
    opacity   1.20s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.20s cubic-bezier(0.22, 1, 0.36, 1),
    filter    1.05s cubic-bezier(0.22, 1, 0.36, 1);
}
.cat-sec .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(1) { transition-delay:   0ms; }
.cat-sec .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(2) { transition-delay: 160ms; }
.cat-sec .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(3) { transition-delay: 320ms; }
.cat-sec .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(4) { transition-delay: 480ms; }

/* — WHY CHOOSE US: breath reveal — pure scale, no direction */
.wcu .rv-stagger > *:not([aria-hidden]) {
  transform: scale(0.93);
  filter: none;
  transition:
    opacity   1.15s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.30s cubic-bezier(0.22, 1, 0.36, 1);
}
.wcu .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(1) { transition-delay:   0ms; }
.wcu .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(2) { transition-delay: 130ms; }
.wcu .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(3) { transition-delay: 260ms; }
.wcu .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(4) { transition-delay: 390ms; }
.wcu .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(5) { transition-delay: 520ms; }
.wcu .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(6) { transition-delay: 650ms; }

/* — BLOG: editorial reveal — subtle up + very light blur */
.blg .rv-stagger > *:not([aria-hidden]) {
  transform: translateY(20px);
  filter: blur(1.5px);
  transition:
    opacity   1.15s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.25s cubic-bezier(0.22, 1, 0.36, 1),
    filter    1.00s cubic-bezier(0.22, 1, 0.36, 1);
}
.blg .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(1) { transition-delay:   0ms; }
.blg .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(2) { transition-delay: 140ms; }
.blg .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(3) { transition-delay: 280ms; }
.blg .rv-stagger.is-vis > *:not([aria-hidden]):nth-child(4) { transition-delay: 420ms; }

/* — LEADERSHIP (ab): editorial paper reveal — scale from slightly small */
.ab .rv-stagger-sm > * {
  transform: translateY(14px) scale(0.97);
  filter: blur(1px);
  transition:
    opacity   1.05s cubic-bezier(0.22, 1, 0.36, 1),
    transform 1.15s cubic-bezier(0.22, 1, 0.36, 1),
    filter    0.95s cubic-bezier(0.22, 1, 0.36, 1);
}
.ab .rv-stagger-sm.is-vis > *:nth-child(1) { transition-delay:   0ms; }
.ab .rv-stagger-sm.is-vis > *:nth-child(2) { transition-delay: 120ms; }
.ab .rv-stagger-sm.is-vis > *:nth-child(3) { transition-delay: 240ms; }
.ab .rv-stagger-sm.is-vis > *:nth-child(4) { transition-delay: 360ms; }

/* ═══════════════════════════════════════════════════════════════
   HERO — Cinematic focus reveal (CSS keyframes, page-load only)
════════════════════════════════════════════════════════════════ */
@keyframes rv-hero-bg {
  from { opacity: 0; transform: scale(1.06); filter: blur(8px); }
  to   { opacity: 1; transform: scale(1);    filter: blur(0);   }
}
@keyframes rv-hero-rise {
  from { opacity: 0; transform: translateY(16px); filter: blur(3px); }
  to   { opacity: 1; transform: none;             filter: blur(0);   }
}
.hero-rv-bg {
  animation: rv-hero-bg 1.80s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.hero-rv    { animation: rv-hero-rise 1.10s cubic-bezier(0.22, 1, 0.36, 1) both; }
.hero-rv-d1 { animation-delay: 0.35s; }
.hero-rv-d2 { animation-delay: 0.50s; }
.hero-rv-d3 { animation-delay: 0.62s; }
.hero-rv-d4 { animation-delay: 0.76s; }
.hero-rv-d5 { animation-delay: 0.90s; }

/* ── Mobile: reduce distance & duration ── */
@media (max-width: 768px) {
  .rv { transition-duration: 0.95s; }
  .rv-up     { transform: translateY(14px); filter: blur(0.5px); }
  .rv-scale  { transform: scale(0.97); filter: blur(1px); }
  .rv-focus  { filter: blur(3px); }
  .rv-stagger > *:not([aria-hidden]) { transform: translateY(12px); filter: blur(0.5px); }
  .rv-stagger-sm > * { transform: scale(0.97); filter: none; }
  /* section personalities — reduce on mobile */
  .cat-sec .rv-stagger > *:not([aria-hidden]) { transform: scale(0.97); filter: blur(1.5px); }
  .wcu .rv-stagger > *:not([aria-hidden])      { transform: scale(0.96); }
  .blg .rv-stagger > *:not([aria-hidden])      { transform: translateY(12px); filter: blur(0.5px); }
  .ab  .rv-stagger-sm > *                      { transform: translateY(10px); filter: none; }
}

/* ── Reduced motion: instant opacity-only reveal ── */
@media (prefers-reduced-motion: reduce) {
  .rv,
  .rv-stagger > *,
  .rv-stagger-sm > *,
  .hero-rv, .hero-rv-bg,
  .cat-sec .rv-stagger > *,
  .wcu .rv-stagger > *,
  .blg .rv-stagger > *,
  .ab  .rv-stagger-sm > * {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    animation: none !important;
    transition: opacity 0.15s !important;
    will-change: auto !important;
  }
}

/* ═══════════════════════════════════════════
   TOKENS
═══════════════════════════════════════════ */
:root {
  --lb: #050505;
  --lb2: #0A0A0A;
  --lb3: #111;
  --lw: #F0EDE8;
  --lw2: rgba(240,237,232,.5);
  --lw3: rgba(240,237,232,.2);
  --lg: #C9A84C;
  --lg2: rgba(201,168,76,.15);
  --lbor: rgba(255,255,255,.07);
  --lserif: 'Cormorant Garamond', Georgia, serif;
  --lsans: 'Inter', 'Segoe UI', sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ═══════════════════════════════════════════
   PRELOADER
═══════════════════════════════════════════ */
.lc-intro {
  position: fixed; inset: 0; background: #000; z-index: 9000;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.lc-intro-logo {
  width: clamp(80px, 18vw, 200px);
  height: auto;
  object-fit: contain;
  animation: lc-logo-spin-grow 2.2s ease-in-out forwards;
}
@keyframes lc-logo-spin-grow {
  0%   { transform: scale(0.05) rotate(0deg);   opacity: 0.7; }
  100% { transform: scale(1)    rotate(360deg); opacity: 1;   }
}
.lc-intro.lc-intro-fadeout {
  animation: lc-intro-out 0.4s ease forwards;
}
@keyframes lc-intro-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* ═══════════════════════════════════════════
   MAIN WRAP
═══════════════════════════════════════════ */
.lc-wrap { background: var(--lb); color: var(--lw); overflow: hidden; }

/* ═══════════════════════════════════════════
   HERO
═══════════════════════════════════════════ */
/* ═══ HERO SLIDER ═══ */
/* ══ HERO ══════════════════════════════════════════════════════ */
.lc-hero {
  position: relative;
  height: clamp(580px, 88vh, 700px);
  overflow: hidden;
  background: #1a2a18;
  user-select: none;
}
@media (min-width: 1400px) { .lc-hero { height: 720px; } }
/* Tablet */
@media (max-width: 1023px) { .lc-hero { height: clamp(520px, 70vh, 620px); } }
/* Mobile — portrait composition: upper content, lower product art */
@media (max-width: 767px)  { .lc-hero { height: clamp(520px, 80svh, 590px); } }

/* ── Slider track ── */
.lc-slider-track { position: absolute; inset: 0; }

.lc-slide {
  position: absolute; inset: 0;
  opacity: 0;
  transition: opacity 1.10s cubic-bezier(0.4,0,0.2,1), transform 1.10s cubic-bezier(0.4,0,0.2,1);
  transform: scale(1.02);
}
.lc-slide.lc-slide-a { opacity: 1; transform: scale(1); }

/* Background image — always cover, no distortion */
.lc-slide-bg {
  position: absolute; inset: 0;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: var(--bg-pos, 50% center);
}
/* Tablet: shift slightly to show product group */
@media (max-width: 1023px) and (min-width: 768px) {
  .lc-slide-bg { background-position: var(--bg-pos, 55% center); }
}
/* Mobile: intelligent per-slide positioning, always cover — NO background-size override */
@media (max-width: 767px) {
  .lc-slide-bg {
    background-position: var(--bg-pos-m, 58% center);
    background-size: cover;
  }
}

/* ── Gradient overlay ──
   Desktop: left-sweep — dark on left for text, open on right for products
   Mobile:  very subtle — photography stays fully visible */
.lc-slide-ov {
  position: absolute; inset: 0;
  background: linear-gradient(
    105deg,
    rgba(10,22,10,.82) 0%,
    rgba(10,22,10,.64) 28%,
    rgba(10,22,10,.28) 52%,
    rgba(10,22,10,.04) 70%,
    transparent 100%
  );
}
/* Tablet — narrower sweep */
@media (max-width: 1023px) and (min-width: 768px) {
  .lc-slide-ov {
    background: linear-gradient(
      100deg,
      rgba(10,22,10,.78) 0%,
      rgba(10,22,10,.52) 32%,
      rgba(10,22,10,.18) 58%,
      transparent 80%
    );
  }
}
/* Mobile — photography-first: only a feather-light grade for text contrast.
   NO heavy black. The image is the hero. */
@media (max-width: 767px) {
  .lc-slide-ov {
    background: linear-gradient(
      180deg,
      rgba(14,28,14,.48) 0%,
      rgba(14,28,14,.28) 35%,
      rgba(14,28,14,.14) 60%,
      rgba(14,28,14,.06) 100%
    );
  }
}

/* ── Content panels ── */
.lc-hc {
  position: absolute; inset: 0; z-index: 3;
  display: flex; align-items: center;
  padding: 0 5% 0 7%;
  opacity: 0; pointer-events: none;
  transition: opacity 700ms ease-in-out;
}
.lc-hc.lc-hc-a { opacity: 1; pointer-events: auto; }

/* Tablet: panel left-aligned with breathing room, centered on mobile */
@media (max-width: 1024px) and (min-width: 768px) {
  .lc-hc { padding: 0 5% 0 5%; align-items: center; }
}
@media (max-width: 767px) {
  /* Upper zone: panel centered, anchored near top */
  .lc-hc {
    align-items: flex-start;
    justify-content: center;
    padding: clamp(52px, 9vh, 68px) 0 0;
  }
}

/* Botanical stem */
.lc-bot { flex-shrink: 0; margin-right: 18px; align-self: center; opacity: 0.85; }
@media (max-width: 900px) { .lc-bot { display: none; } }

/* Text block — desktop: clean, no panel */
.lc-hc-text { max-width: 500px; }
@media (max-width: 1100px) { .lc-hc-text { max-width: 440px; } }

/* ── Tablet + Mobile: premium translucent content panel ──
   Desktop (≥1025px) gets NONE of this. */
@media (max-width: 1024px) {
  .lc-hc-text {
    /* Panel surface: Ayurvedic paper + frosted glass */
    background: rgba(247,241,222,0.76);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.36);
    box-shadow:
      0 12px 40px rgba(30,55,35,0.14),
      0 2px 8px rgba(30,55,35,0.06);
    border-radius: 24px 24px 30px 20px;
    /* Tablet sizing */
    width: min(520px, calc(100% - 60px));
    max-width: 520px;
    padding: 46px 32px 44px;
    /* Animate in with the slide */
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  /* Inside the panel, override colors to dark Ayurvedic palette */
  .lc-hc-text .lc-ey  { color: #7a5e22; }
  .lc-hc-text .lc-sh  { color: #173d2c; text-shadow: none; }
  .lc-hc-text .lc-sp  { color: #3d5442; }
  .lc-hc-text .lc-ssub { color: rgba(90,70,30,0.60); }
  /* Ornament lines take on gold against the cream panel */
  .lc-hc-text .lc-orn-l { background: linear-gradient(to right, transparent, rgba(170,130,45,0.55)); }
  .lc-hc-text .lc-orn-r { background: linear-gradient(to left,  transparent, rgba(170,130,45,0.55)); }
}

/* Mobile: panel narrowed to clear the side-gutter arrows (36px wide at 7px = 43px).
   Panel starts at 44px from each edge → 1px visual gutter outside arrows. */
@media (max-width: 767px) {
  .lc-hc-text {
    width: calc(100% - 88px);
    max-width: 340px;
    margin: 0 auto;
    padding: 34px 20px 32px;
  }
}
/* Very small screens (360–375px): same formula, slightly tighter padding */
@media (max-width: 380px) {
  .lc-hc-text {
    width: calc(100% - 88px);
    padding: 30px 18px 28px;
  }
}

/* Base opacity-0 for all text elements (inactive slides hidden) */
.lc-ey, .lc-orn, .lc-sh, .lc-sp, .lc-scta, .lc-ssub { opacity: 0; }

/* Eyebrow */
.lc-ey {
  font-family: var(--lsans); font-size: 10px; font-weight: 700;
  letter-spacing: .26em; text-transform: uppercase;
  color: #94bb5a; margin: 0 0 11px; line-height: 1;
  text-shadow: 0 1px 8px rgba(0,0,0,.35);
}
.lc-hc-a .lc-ey { animation: lc-tup .7s .05s ease-out both; }
@media (max-width: 767px) { .lc-ey { font-size: 10px; letter-spacing: .22em; margin-bottom: 9px; } }

/* Ornamental divider */
.lc-orn { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.lc-hc-a .lc-orn { animation: lc-tup .7s .14s ease-out both; }
.lc-orn-l, .lc-orn-r { height: 1px; flex: 1; max-width: 56px; }
.lc-orn-l { background: linear-gradient(to right, transparent, rgba(201,168,76,.60)); }
.lc-orn-r { background: linear-gradient(to left,  transparent, rgba(201,168,76,.60)); }
@media (max-width: 767px) { .lc-orn { margin-bottom: 10px; } }

/* Heading */
.lc-sh {
  font-family: var(--lserif); font-weight: 500;
  font-size: clamp(32px, 4vw, 62px);
  line-height: 1.08; letter-spacing: -.01em;
  color: #f6f1e4; margin: 0 0 14px;
  display: flex; flex-direction: column;
  text-shadow: 0 2px 18px rgba(0,0,0,.30);
}
.lc-hc-a .lc-sh { animation: lc-tup .90s .22s ease-out both; }
.lc-sh-ln { display: block; }
@media (max-width: 1023px) { .lc-sh { font-size: clamp(28px, 3.8vw, 48px); } }
@media (max-width: 767px) {
  .lc-sh {
    font-size: clamp(29px, 8vw, 38px);
    line-height: 1.10;
    letter-spacing: -.014em;
    margin-bottom: 11px;
    text-shadow: 0 2px 14px rgba(0,0,0,.28);
    max-width: 100%;
  }
}

/* Description */
.lc-sp {
  font-family: var(--lsans); font-size: clamp(13px, 1.05vw, 15px);
  line-height: 1.72; color: rgba(240,232,212,.72);
  margin: 0 0 24px; max-width: 420px;
}
.lc-hc-a .lc-sp { animation: lc-tup .90s .38s ease-out both; }
@media (max-width: 1023px) { .lc-sp { font-size: 13.5px; max-width: 360px; } }
@media (max-width: 767px) {
  .lc-sp {
    font-size: 13.5px;
    line-height: 1.55;
    max-width: 100%;
    margin-bottom: 20px;
    color: rgba(240,232,212,.80);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

/* CTA button — premium, 50px height */
.lc-scta {
  display: inline-flex; align-items: center; gap: 12px;
  font-family: var(--lsans); font-size: 13px; font-weight: 600; letter-spacing: .06em;
  color: #f2ede2; text-decoration: none; text-transform: uppercase;
  background: linear-gradient(135deg, #2f5c22 0%, #3d7229 100%);
  padding: 15px 18px 15px 28px;
  min-height: 50px;
  border-radius: 50px;
  transition: background .25s, transform .22s, box-shadow .25s;
  margin-bottom: 18px;
  box-shadow: 0 5px 24px rgba(30,65,18,0.42), 0 1px 4px rgba(0,0,0,.18);
}
.lc-scta:hover {
  background: linear-gradient(135deg, #3a6e2a 0%, #4a8632 100%);
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(30,65,18,0.50);
}
.lc-scta:hover .lc-scta-icon svg { transform: translateX(4px); }
.lc-scta-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lc-scta-icon svg { transition: transform .22s ease; }
.lc-hc-a .lc-scta { animation: lc-tup .90s .52s ease-out both; }
@media (max-width: 767px) {
  .lc-scta {
    font-size: 12.5px;
    padding: 14px 18px 14px 24px;
    gap: 10px;
    margin-bottom: 14px;
    min-height: 50px;
  }
}

/* Sub-text (trust badges) */
.lc-ssub {
  font-family: var(--lsans); font-size: 10px; font-weight: 500;
  letter-spacing: .20em; color: rgba(220,200,148,.55); margin: 0;
}
.lc-hc-a .lc-ssub { animation: lc-tup .7s .65s ease-out both; }
@media (max-width: 767px) { .lc-ssub { font-size: 9.5px; letter-spacing: .16em; } }

@keyframes lc-tup {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes lc-blink { 0%,100% { opacity: .4; } 50% { opacity: 1; } }

/* ── Nav arrows — premium cream/glass, vertically centred ── */
.lc-nav {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 5;
  width: 46px; height: 46px; border-radius: 50%;
  background: rgba(250,248,235,.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.50);
  color: #1e4212; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background .22s, transform .22s, box-shadow .22s;
  box-shadow: 0 5px 18px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.10);
}
.lc-nav:hover {
  background: rgba(255,255,255,.96);
  transform: translateY(-50%) scale(1.08);
  box-shadow: 0 8px 24px rgba(0,0,0,.20);
}
.lc-nav-p { left: 14px; }
.lc-nav-n { right: 14px; }

/* Tablet (768–1024px): arrows in side gutters, panel is centered with ~60px margins */
@media (max-width: 1024px) and (min-width: 768px) {
  .lc-nav {
    width: 40px; height: 40px;
    background: rgba(250,248,235,.88);
    border-color: rgba(170,145,76,.32);
    box-shadow: 0 4px 14px rgba(20,45,30,.12);
  }
  .lc-nav:hover { transform: translateY(-50%) scale(1.04); }
  .lc-nav-p { left: 18px; }
  .lc-nav-n { right: 18px; }
}

/* Mobile: 36×36px visual button in side gutters, never over the panel.
   Panel is calc(100% - 88px) wide → left/right edges at 44px from viewport.
   Arrow right edge = 7 + 36 = 43px → 1px outside the panel. */
@media (max-width: 767px) {
  .lc-nav {
    width: 36px; height: 36px;
    top: 50%; transform: translateY(-50%);
    background: rgba(250,248,235,.90);
    border: 1px solid rgba(170,145,76,.28);
    box-shadow: 0 4px 14px rgba(20,45,30,.12);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  /* Extend touch target invisibly to 44px without changing visual size */
  .lc-nav::before {
    content: '';
    position: absolute;
    inset: -4px;
  }
  .lc-nav:hover { transform: translateY(-50%); }
  .lc-nav:active { transform: translateY(-50%) scale(0.94); }
  .lc-nav-p { left: 7px; }
  .lc-nav-n { right: 7px; }
}

/* ── Pagination dots — bottom-center, clear of WhatsApp (bottom-right) ── */
.lc-dots {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  z-index: 10; display: flex; align-items: center; gap: 7px;
}
.lc-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(245,238,215,.32); border: none; cursor: pointer; padding: 0;
  outline: 14px solid transparent;
  transition: all .38s ease; flex-shrink: 0;
}
.lc-dot.lc-dot-a { width: 22px; border-radius: 4px; background: #c9a84c; }
/* Mobile — keep centered, WhatsApp is fixed bottom-right (outside hero z-stack) */
@media (max-width: 767px) {
  .lc-dots { bottom: 18px; left: 50%; transform: translateX(-50%); }
}

/* ── Scroll cue — desktop only ── */
.lc-scroll-cue {
  position: absolute; right: 26px; bottom: 22px; z-index: 10;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.lc-sc-line {
  width: 1px; height: 42px;
  background: linear-gradient(to bottom, rgba(201,168,76,.75), transparent);
  animation: lc-blink 2.5s ease-in-out infinite;
}
.lc-scroll-cue span { font-size: 8px; font-weight: 700; letter-spacing: .22em; color: rgba(240,237,232,.28); writing-mode: vertical-rl; }
@media (max-width: 1023px) { .lc-scroll-cue { display: none; } }

/* ═══════════════════════════════════════════
   PROMO STRIP
═══════════════════════════════════════════ */
.lc-promo {
  background: #064E3B;
  height: 60px;
  overflow: hidden;
  display: flex; align-items: center;
  position: relative;
  width: 100%;
}
@media (max-width: 768px) { .lc-promo { height: 50px; } }

.lc-promo-track {
  display: flex; align-items: center;
  width: max-content;
  animation: lc-promo-scroll 60s linear infinite;
  will-change: transform;
}
.lc-promo:hover .lc-promo-track { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .lc-promo-track { animation: none; }
  .lc-promo { overflow-x: auto; scrollbar-width: none; }
  .lc-promo::-webkit-scrollbar { display: none; }
}

@keyframes lc-promo-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-25%); }
}

.lc-promo-seg {
  display: inline-flex; align-items: center; gap: 10px;
  white-space: nowrap; flex-shrink: 0;
  padding: 0 8px;
}

.lc-ps-sep {
  color: #C9A84C;
  font-size: 10px;
  flex-shrink: 0;
  opacity: 0.85;
  line-height: 1;
}

.lc-ps-t {
  font-family: var(--lsans);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(240, 235, 218, 0.82);
  white-space: nowrap;
}

.lc-ps-hl {
  font-family: var(--lsans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #C9A84C;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .lc-ps-t, .lc-ps-hl { font-size: 11px; letter-spacing: 0.14em; }
}

/* ═══════════════════════════════════════════
   CATEGORIES SECTION — Botanical Gallery
═══════════════════════════════════════════ */
.cat-sec {
  position: relative;
  overflow: hidden;
  padding: 96px 0 100px;
  min-height: 640px;
}
/* Background */
.cat-bg {
  position: absolute; inset: 0;
  background: url('/assets/images/categories.png') center / cover no-repeat;
  z-index: 0; pointer-events: none;
}
/* Soft fade from previous section (top) */
.cat-fade-top {
  position: absolute; top: 0; left: 0; right: 0; height: 180px;
  background: linear-gradient(to bottom, #f5f0e8 0%, transparent 100%);
  z-index: 1; pointer-events: none;
}
/* Soft fade into next section (bottom) */
.cat-fade-bot {
  position: absolute; bottom: 0; left: 0; right: 0; height: 180px;
  background: linear-gradient(to top, #04120a 0%, transparent 100%);
  z-index: 1; pointer-events: none;
}
.cat-inner {
  position: relative; z-index: 2;
  max-width: 1500px; margin: 0 auto;
  padding: 0 56px;
}

/* ── Heading ── */
.cat-head {
  text-align: center; margin-bottom: 56px;
}
.cat-eye {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  font-family: var(--lsans); font-size: 10px; font-weight: 700;
  letter-spacing: 0.28em; text-transform: uppercase;
  color: #b99a52; margin-bottom: 16px;
}
.cat-eye-line {
  display: inline-block; width: 44px; height: 1px;
  background: linear-gradient(to right, transparent, rgba(185,154,82,0.80));
}
.cat-eye-line-r { background: linear-gradient(to left, transparent, rgba(185,154,82,0.80)); }
.cat-h2 {
  font-family: var(--lserif); font-size: clamp(28px, 3vw, 48px);
  color: #1a2e1a; font-weight: 500; margin: 0 0 14px; line-height: 1.22;
  text-shadow: 0 1px 12px rgba(255,252,240,0.70);
}
.cat-h2 em { font-style: italic; color: #3d6b35; }
.cat-sub {
  font-family: var(--lsans); font-size: 15px; color: #3a4e2a;
  max-width: 540px; margin: 0 auto 18px; line-height: 1.72;
}
.cat-orn { margin-top: 4px; opacity: 0.70; }

/* ── Grid ── */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 28px;
}
/* center cards when fewer than 4 */
.cat-grid-center {
  justify-content: center;
  grid-template-columns: repeat(auto-fit, minmax(240px, 300px));
}

/* ══ CARD — Premium Painted Botanical ══ */
.cat-card {
  position: relative;
  display: flex; flex-direction: column;
  text-decoration: none; cursor: pointer;
  background: #f8f3e6;
  border-radius: 28px 20px 32px 18px;
  overflow: visible;
  isolation: isolate;
  box-shadow:
    0 18px 45px rgba(35,63,43,0.14),
    0 5px 15px rgba(35,63,43,0.08);
  transition: transform 0.45s cubic-bezier(0.22,1,0.36,1),
              box-shadow 0.45s ease;
}
.cat-card:hover {
  transform: translateY(-6px);
  box-shadow:
    0 25px 55px rgba(35,63,43,0.18),
    0 8px 20px rgba(35,63,43,0.10);
}

/* Organic painted outer frame */
.cat-card::before {
  content: '';
  position: absolute; inset: -7px; z-index: -2;
  background: linear-gradient(135deg,
    #d8c99b 0%, #edf0d9 35%, #c9d3ae 65%, #e5d5a5 100%);
  border-radius: 30px 18px 35px 22px;
  transform: rotate(-0.6deg);
  opacity: 0.9;
  pointer-events: none;
}

/* Soft paint / paper layer */
.cat-card::after {
  content: '';
  position: absolute; inset: -3px; z-index: -1;
  background:
    radial-gradient(circle at 15% 20%, rgba(255,255,255,0.65), transparent 35%),
    radial-gradient(circle at 90% 80%, rgba(122,151,102,0.15), transparent 40%),
    #f8f3e6;
  border-radius: 27px 22px 31px 20px;
  opacity: 0.95;
  pointer-events: none;
}

/* ── Frame wrapper ── */
.cat-frame-wrap {
  position: relative;
  margin: 10px 10px 0;
}

/* Gold accent ring — hide deco div, use img-wrap::before instead */
.cat-frame-deco { display: none; }

/* ── Image wrapper ── */
.cat-img-wrap {
  position: relative;
  height: 245px;
  overflow: hidden;
  border-radius: 21px 17px 24px 15px;
  background: #eee7d4;
  box-shadow:
    inset 0 0 0 1px rgba(126,108,64,0.18),
    0 5px 18px rgba(44,61,40,0.10);
}
/* Organic paint edge around image */
.cat-img-wrap::before {
  content: '';
  position: absolute; inset: -5px; z-index: 2;
  pointer-events: none;
  border: 3px solid rgba(213,192,137,0.55);
  border-radius: 24px 14px 27px 17px;
  transform: rotate(0.4deg);
}
.cat-img {
  width: 100%; height: 100%;
  display: block; object-fit: cover;
  transition: transform 0.80s cubic-bezier(0.22,1,0.36,1),
              filter 0.5s ease;
}
.cat-card:hover .cat-img { transform: scale(1.035); }

/* Vignette */
.cat-vignette {
  position: absolute; inset: 0; z-index: 1;
  background: radial-gradient(ellipse at center,
    transparent 52%, rgba(20,38,15,0.26) 100%);
  pointer-events: none;
}

/* ── Card Body ── */
.cat-body {
  position: relative;
  padding: 12px 16px 20px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(180deg, rgba(248,243,230,0.96), #f8f3e6);
  border-radius: 0 0 28px 18px;
}
.cat-name {
  font-family: var(--lserif); font-size: 20px; font-weight: 500;
  color: #173f32; margin: 0; line-height: 1.25;
  letter-spacing: -0.2px; text-align: center;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}

/* ── Explore All button (after grid) ── */
.cat-explore-wrap {
  display: flex; justify-content: center;
  margin-top: 48px;
}
.cat-explore-btn {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--lsans); font-size: 13px; font-weight: 700;
  letter-spacing: 1.6px; text-transform: uppercase;
  color: #f8f3e6; text-decoration: none;
  background: linear-gradient(135deg, #2d5a28 0%, #3d7a35 100%);
  padding: 15px 38px;
  border-radius: 50px;
  box-shadow: 0 6px 24px rgba(35,63,43,0.28), 0 2px 6px rgba(35,63,43,0.14);
  border: 1.5px solid rgba(255,255,255,0.12);
  transition: transform 0.35s cubic-bezier(0.22,1,0.36,1),
              box-shadow 0.35s ease, background 0.35s ease;
}
.cat-explore-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 36px rgba(35,63,43,0.34), 0 4px 10px rgba(35,63,43,0.16);
  background: linear-gradient(135deg, #245022 0%, #376b2e 100%);
}
.cat-explore-btn svg {
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
}
.cat-explore-btn:hover svg { transform: translateX(4px); }

/* ── Leaf decoration ── */
.cat-leaf {
  position: absolute;
  width: 76px; height: auto;
  right: -12px; bottom: -15px;
  z-index: 5; pointer-events: none;
  filter: drop-shadow(0 5px 6px rgba(38,68,42,0.15));
  transform: rotate(-3deg);
  transition: transform 0.5s cubic-bezier(0.22,1,0.36,1);
}
.cat-card:hover .cat-leaf { transform: translate(3px, -3px) rotate(-1deg); }

@media (prefers-reduced-motion: reduce) {
  .cat-card, .cat-img, .cat-leaf, .cat-explore-btn, .cat-explore-btn svg { transition: none !important; }
}

/* ── Loading skeleton ── */
@keyframes cat-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.cat-skel {
  background: rgba(253,250,242,0.92);
  border-radius: 22px 20px 20px 22px;
  border: 1px solid rgba(185,154,82,0.18);
  overflow: hidden; padding: 14px 14px 20px;
}
.cat-skel-frame {
  aspect-ratio: 4/3; border-radius: 16px; margin-bottom: 14px;
  background: linear-gradient(90deg, #ede8dc 25%, #e0d9c8 50%, #ede8dc 75%);
  background-size: 200% 100%;
  animation: cat-shimmer 1.4s infinite;
}
.cat-skel-line {
  border-radius: 6px; margin-bottom: 10px;
  background: linear-gradient(90deg, #ede8dc 25%, #e0d9c8 50%, #ede8dc 75%);
  background-size: 200% 100%;
  animation: cat-shimmer 1.4s infinite 0.1s;
}
.cat-skel-l1 { height: 16px; width: 68%; }
.cat-skel-l2 { height: 11px; width: 44%; }

/* ── State (error / empty) ── */
.cat-state {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 56px 0;
  font-family: var(--lsans); font-size: 15px; color: #3a4a2a;
  text-shadow: 0 1px 8px rgba(255,252,240,0.60);
}
.cat-retry {
  background: none; border: 1px solid rgba(185,154,82,0.70); color: #b99a52;
  padding: 6px 18px; border-radius: 20px; cursor: pointer;
  font-family: var(--lsans); font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
  transition: background 0.22s ease;
}
.cat-retry:hover { background: rgba(185,154,82,0.10); }

/* ── Responsive ── */
@media (max-width: 1280px) {
  .cat-grid:not(.cat-grid-center) { grid-template-columns: repeat(3, 1fr); }
  .cat-inner { padding: 0 36px; }
}
@media (max-width: 1024px) and (min-width: 768px) {
  .cat-sec { padding: 72px 0 80px; }
  .cat-inner { padding: 0 32px; }
  .cat-head { margin-bottom: 44px; }
  .cat-grid:not(.cat-grid-center) { grid-template-columns: repeat(2, 1fr); gap: 22px; }
  .cat-grid-center { grid-template-columns: repeat(auto-fit, minmax(200px, 280px)); }
  .cat-img-wrap { height: 200px; }
  .cat-name { font-size: 18px; }
  .cat-explore-wrap { margin-top: 40px; }
}
@media (max-width: 767px) {
  .cat-sec { padding: 60px 0 72px; }
  .cat-inner { padding: 0 14px; }
  .cat-head { margin-bottom: 36px; }
  .cat-h2 { font-size: clamp(22px, 5.8vw, 32px); }
  .cat-sub { font-size: 13.5px; }
  .cat-grid:not(.cat-grid-center) { grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .cat-grid-center { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
  .cat-img-wrap { height: 150px; }
  .cat-frame-wrap { margin: 8px 8px 0; }
  .cat-body { padding: 10px 10px 16px; }
  .cat-name { font-size: 14px; }
  .cat-leaf { width: 44px; bottom: -8px; right: -6px; }
  .cat-explore-wrap { margin-top: 36px; }
  .cat-explore-btn { padding: 14px 28px; font-size: 12px; letter-spacing: 1.4px; }
}
@media (max-width: 380px) {
  .cat-inner { padding: 0 10px; }
  .cat-grid:not(.cat-grid-center) { gap: 10px; }
  .cat-img-wrap { height: 130px; }
  .cat-name { font-size: 13px; }
  .cat-leaf { width: 36px; }
}
@media (prefers-reduced-motion: reduce) {
  .cat-skel-frame, .cat-skel-line { animation: none; }
  .cat-card, .cat-img, .cat-arr, .cat-leaf, .cat-frame-deco { transition: none; }
}

/* ═══════════════════════════════════════════
   ABOUT SECTION
═══════════════════════════════════════════ */
.ab {
  position: relative;
  background: #04120a;
  padding-bottom: 0;
  /* min-height ensures text is always fully visible even when bg image is shorter */
  min-height: 640px;
}

/* Stage: bg image in-flow sets natural height; product overlaid at same bottom edge */
.ab-stage {
  position: relative;
  width: 100%;
  overflow: visible;
}

/* Background image — in-flow, natural proportions, zero zoom */
.ab-bg {
  display: block;
  width: 100%; height: auto;
  position: relative; z-index: 0;
  opacity: 0.68;
}
@media (max-width: 1024px) and (min-width: 768px) {
  .ab-bg { height: 310px; object-fit: cover; object-position: center top; }
}
@media (max-width: 767px) {
  .ab-bg { height: 230px; object-fit: cover; object-position: center top; }
}

/* Right-side readability veil — inside stage */
.ab-veil {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(
    270deg,
    rgba(3,12,5,0.92) 0%,
    rgba(3,12,5,0.78) 38%,
    rgba(3,12,5,0.32) 58%,
    rgba(3,12,5,0.06) 74%,
    transparent 100%
  );
}
@media (max-width: 1024px) {
  .ab-veil {
    background: linear-gradient(
      to bottom,
      rgba(3,12,5,0.22) 0%,
      rgba(3,12,5,0.48) 60%,
      rgba(3,12,5,0.72) 100%
    );
  }
}

/* Text: absolute over the bg image area only (matches stage height, not full section) */
.ab-inner {
  position: absolute;
  top: 0; right: 0;
  width: 52%;
  /* match the stage's natural height at each viewport so text centers within the image area */
  height: max(640px, 41.7vw);
  z-index: 3;
  display: flex; align-items: center;
  padding: 60px 80px 60px 24px;
}
@media (max-width: 1100px) { .ab-inner { width: 56%; padding: 50px 48px 50px 20px; } }
@media (max-width: 1024px) and (min-width: 768px) {
  .ab-inner {
    position: relative;
    top: auto; right: auto;
    width: 100%; height: auto;
    max-width: 700px; margin: 0 auto;
    padding: 36px 32px 60px;
  }
}
@media (max-width: 767px) {
  .ab-inner {
    position: relative;
    top: auto; right: auto;
    width: 100%; height: auto;
    padding: 28px 20px 48px;
  }
}

/* ── Text column ── */
.ab-left {
  width: 100%;
  display: flex; flex-direction: column; gap: 26px;
}
@media (max-width: 1024px) and (min-width: 768px) { .ab-left { gap: 22px; } }
@media (max-width: 767px) { .ab-left { gap: 18px; } }

/* Eyebrow */
.ab-eye {
  display: flex; align-items: center; gap: 12px;
  font-family: var(--lsans); font-size: 10px; font-weight: 700;
  letter-spacing: 0.26em; text-transform: uppercase;
  color: #C9A84C;
}
.ab-eye-line {
  flex: 1; max-width: 36px; height: 1px;
  background: linear-gradient(to right, #C9A84C, transparent);
  flex-shrink: 0;
}
.ab-eye-center { justify-content: center; }
.ab-eye-center .ab-eye-line:last-child {
  background: linear-gradient(to left, #C9A84C, transparent);
}

/* Main heading */
.ab-h2 {
  font-family: var(--lserif);
  font-size: clamp(32px, 4.2vw, 62px);
  font-weight: 500; line-height: 1.15; letter-spacing: -0.01em;
  color: #f5f0e6; margin: 0;
}
.ab-h2 em { font-style: italic; color: #C9A84C; }
@media (max-width: 1024px) and (min-width: 768px) {
  .ab-h2 { font-size: clamp(36px, 5vw, 50px); line-height: 1.12; }
}
@media (max-width: 767px) {
  .ab-h2 { font-size: clamp(30px, 8vw, 40px); line-height: 1.10; max-width: 340px; }
}

/* Gold accent inline */
.ab-gold { color: #C9A84C; font-style: normal; }

/* Intro text */
.ab-intro { display: flex; flex-direction: column; gap: 12px; }
.ab-intro p {
  font-family: var(--lsans); font-size: 14px; line-height: 1.85;
  color: rgba(235,228,210,0.75); margin: 0;
}
.ab-intro-2 { margin-top: -4px; }
@media (max-width: 1024px) and (min-width: 768px) {
  .ab-intro p { font-size: 15px; line-height: 1.65; }
}
@media (max-width: 767px) {
  .ab-intro p { font-size: 14px; line-height: 1.65; }
}

/* Trust indicators */
.ab-trust {
  display: flex; flex-wrap: wrap; gap: 10px 22px;
}
.ab-ti {
  display: flex; align-items: center; gap: 7px;
  font-family: var(--lsans); font-size: 11px; font-weight: 500;
  letter-spacing: 0.08em; color: rgba(235,228,210,0.72);
  white-space: nowrap;
}
.ab-ti svg { flex-shrink: 0; }

.ab-sep-sym { color: #C9A84C; font-size: 10px; line-height: 1; flex-shrink: 0; }

/* Product: absolute in stage → bottom: 0 = exactly bg image bottom = same ground line */
.ab-prod {
  position: absolute;
  bottom: 0; left: 3%;
  width: 34%; max-width: 500px;
  height: auto; object-fit: contain;
  display: block;
  z-index: 2;
  filter: drop-shadow(0 20px 44px rgba(0,0,0,0.52));
  opacity: 0;
  animation: ab-prod-in 1.1s 0.3s ease-out forwards;
}
@keyframes ab-prod-in {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ab-prod-in-center {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ab-prod { animation: none; opacity: 1; }
}
@media (max-width: 1024px) and (min-width: 768px) {
  .ab-prod {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    bottom: auto;
    width: 62%; max-width: 420px;
    margin: 0;
    opacity: 1;
    animation: none;
    filter: drop-shadow(0 14px 28px rgba(0,0,0,.26));
  }
}
@media (max-width: 767px) {
  .ab-prod {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    bottom: auto;
    width: 83%; max-width: 320px;
    margin: 0;
    opacity: 1;
    animation: none;
    filter: drop-shadow(0 12px 24px rgba(0,0,0,.22));
  }
}

/* Text entrance animation */
.ab-left > * {
  opacity: 0;
  animation: ab-txt-up 0.75s ease-out forwards;
}
.ab-left > *:nth-child(1) { animation-delay: 0.05s; }
.ab-left > *:nth-child(2) { animation-delay: 0.15s; }
.ab-left > *:nth-child(3) { animation-delay: 0.25s; }
.ab-left > *:nth-child(4) { animation-delay: 0.33s; }
.ab-left > *:nth-child(5) { animation-delay: 0.42s; }
.ab-left > *:nth-child(6) { animation-delay: 0.50s; }
@keyframes ab-txt-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .ab-left > * { animation: none; opacity: 1; }
}

/* ══════════════════════════════════════════
   PRODUCT SHOWCASE
══════════════════════════════════════════ */
.ps {
  position: relative;
  background: #fff;
  overflow: hidden;
  padding-bottom: 56px;
}

/* Soft edge fade so cards blend into white section — desktop only */
.ps-edge-l, .ps-edge-r {
  position: absolute; top: 0; bottom: 0; width: 80px; z-index: 5; pointer-events: none;
}
.ps-edge-l { left: 0; background: linear-gradient(to right, #fff 0%, transparent 100%); }
.ps-edge-r { right: 0; background: linear-gradient(to left,  #fff 0%, transparent 100%); }
@media (max-width: 1024px) {
  .ps-edge-l, .ps-edge-r { display: none; }
}

/* Heading */
.ps-head {
  position: relative; z-index: 2;
  text-align: center;
  padding: 56px 20px 36px;
}

.ps-eye {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  font-family: var(--lsans); font-size: 10px; font-weight: 700;
  letter-spacing: 0.26em; text-transform: uppercase; color: #7a6040;
  margin-bottom: 14px;
}
.ps-eye-line {
  flex: 1; max-width: 52px; height: 1px;
  background: linear-gradient(to right, transparent, rgba(201,168,76,0.6));
}
.ps-eye-r { background: linear-gradient(to left, transparent, rgba(201,168,76,0.6)); }

.ps-h2 {
  font-family: var(--lserif);
  font-size: clamp(26px, 3.2vw, 50px);
  font-weight: 500; color: #1a1208; line-height: 1.18;
}
.ps-h2 em { font-style: italic; color: #3a6628; }

/* Strip wrapper — clips overflow */
.ps-strip-wrap {
  position: relative; z-index: 2;
  overflow: hidden;
  padding: 4px 0 8px;
}

/* ── Infinite marquee track — always running ── */
.ps-track {
  display: flex;
  width: max-content;
  animation: ps-scroll 50s linear infinite;
  padding: 8px 0 24px;
}
@keyframes ps-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* One set = full product list */
.ps-set {
  display: flex; gap: 18px;
  padding: 0 9px;
}

/* ── Product card — window shape: arch top, flat base ── */
.ps-card {
  position: relative;
  width: 210px; flex-shrink: 0;
  background: linear-gradient(165deg, #fffdf7 0%, #f8f2e4 100%);
  /* True semicircle arch top (card is 210px wide → 105px = full half-circle), flat base */
  border-radius: 105px 105px 0 0;
  box-shadow:
    0 -2px 0 0 rgba(201,168,76,0.18),      /* subtle gold crown line at top */
    0 8px 28px rgba(0,0,0,0.22),
    0 2px 8px rgba(0,0,0,0.10);
  overflow: hidden;
  transition: transform 0.28s ease, box-shadow 0.28s ease;
  cursor: default;
  /* Bottom border for the "windowsill" effect */
  border-bottom: 3px solid #e8dfcc;
}
.ps-card:hover {
  transform: translateY(-8px);
  box-shadow:
    0 -2px 0 0 rgba(201,168,76,0.35),
    0 22px 48px rgba(0,0,0,0.28),
    0 4px 12px rgba(0,0,0,0.14);
}

/* Discount badge */
.ps-badge {
  position: absolute; top: 22px; left: 50%; transform: translateX(-50%); z-index: 2;
  background: #B5451B; color: #fff;
  font-family: var(--lsans); font-size: 9px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 20px;
}

/* Image wrapper: fixed height, image fills the box cleanly */
.ps-img-wrap {
  display: block;
  height: 190px;
  background: #f6f2eb;
  overflow: hidden;
  text-decoration: none;
}
.ps-img {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  transition: transform 0.3s ease;
}
.ps-card:hover .ps-img { transform: scale(1.06); }

/* Card body */
.ps-body {
  padding: 11px 13px 13px;
  display: flex; flex-direction: column; gap: 5px;
}

.ps-cat {
  font-family: var(--lsans); font-size: 9px; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #7a6040;
}

.ps-name {
  font-family: var(--lserif); font-size: 15px; font-weight: 600;
  color: #1a1208; line-height: 1.3;
  text-decoration: none;
  display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.ps-name:hover { color: #3a6628; }

/* Star rating */
.ps-stars { display: flex; align-items: center; gap: 1px; }
.ps-star { font-size: 12px; line-height: 1; color: #C9A84C; }
.ps-star.ps-star-e { color: #d4c5a0; }
.ps-rv { font-family: var(--lsans); font-size: 10px; color: #9a8a6a; margin-left: 4px; }

/* Price */
.ps-price { display: flex; align-items: center; gap: 6px; margin-top: 1px; }
.ps-pc {
  font-family: var(--lsans); font-size: 15px; font-weight: 700;
  color: #2d5a1b;
}
.ps-pm {
  font-family: var(--lsans); font-size: 11px;
  color: #9a8a6a; text-decoration: line-through;
}

/* Add to cart button — flat top, flat bottom to match window base */
.ps-btn {
  margin-top: 5px;
  display: flex; align-items: center; justify-content: center;
  background: #3a6628; color: #fff;
  font-family: var(--lsans); font-size: 11px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  border: none; border-radius: 0;  /* flat — sits at the card's flat base */
  padding: 10px 12px; cursor: pointer; width: 100%;
  transition: background 0.22s ease;
}
.ps-btn:hover:not(:disabled) { background: #4d8534; }
.ps-btn:active:not(:disabled) { background: #2d5a1b; }
.ps-btn:disabled { background: #b0a890; cursor: not-allowed; color: rgba(255,255,255,0.7); }

/* ── Loading skeletons ── */
.ps-skeletons {
  display: flex; gap: 18px;
  padding: 8px 40px 32px;
  overflow: hidden;
}
.ps-skel-card {
  width: 210px; flex-shrink: 0; border-radius: 14px;
  overflow: hidden;
  background: #f0ece4;
  animation: ps-pulse 1.5s ease-in-out infinite;
}
.ps-skel-img { height: 190px; background: #e4ddd2; }
.ps-skel-line {
  height: 11px; background: #e4ddd2;
  margin: 13px 13px 0; border-radius: 4px;
}
.ps-skel-sm { width: 55%; }
.ps-skel-btn {
  height: 34px; background: #e4ddd2;
  margin: 10px 13px 14px; border-radius: 8px;
}
@keyframes ps-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ── Empty / error state ── */
.ps-empty {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 48px 20px 32px; text-align: center;
}
.ps-empty p {
  font-family: var(--lsans); font-size: 14px;
  color: #6a5c44; margin: 0;
}
.ps-empty a {
  font-family: var(--lsans); font-size: 12px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: #3a6628; text-decoration: none;
}
.ps-empty a:hover { text-decoration: underline; }

/* Mobile */
@media (max-width: 768px) {
  .ps-card { width: 172px; }
  .ps-img-wrap { height: 140px; }
  .ps-pc { font-size: 14px; }
  .ps-head { padding: 44px 16px 28px; }
}
@media (prefers-reduced-motion: reduce) {
  .ps-track { animation: none; }
  .ps-strip-wrap { overflow-x: auto; scrollbar-width: none; }
}

/* ══════════════════════════════════════════
   LEADERSHIP BAND
══════════════════════════════════════════ */
.ab-lead-wrap {
  position: relative; z-index: 2;
  background: rgba(4,14,6,0.78);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(201,168,76,0.16);
  padding: 72px 80px 64px;
  max-width: 100%;
}
@media (max-width: 1100px) { .ab-lead-wrap { padding: 60px 48px 52px; } }
@media (max-width: 768px)  { .ab-lead-wrap { padding: 52px 24px 44px; } }

.ab-lead-hd {
  text-align: center;
  max-width: 680px; margin: 0 auto 52px;
  display: flex; flex-direction: column; gap: 14px;
}
.ab-lead-h3 {
  font-family: var(--lserif);
  font-size: clamp(26px, 3vw, 42px);
  font-weight: 500; color: #f5f0e6;
  margin: 0;
}
.ab-lead-sub {
  font-family: var(--lsans); font-size: 14px; line-height: 1.78;
  color: rgba(235,228,210,0.60); margin: 0;
}

/* 4-column leadership grid */
.ab-lead-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  border: 1px solid rgba(201,168,76,0.14);
  border-radius: 4px; overflow: hidden;
  max-width: 1200px; margin: 0 auto 52px;
}
@media (max-width: 900px) { .ab-lead-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .ab-lead-grid { grid-template-columns: 1fr; } }

.ab-person {
  padding: 28px 24px 32px;
  background: rgba(6,22,10,0.55);
  display: flex; flex-direction: column; gap: 14px;
  border-right: 1px solid rgba(201,168,76,0.10);
  transition: background 0.22s;
}
.ab-person:last-child { border-right: none; }
.ab-person:hover { background: rgba(6,30,12,0.72); }

.ab-person-top {
  display: flex; align-items: center; gap: 14px;
}
.ab-person-initials {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(201,168,76,0.22), rgba(96,140,55,0.18));
  border: 1px solid rgba(201,168,76,0.35);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--lsans); font-size: 12px; font-weight: 700;
  color: #C9A84C; letter-spacing: 0.04em; flex-shrink: 0;
}
.ab-person-name {
  font-family: var(--lsans); font-size: 13px; font-weight: 700;
  color: #f0ebe0; line-height: 1.3;
}
.ab-person-role {
  font-family: var(--lsans); font-size: 10px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: #C9A84C; margin-top: 2px;
}
.ab-person-desc {
  font-family: var(--lsans); font-size: 12.5px; line-height: 1.75;
  color: rgba(235,228,210,0.58); margin: 0;
}

/* Values closing bar */
.ab-values-bar {
  display: flex; flex-wrap: wrap; align-items: center;
  justify-content: center; gap: 10px 18px;
  border-top: 1px solid rgba(201,168,76,0.14);
  padding-top: 36px;
  font-family: var(--lsans); font-size: 11px; font-weight: 600;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(235,228,210,0.45);
}
.ab-values-bar .ab-sep-sym { opacity: 0.55; }

/* Remove gap between home page and footer */
main:has(app-home) + app-footer .site-footer { margin-top: 0 !important; }

/* ══════════════════════════════════════════
   FEATURED PRODUCT CAROUSEL
══════════════════════════════════════════ */
.fp {
  background: url('/overall-bg.png') center center / cover fixed no-repeat;
  padding: 72px 0 80px;
  position: relative;
}
/* Top gradient overlay for header legibility */
.fp::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(to bottom,
    rgba(6,28,10,0.55) 0%,
    rgba(6,28,10,0.25) 22%,
    rgba(6,28,10,0.08) 45%,
    transparent 70%);
  pointer-events: none; z-index: 0;
}

/* Section header — white text over nature bg */
.fp-head { text-align: center; padding: 0 20px 40px; position: relative; z-index: 1; }
.fp-eye {
  display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 14px;
  color: rgba(240,228,190,0.88); font-family: var(--lsans); font-size: 10px;
  font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase;
}
.fp-eye-line {
  display: inline-block; width: 36px; height: 1px;
  background: linear-gradient(to right, transparent, rgba(201,168,76,0.80));
}
.fp-eye-r { background: linear-gradient(to left, transparent, rgba(201,168,76,0.80)); }
.fp-h2 { font-family: var(--lserif); font-size: clamp(28px, 3.2vw, 52px); color: #fff; font-weight: 500; margin: 0; text-shadow: 0 2px 12px rgba(0,0,0,0.35); }
.fp-h2 em { font-style: italic; color: #d4bf7a; }

/* Skeleton */
.fp-skel { max-width: 1180px; margin: 0 auto; padding: 0 80px; position: relative; z-index: 1; }
.fp-skel-inner {
  background: rgba(255,255,255,0.95); border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.4); padding: 40px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.18);
}
.fp-skel-img {
  height: 380px; border-radius: 16px;
  background: linear-gradient(90deg, #ede8dc 25%, #e0d9c8 50%, #ede8dc 75%);
  background-size: 200% 100%; animation: fp-shimmer 1.4s infinite;
}
.fp-skel-info { display: flex; flex-direction: column; gap: 16px; padding-top: 20px; }
.fp-skel-line {
  height: 14px; border-radius: 7px;
  background: linear-gradient(90deg, #ede8dc 25%, #e0d9c8 50%, #ede8dc 75%);
  background-size: 200% 100%; animation: fp-shimmer 1.4s infinite;
}
.fp-skel-l1 { width: 55%; height: 10px; }
.fp-skel-l2 { width: 80%; height: 28px; }
.fp-skel-l3 { width: 40%; height: 16px; }
.fp-skel-l4 { width: 35%; height: 22px; }
.fp-skel-l5 { width: 60%; height: 12px; }
.fp-skel-btn {
  width: 100%; height: 52px; border-radius: 30px; margin-top: 12px;
  background: linear-gradient(90deg, #ede8dc 25%, #e0d9c8 50%, #ede8dc 75%);
  background-size: 200% 100%; animation: fp-shimmer 1.4s infinite;
}
@keyframes fp-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Message states */
.fp-msg {
  text-align: center; padding: 60px 20px;
  color: #f0e8d0; font-family: var(--lsans); font-size: 15px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  position: relative; z-index: 1;
}

/* ── Main stage ── */
.fp-stage {
  position: relative; z-index: 1;
  max-width: 1320px; margin: 0 auto; padding: 0 24px;
  display: flex; align-items: center; gap: 20px;
}

.fp-nav {
  flex-shrink: 0; width: 50px; height: 50px; border-radius: 50%;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  color: #3a6628;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.22s, box-shadow 0.22s, transform 0.22s, color 0.22s;
}
.fp-nav:hover:not(:disabled) {
  background: #3a6628; color: #fff;
  box-shadow: 0 6px 24px rgba(58,102,40,0.30); transform: scale(1.10);
}
.fp-nav:disabled { opacity: 0.28; cursor: not-allowed; }

.fp-card-wrap { flex: 1; min-width: 0; }

/* fp-floating intentionally removed — caused full-section bounce */
.fp-floating { /* no-op */ }

.fp-card {
  width: 100%;
  border-radius: 22px;
  border: 1px solid rgba(255,255,255,0.50);
  box-shadow: 0 20px 64px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.12);
  display: grid; grid-template-columns: 48% 52%; overflow: hidden;
}

/* Simple fade-only exit/enter — no translate to avoid section shift */
.fp-exit-next,
.fp-exit-prev { animation: fp-fade-out 0.28s ease forwards; }
.fp-enter-next,
.fp-enter-prev { animation: fp-fade-in  0.35s ease forwards; }
@keyframes fp-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes fp-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Image column */
.fp-img-col {
  position: relative; min-height: 540px; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  padding: 0 0 32px;
}
.fp-img-wrap {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.fp-decor { position: absolute; inset: 0; pointer-events: none; }
.fp-leaf { position: absolute; }
.fp-leaf-tl { top: 0; left: 0; }
.fp-leaf-br { bottom: 0; right: 0; }
.fp-img {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center; display: block;
  animation: fp-img-float 4s ease-in-out infinite;
}
@keyframes fp-img-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}
.fp-dots {
  position: relative; z-index: 2;
  display: flex; gap: 6px; justify-content: center;
}
.fp-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,0.45);
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  transition: background 0.22s, transform 0.22s;
}
.fp-dot.fp-dot-a { background: #fff; transform: scale(1.4); }

/* Info column — white panel */
.fp-info-col {
  background: rgba(255,255,255,0.97);
  padding: 40px 44px 40px 38px;
  display: flex; flex-direction: column; gap: 15px; justify-content: center;
  overflow: visible;
}

/* View Product link */
.fp-view-btn {
  display: none;
}

/* Badges */
.fp-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.fp-badge {
  font-family: var(--lsans); font-size: 10px; font-weight: 700;
  letter-spacing: 0.09em; text-transform: uppercase;
  padding: 5px 13px; border-radius: 20px; border: 1px solid currentColor;
}
.fp-badge-ay { color: #7a5c2e; background: rgba(201,168,76,0.10); border-color: rgba(201,168,76,0.36); }
.fp-badge-in {
  color: #fff; background: #3a6628; border-color: #3a6628;
  font-weight: 700;
}
.fp-badge-out { color: #b34040; background: rgba(179,64,64,0.07); border-color: rgba(179,64,64,0.28); }
.fp-badge-bs { color: #1a5c9e; background: rgba(26,92,158,0.07); border-color: rgba(26,92,158,0.24); }

/* Name — clamp to 2 lines then ellipsis so card height stays fixed */
.fp-name {
  font-family: var(--lserif); font-size: clamp(20px, 2.2vw, 34px);
  color: #1a1208; font-weight: 600; line-height: 1.20; margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Rating */
.fp-rating { display: flex; align-items: center; gap: 7px; font-family: var(--lsans); flex-wrap: wrap; }
.fp-stars { display: flex; gap: 1px; }
.fp-star { color: #F5A623; font-size: 15px; }
.fp-star.fp-star-e { color: #ddd; }
.fp-rating-num { font-size: 13px; font-weight: 700; color: #3a3020; }
.fp-rv-sep { color: #ccc; font-size: 13px; }
.fp-rv-ct { font-size: 12px; color: #3a6628; font-weight: 500; }

/* Price */
.fp-price-block { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; }
.fp-price { font-family: var(--lserif); font-size: clamp(28px, 2.8vw, 44px); font-weight: 700; color: #1a1208; }
.fp-mrp { font-family: var(--lsans); font-size: 13px; color: #999; text-decoration: line-through; }
.fp-save {
  font-family: var(--lsans); font-size: 12px; font-weight: 600;
  color: #2d7a3a; background: rgba(58,102,40,0.09);
  border: 1px solid rgba(58,102,40,0.18);
  padding: 3px 9px; border-radius: 20px;
}
.fp-tax-note { font-family: var(--lsans); font-size: 11px; color: #aaa; margin-top: -8px; }

/* Divider */
.fp-divider { width: 100%; height: 1px; background: #f0ebe0; }

/* Meta chips — horizontal inline */
.fp-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.fp-meta-chip {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(245,240,228,0.85);
  border: 1px solid rgba(201,168,76,0.22);
  border-radius: 20px; padding: 5px 12px;
  font-family: var(--lsans); font-size: 12px; color: #3a3020; font-weight: 500;
}

/* Quantity */
.fp-qty-row { display: flex; align-items: center; gap: 16px; font-family: var(--lsans); font-size: 13px; color: #7a6040; font-weight: 500; }
.fp-qty {
  display: flex; align-items: center;
  border: 1.5px solid #e0d8c8; border-radius: 40px; overflow: hidden;
}
.fp-qty-btn {
  width: 38px; height: 38px; background: transparent; border: none;
  font-size: 20px; color: #3a6628; cursor: pointer; font-weight: 300;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.fp-qty-btn:hover:not(:disabled) { background: rgba(58,102,40,0.07); }
.fp-qty-btn:disabled { color: #ccc; cursor: not-allowed; }
.fp-qty-num {
  min-width: 42px; text-align: center;
  font-family: var(--lsans); font-size: 15px; font-weight: 600; color: #1a1208;
  border-left: 1.5px solid #e0d8c8; border-right: 1.5px solid #e0d8c8;
  padding: 0 4px; line-height: 38px;
}

/* Add to Cart — pure CSS paint stroke */
.fp-atc {
  position: relative;
  width: 100%; height: 54px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  background: #1c4514; border: none;
  border-radius: 4px 18px 5px 14px;
  clip-path: polygon(
    0% 25%, 4% 13%, 12% 16%, 20% 9%, 31% 14%, 42% 8%,
    55% 13%, 67% 7%, 79% 12%, 91% 8%, 100% 20%,
    97% 35%, 100% 52%, 96% 66%, 99% 82%, 90% 90%,
    77% 86%, 64% 94%, 52% 88%, 39% 95%, 27% 89%,
    15% 93%, 5% 84%, 2% 70%, 4% 55%, 0% 42%
  );
  color: #f0ead8;
  font-family: var(--lsans); font-size: 13px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  cursor: pointer;
  filter: drop-shadow(0 6px 20px rgba(28,69,20,0.45));
  transition: transform 0.18s ease, filter 0.18s ease;
  overflow: visible;
}
.fp-atc::before {
  content: '';
  position: absolute; inset: 0;
  background: rgba(255,255,255,0.06);
  clip-path: polygon(
    5% 30%, 15% 20%, 28% 26%, 40% 18%, 52% 24%, 65% 16%,
    78% 22%, 92% 18%, 98% 32%, 95% 48%, 97% 65%, 88% 78%,
    72% 82%, 55% 90%, 38% 84%, 22% 88%, 8% 78%, 3% 62%, 6% 46%
  );
  pointer-events: none;
}
.fp-atc:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.015);
  filter: drop-shadow(0 10px 28px rgba(28,69,20,0.55)) brightness(1.08);
}
.fp-atc:active:not(:disabled) {
  transform: translateY(1px) scale(0.985);
}
.fp-atc:disabled {
  cursor: not-allowed;
  transform: none;
}
/* Loading state — keep it green, just slightly muted */
.fp-atc:disabled:not(.fp-atc-oos) {
  opacity: 0.75;
  filter: drop-shadow(0 4px 12px rgba(28,69,20,0.30));
}
/* Out of Stock — visually muted */
.fp-atc.fp-atc-oos {
  background: #6b6b6b;
  filter: none;
  opacity: 0.65;
  clip-path: none;
  border-radius: 4px;
}

/* Trust — circular icons */
.fp-trust {
  display: flex; gap: 4px; justify-content: space-between;
  padding-top: 12px; border-top: 1px solid #f0ebe0;
}
.fp-tr { display: flex; flex-direction: column; align-items: center; gap: 7px; flex: 1; }
.fp-tr-icon {
  width: 50px; height: 50px; border-radius: 50%;
  border: 1.5px solid rgba(58,102,40,0.20);
  background: rgba(58,102,40,0.05);
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s, border-color 0.2s;
}
.fp-tr:hover .fp-tr-icon { background: rgba(58,102,40,0.10); border-color: rgba(58,102,40,0.35); }
.fp-tr span { font-family: var(--lsans); font-size: 10.5px; color: #5a6a50; font-weight: 600; text-align: center; line-height: 1.3; }

/* SKU */
.fp-sku { font-family: var(--lsans); font-size: 11px; color: #b0a080; text-align: center; padding-top: 2px; }
.fp-sku span { font-weight: 600; color: #8a7a60; }

/* ── FP scroll-reveal ── */
.fp-head {
  opacity: 0; transform: translateY(22px);
  transition: opacity 0.65s ease, transform 0.65s cubic-bezier(0.22,1,0.36,1);
}
.fp.fp-in .fp-head {
  opacity: 1; transform: translateY(0);
}

.fp-nav-l {
  opacity: 0; transform: translateX(-28px);
  transition: opacity 0.6s 0.18s ease, transform 0.6s 0.18s cubic-bezier(0.22,1,0.36,1);
}
.fp.fp-in .fp-nav-l { opacity: 1; transform: translateX(0); }

.fp-nav-r {
  opacity: 0; transform: translateX(28px);
  transition: opacity 0.6s 0.18s ease, transform 0.6s 0.18s cubic-bezier(0.22,1,0.36,1);
}
.fp.fp-in .fp-nav-r { opacity: 1; transform: translateX(0); }

.fp-card-wrap {
  opacity: 0; transform: translateY(28px) scale(0.98);
  transition: opacity 0.75s 0.10s ease, transform 0.75s 0.10s cubic-bezier(0.22,1,0.36,1);
}
.fp.fp-in .fp-card-wrap { opacity: 1; transform: translateY(0) scale(1); }

/* ── FPC scroll-reveal ── */
.fpc-strip {
  opacity: 0; transform: translateX(-24px);
  transition: opacity 0.65s 0.12s ease, transform 0.65s 0.12s cubic-bezier(0.22,1,0.36,1);
}
.fpc.fpc-in .fpc-strip { opacity: 1; transform: translateX(0); }

.fpc-wall {
  opacity: 0; transform: translateX(20px);
  transition: opacity 0.70s 0.20s ease, transform 0.70s 0.20s cubic-bezier(0.22,1,0.36,1);
}
.fpc.fpc-in .fpc-wall { opacity: 1; transform: translateX(0); }

/* FP Responsive */
@media (max-width: 1100px) {
  .fp-stage { padding: 0 16px; gap: 16px; }
  .fp-nav { width: 44px; height: 44px; }
  .fp-info-col { padding: 28px 28px 28px 24px; }
}
@media (max-width: 1024px) and (min-width: 768px) {
  .fp-img-col { min-height: 380px; }
  .fp-info-col { padding: 24px 20px 28px 18px; gap: 12px; }
  .fp-stage { padding: 0 10px; gap: 10px; }
  .fp-nav { width: 40px; height: 40px; }
  .fp-skel { padding: 0 48px; }
}
@media (max-width: 767px) {
  .fp { padding: 48px 0 56px; background-attachment: scroll; }
  .fp-stage { flex-direction: column; padding: 0 14px; gap: 0; }
  .fp-card { grid-template-columns: 1fr; border-radius: 16px; }
  .fp-nav { display: none; }
  .fp-img-col { min-height: 240px; }
  .fp-info-col { max-height: none; padding: 20px 18px 26px; gap: 11px; }
  .fp-trust { flex-wrap: wrap; gap: 12px 0; }
  .fp-tr { min-width: 50%; }
  .fp-atc { font-size: 12px; letter-spacing: 0.10em; }
  .fp-price { font-size: 26px; }
  .fp-skel { padding: 0 14px; }
  .fp-skel-inner { grid-template-columns: 1fr; }
  .fp-skel-img { height: 220px; }
}
@media (max-width: 480px) {
  .fp { padding: 40px 0 48px; }
  .fp-stage { padding: 0 10px; }
  .fp-img-col { min-height: 210px; }
  .fp-info-col { padding: 18px 14px 22px; gap: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .fp-skel-img, .fp-skel-line, .fp-skel-btn { animation: none; }
  .fp-img { animation: none; }
  .fp-floating { animation: none; }
  .fp-exit-next, .fp-exit-prev { animation: fp-rm-fade-out 0.3s ease forwards; }
  .fp-enter-next, .fp-enter-prev { animation: fp-rm-fade-in 0.3s ease forwards; }
  @keyframes fp-rm-fade-out { to { opacity: 0; } }
  @keyframes fp-rm-fade-in  { from { opacity: 0; } to { opacity: 1; } }
}

/* ═══════════════════════════════════════════
   PRODUCT COLLECTION CAROUSEL (fpc)
═══════════════════════════════════════════ */
.fpc {
  background: #fff;
  position: relative;
}

/* Full-bleed row: strip 20% + wall 80% */
.fpc-full {
  display: flex;
  width: 100%;
  height: 380px;
  padding: 0 32px;
  gap: 0;
}

/* ── 20% LEFT STRIP ── */
.fpc-strip {
  flex: 0 0 20%;
  position: relative;
  overflow: hidden;
  background: #f5f5f5;
  border-right: 1px solid rgba(255,255,255,0.06);
}

.fpc-strip-slide {
  position: absolute; inset: 0;
}
.fpc-strip-img {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  display: block;
}

/* slide transitions on strip */
.fpc-exit-next { animation: fpc-exit-next 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.fpc-exit-prev { animation: fpc-exit-prev 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
@keyframes fpc-exit-next { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-18px); } }
@keyframes fpc-exit-prev { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(18px); } }
.fpc-enter-next { animation: fpc-enter-next 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.fpc-enter-prev { animation: fpc-enter-prev 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
@keyframes fpc-enter-next { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes fpc-enter-prev { from { opacity:0; transform:translateY(-18px); } to { opacity:1; transform:translateY(0); } }

.fpc-strip-ov {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.55) 55%, transparent 100%);
  padding: 14px 10px 42px;
  display: flex; flex-direction: column; gap: 5px;
}
.fpc-strip-tag {
  font-family: var(--lsans); font-size: 8px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  background: #c9a84c; color: #fff;
  padding: 3px 7px; align-self: flex-start;
}
.fpc-strip-name {
  font-family: var(--lserif); font-size: clamp(11px, 1.1vw, 14px); font-weight: 600;
  color: #f0ead8; line-height: 1.25;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.fpc-strip-price {
  font-family: var(--lsans); font-size: clamp(12px, 1vw, 15px); font-weight: 800;
  color: #c9a84c;
}
.fpc-strip-add {
  width: 100%; padding: 7px 6px;
  background: #1c4514; border: none; border-radius: 0;
  color: #f0ead8; font-family: var(--lsans); font-size: 9px;
  font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase;
  cursor: pointer; transition: background 0.2s;
}
.fpc-strip-add:hover:not(:disabled) { background: #2a6420; }
.fpc-strip-add:disabled { opacity: 0.5; cursor: not-allowed; }

/* progress dots on strip */
.fpc-strip-dots {
  position: absolute; bottom: 12px; left: 0; right: 0;
  display: flex; justify-content: center; gap: 4px; z-index: 3;
}
.fpc-strip-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: rgba(255,255,255,0.35);
  transition: background 0.2s, transform 0.2s;
}
.fpc-strip-dot.fpc-strip-dot-a { background: #c9a84c; transform: scale(1.5); }

/* ── 87% RIGHT WALL ── */

.fpc-wall {
  flex: 1;
  position: relative;
  background: transparent;
  overflow: hidden;
  display: flex;
  align-items: center;
}
/* Edge fade masks */
.fpc-wall-fade {
  position: absolute; top: 0; bottom: 0; width: 60px; z-index: 2; pointer-events: none;
}
.fpc-wall-fade-l { left: 0; background: linear-gradient(to right, rgba(255,255,255,0.95), transparent); }
.fpc-wall-fade-r { right: 0; background: linear-gradient(to left, rgba(255,255,255,0.95), transparent); }

.fpc-marquee-outer { overflow: hidden; width: 100%; }

.fpc-marquee {
  display: flex;
  gap: 14px;
  width: max-content;
  animation: fpc-scroll 28s linear infinite;
  will-change: transform;
}
.fpc-marquee.fpc-marquee-paused { animation-play-state: paused; }

@keyframes fpc-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* Product card — sharp corners, wall-mounted look */
.fpc-pc {
  flex: 0 0 220px;
  background: #fff;
  border-radius: 0;
  overflow: hidden;
  border: none;
  border-left: 3px solid transparent;
  box-shadow: 0 4px 18px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.07);
  cursor: pointer;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  transform: translateY(0);
}
.fpc-pc.fpc-pc-active {
  border-left-color: #c9a84c;
  box-shadow: 0 6px 24px rgba(0,0,0,0.13), 0 2px 8px rgba(201,168,76,0.18);
  transform: translateY(-4px);
}
.fpc-pc:hover:not(.fpc-pc-active) {
  border-left-color: rgba(201,168,76,0.45);
  box-shadow: 0 6px 22px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.fpc-pc-img {
  position: relative; height: 180px; overflow: hidden;
}
.fpc-pc-photo {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  transition: transform 0.5s ease;
}
.fpc-pc:hover .fpc-pc-photo { transform: scale(1.06); }
.fpc-pc-bs {
  position: absolute; top: 0; left: 0;
  font-family: var(--lsans); font-size: 9px; font-weight: 700;
  letter-spacing: 0.07em; text-transform: uppercase;
  background: #c9a84c; color: #fff;
  padding: 4px 9px;
}
.fpc-pc-hover-cta {
  position: absolute; inset: 0;
  background: rgba(28,69,20,0.42);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--lsans); font-size: 11px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: #fff;
  opacity: 0; transition: opacity 0.25s ease;
}
.fpc-pc:hover .fpc-pc-hover-cta { opacity: 1; }

.fpc-pc-body {
  padding: 12px 14px 14px;
  display: flex; flex-direction: column; gap: 5px;
  background: #fff;
}
.fpc-pc-name {
  font-family: var(--lserif); font-size: 14px; font-weight: 600;
  color: #1a1208; line-height: 1.28;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.fpc-pc-stars { color: #F5A623; font-size: 10px; letter-spacing: 1px; }
.fpc-pc-se { color: #d8d0c0; }
.fpc-pc-price {
  font-family: var(--lsans); font-size: 15px; font-weight: 800; color: #1a1208;
  display: flex; align-items: baseline; gap: 5px;
}
.fpc-pc-mrp { font-size: 11px; font-weight: 400; color: #a89870; }
.fpc-pc-add {
  margin-top: 3px; width: 100%; padding: 8px 10px;
  background: #1c4514; border: none; border-radius: 0;
  color: #f0ead8; font-family: var(--lsans); font-size: 10px;
  font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  cursor: pointer; transition: background 0.2s;
}
.fpc-pc-add:hover:not(:disabled) { background: #2a6420; }
.fpc-pc-add:disabled { opacity: 0.5; cursor: not-allowed; }

/* fpc Responsive */
@media (max-width: 1024px) and (min-width: 768px) {
  .fpc-full { height: 300px; padding: 0 20px; }
  .fpc-strip { flex: 0 0 22%; }
  .fpc-pc { flex: 0 0 175px; }
  .fpc-pc-img { height: 138px; }
  .fpc-pc-body { padding: 10px 12px 12px; gap: 4px; }
}
@media (max-width: 767px) {
  /* Stack vertically: strip on top (full-width hero), marquee below */
  .fpc-full {
    flex-direction: column;
    height: auto;
    padding: 0;
    gap: 0;
  }
  .fpc-strip {
    flex: 0 0 auto;
    width: 100%;
    height: 220px;
    border-right: none;
  }
  .fpc-strip-ov { padding: 12px 14px 16px; }
  .fpc-strip-name { font-size: clamp(13px, 3.5vw, 16px); }
  .fpc-strip-price { font-size: clamp(13px, 3vw, 16px); }
  .fpc-strip-add { padding: 10px 14px; font-size: 10px; }
  .fpc-strip-dots { bottom: 8px; }
  .fpc-wall {
    height: 210px;
    border-top: 1px solid rgba(0,0,0,0.06);
  }
  .fpc-wall-fade { display: none; }
  .fpc-pc { flex: 0 0 148px; }
  .fpc-pc-img { height: 110px; }
  .fpc-pc-body { padding: 8px 10px 10px; gap: 3px; }
  .fpc-pc-name { font-size: 12px; }
  .fpc-pc-price { font-size: 13px; }
  .fpc-pc-add { padding: 6px 8px; font-size: 9px; }
}
@media (max-width: 480px) {
  .fpc-strip { height: 200px; }
  .fpc-wall { height: 195px; }
  .fpc-pc { flex: 0 0 132px; }
  .fpc-pc-img { height: 100px; }
}
@media (prefers-reduced-motion: reduce) {
  .fpc-marquee { animation: none; }
  .fpc-exit-next, .fpc-exit-prev { animation: fpc-rm-out 0.3s ease forwards; }
  .fpc-enter-next, .fpc-enter-prev { animation: fpc-rm-in 0.3s ease forwards; }
  @keyframes fpc-rm-out { to { opacity: 0; } }
  @keyframes fpc-rm-in  { from { opacity: 0; } to { opacity: 1; } }
}

/* ═══════════════════════════════════════════
   WHY CHOOSE US  — premium
═══════════════════════════════════════════ */
.wcu {
  position: relative;
  z-index: 3;
  min-height: 560px;
  background: url('/assets/images/choose.png') left center / cover no-repeat;
  display: flex;
  align-items: center;
  overflow: visible;
}

/* Floating gold dots — left botanical zone */
.wcu-dot {
  position: absolute;
  border-radius: 50%;
  background: #B99A52;
  pointer-events: none;
  z-index: 0;
}
.wcu-dot-1 { width: 5px; height: 5px; top: 18%; left: 36%; opacity: 0.22; }
.wcu-dot-2 { width: 3px; height: 3px; top: 62%; left: 42%; opacity: 0.16; }
.wcu-dot-3 { width: 4px; height: 4px; top: 80%; left: 30%; opacity: 0.18; }

/* Right content glass panel */
.wcu-content {
  position: relative;
  z-index: 1;
  margin-left: auto;
  width: 58%;
  padding: 56px 60px 56px 52px;
  background: rgba(247,241,227,0.82);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 24px 0 0 24px;
  border-left: 1px solid rgba(185,154,82,0.35);
  border-top: 1px solid rgba(185,154,82,0.25);
  border-bottom: 1px solid rgba(185,154,82,0.25);
}

/* Corner botanical curves */
.wcu-deco {
  position: absolute;
  pointer-events: none;
}
.wcu-deco-tl { top: 12px; left: 14px; }
.wcu-deco-br { bottom: 12px; right: 14px; }

/* ── Heading ── */
.wcu-lotus {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 10px;
}
.wcu-eye {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--lsans);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #B99A52;
  margin-bottom: 14px;
}
.wcu-eye-line {
  display: inline-block;
  width: 28px; height: 1px;
  background: linear-gradient(to right, #B99A52, rgba(185,154,82,0.2));
  flex-shrink: 0;
}
.wcu-h2 {
  font-family: var(--lserif);
  font-size: clamp(24px, 2.5vw, 40px);
  font-weight: 600;
  color: #071f17;
  line-height: 1.22;
  margin: 0 0 18px;
  letter-spacing: -0.01em;
}
.wcu-h2 em {
  font-style: italic;
  color: #0d4a2e;
}

/* Gold ornamental rule with leaf centre */
.wcu-ornament {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.wcu-orn-line {
  flex: 0 0 36px;
  height: 1px;
  background: linear-gradient(to right, rgba(185,154,82,0.12), #B99A52);
}
.wcu-orn-line:last-child {
  background: linear-gradient(to left, rgba(185,154,82,0.12), #B99A52);
}
.wcu-intro {
  font-family: var(--lsans);
  font-size: 13px;
  color: #1e3328;
  line-height: 1.7;
  margin: 0 0 34px;
  max-width: 400px;
  font-weight: 500;
}

/* ── Feature grid ── */
.wcu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
  position: relative;
}

/* Horizontal divider between rows (pseudo-element trick via row-sep) */
.wcu-row-sep {
  grid-column: 1 / -1;
  display: none;
}

/* Vertical column dividers */
.wcu-item:nth-child(3n+3),
.wcu-item:nth-child(3n+4) {
  border-left: 1px solid rgba(185,154,82,0.20);
}

/* Row 1 items get bottom border */
.wcu-item:nth-child(-n+3) {
  border-bottom: 1px solid rgba(185,154,82,0.14);
  padding-bottom: 22px;
}

.wcu-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 18px 18px 18px 0;
  cursor: default;
  transition: transform 0.28s cubic-bezier(0.22,1,0.36,1);
}
.wcu-item:nth-child(3n+3),
.wcu-item:nth-child(3n+4) {
  padding-left: 18px;
}
.wcu-item:nth-child(n+4) {
  padding-top: 22px;
}
.wcu-item:hover { transform: translateY(-2px); }

/* Icon wrapper with side leaf ornaments */
.wcu-icon-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.wcu-icon-leaf {
  display: block;
  width: 14px; height: 6px;
  position: relative;
  flex-shrink: 0;
}
.wcu-icon-leaf::before {
  content: '';
  position: absolute;
  top: 50%; left: 0;
  width: 100%; height: 1px;
  background: rgba(185,154,82,0.35);
  transform: translateY(-50%);
}
.wcu-icon-leaf::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 5px; height: 5px;
  border-radius: 50% 0 50% 0;
  border: 1px solid rgba(185,154,82,0.28);
  transform: translate(-50%,-50%) rotate(45deg);
}
.wcu-icon-leaf-r::before { left: auto; right: 0; }

/* Circular icon — double ring, rich gold fill */
.wcu-icon {
  width: 48px; height: 48px;
  border-radius: 50%;
  border: 1.5px solid #B99A52;
  outline: 3px solid rgba(185,154,82,0.25);
  background: linear-gradient(135deg, #f7f1e3 0%, #e8d99a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(185,154,82,0.22);
  transition: border-color 0.28s, outline-color 0.28s, transform 0.28s cubic-bezier(0.22,1,0.36,1), background 0.28s, box-shadow 0.28s;
}
.wcu-icon svg { color: #7a5c1a; }
.wcu-item:hover .wcu-icon {
  transform: scale(1.08);
  border-color: #c9a84c;
  outline-color: rgba(185,154,82,0.40);
  background: linear-gradient(135deg, #f0e6c0 0%, #d4b96a 100%);
  box-shadow: 0 4px 14px rgba(185,154,82,0.38);
}
.wcu-item:hover .wcu-icon svg { color: #5c4010; }

.wcu-item-text { display: flex; flex-direction: column; gap: 4px; }
.wcu-item-h {
  font-family: var(--lsans);
  font-size: 12.5px;
  font-weight: 700;
  color: #071f17;
  line-height: 1.3;
  letter-spacing: 0.01em;
}
.wcu-item-p {
  font-family: var(--lsans);
  font-size: 11.5px;
  color: #2a3e30;
  line-height: 1.6;
  margin: 0;
}

/* ── Responsive ── */
@media (max-width: 1200px) {
  .wcu-content { width: 62%; padding: 48px 44px 48px 40px; }
}
@media (max-width: 1024px) and (min-width: 768px) {
  .wcu { min-height: 480px; background-position: 20% center; }
  .wcu-content { width: 76%; padding: 40px 32px 40px 28px; }
  .wcu-h2 { font-size: clamp(26px, 3.5vw, 36px); margin-bottom: 14px; }
  .wcu-intro { font-size: 14px; }
  .wcu-dot { display: none; }
}
@media (max-width: 767px) {
  .wcu {
    min-height: unset;
    background-attachment: scroll;
    background-position: 25% center;
    align-items: flex-start;
  }
  .wcu-content {
    width: 100%;
    margin-left: 0;
    border-radius: 0;
    border-left: none;
    border-top: none;
    border-bottom: none;
    background: rgba(247,241,227,0.96);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    padding: 44px 20px 40px;
  }
  .wcu-h2 { font-size: clamp(26px, 7vw, 36px); margin-bottom: 14px; }
  .wcu-intro { font-size: 14px; }
  .wcu-grid { grid-template-columns: 1fr 1fr; gap: 0; }
  .wcu-item:nth-child(3n+3),
  .wcu-item:nth-child(3n+4) { border-left: none; padding-left: 0; }
  .wcu-item:nth-child(2n+2) { border-left: 1px solid rgba(185,154,82,0.20); padding-left: 14px; }
  .wcu-item:nth-child(-n+3) { border-bottom: none; padding-bottom: 0; }
  .wcu-item:nth-child(-n+4) { border-bottom: 1px solid rgba(185,154,82,0.14); padding-bottom: 16px; }
  .wcu-item-h { font-size: 13px; }
  .wcu-item-p { font-size: 12px; }
  .wcu-dot { display: none; }
  .wcu-deco { display: none; }
}
@media (max-width: 480px) {
  .wcu-content { padding: 40px 16px 36px; }
  .wcu-grid { grid-template-columns: 1fr; }
  .wcu-item:nth-child(2n+2) { border-left: none; padding-left: 0; }
  .wcu-item:nth-child(-n+4) { border-bottom: none; padding-bottom: 0; }
  .wcu-item { padding: 14px 0; border-bottom: 1px solid rgba(185,154,82,0.14); }
  .wcu-item:last-child { border-bottom: none; }
}

/* ═══════════════════════════════════════════
   TESTIMONIALS
═══════════════════════════════════════════ */
.tst {
  position: relative;
  z-index: 1;
  background: #f5efe4;
  overflow: hidden;
  padding: 80px 0 64px;
}

/* Mandala bg */
.tst-mandala {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  width: 520px; height: 520px;
  pointer-events: none;
  z-index: 0;
}

/* Floating gold dots */
.tst-dot {
  position: absolute;
  border-radius: 50%;
  background: #B99A52;
  pointer-events: none;
  z-index: 0;
}
.tst-dot-1 { width: 4px; height: 4px; top: 12%; left: 8%;  opacity: 0.20; }
.tst-dot-2 { width: 3px; height: 3px; top: 70%; left: 4%;  opacity: 0.14; }
.tst-dot-3 { width: 5px; height: 5px; top: 20%; right: 7%; opacity: 0.18; }
.tst-dot-4 { width: 3px; height: 3px; top: 75%; right: 10%;opacity: 0.13; }

/* Botanical corner lines */
.tst-bot {
  position: absolute;
  pointer-events: none;
  z-index: 0;
}
.tst-bot-tl { top: 0;    left: 0; }
.tst-bot-tr { top: 0;    right: 0; transform: scaleX(-1); }
.tst-bot-bl { bottom: 0; left: 0;  transform: scaleY(-1); }
.tst-bot-br { bottom: 0; right: 0; transform: scale(-1,-1); }

.tst-inner {
  position: relative;
  z-index: 1;
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 40px;
}

/* ── Section heading ── */
.tst-head {
  text-align: center;
  margin-bottom: 52px;
}
.tst-lotus {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.tst-eye {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-family: var(--lsans);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #B99A52;
  margin-bottom: 16px;
}
.tst-eye-line {
  display: inline-block;
  width: 36px; height: 1px;
  background: linear-gradient(to right, rgba(185,154,82,0.15), #B99A52);
  flex-shrink: 0;
}
.tst-eye-line:last-child {
  background: linear-gradient(to left, rgba(185,154,82,0.15), #B99A52);
}
.tst-h2 {
  font-family: var(--lserif);
  font-size: clamp(26px, 3vw, 46px);
  font-weight: 500;
  color: #071f17;
  line-height: 1.20;
  margin: 0 0 20px;
}
.tst-h2 em { font-style: italic; color: #2d6b4a; }
.tst-orn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}
.tst-orn-l, .tst-orn-r {
  display: inline-block;
  width: 52px; height: 1px;
}
.tst-orn-l { background: linear-gradient(to right, transparent, #B99A52); }
.tst-orn-r { background: linear-gradient(to left,  transparent, #B99A52); }
.tst-sub {
  font-family: var(--lsans);
  font-size: 13px;
  color: #3a5242;
  line-height: 1.7;
  max-width: 480px;
  margin: 0 auto;
}

/* ── Carousel stage ── */
.tst-stage {
  overflow: hidden;
  margin: 0 -8px;
}
.tst-track {
  display: flex;
  transition: transform 0.55s cubic-bezier(0.22,1,0.36,1);
  will-change: transform;
}

/* ── Cards ── */
/* ══ TESTIMONIAL CARD — Botanical Art Card ══ */
.tst-card {
  position: relative;
  flex: 0 0 calc(33.333% - 16px);
  margin: 0 8px 16px;
  /* testimonial.png is the entire card surface */
  background-image: url('/assets/images/testimonial.png');
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  background-color: transparent;
  /* Let card height be driven by content inside the image proportions */
  padding: 52px 44px 48px;
  border-radius: 0;
  border: none;
  overflow: visible;
  box-shadow:
    0 6px 28px rgba(28,69,20,0.10),
    0 2px 8px rgba(185,154,82,0.08);
  transition: transform 0.38s cubic-bezier(0.22,1,0.36,1),
              box-shadow 0.38s ease;
}
.tst-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 16px 44px rgba(28,69,20,0.15),
    0 4px 12px rgba(185,154,82,0.12);
}
.tst-card-center { /* no extra border — image IS the border */ }

/* Stars */
.tst-stars {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  justify-content: center;
}

/* Message */
.tst-msg {
  font-family: var(--lserif);
  font-size: 14.5px;
  line-height: 1.75;
  color: #1a3025;
  margin: 0 0 20px;
  font-style: italic;
  text-align: center;
  /* keep text inside the painted card's blank area */
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Divider rule */
.tst-author {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(185,154,82,0.30);
}
.tst-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 1.5px solid rgba(185,154,82,0.50);
}
.tst-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tst-avatar-init {
  background: linear-gradient(135deg, #e8d99a 0%, #c9a84c 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--lserif);
  font-size: 17px; font-weight: 600;
  color: #fff;
}
.tst-author-text { display: flex; flex-direction: column; gap: 2px; }
.tst-name {
  font-family: var(--lsans);
  font-size: 12.5px; font-weight: 700;
  color: #173f32;
}
.tst-loc {
  font-family: var(--lsans);
  font-size: 11px;
  color: #5a7a62;
}

/* ── Navigation ── */
.tst-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 36px;
}
.tst-arr {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: #fdf8f0;
  border: 1.5px solid rgba(185,154,82,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0d4a2e;
  cursor: pointer;
  transition: background 0.22s, border-color 0.22s, transform 0.22s;
  flex-shrink: 0;
}
.tst-arr:hover {
  background: #071f17;
  border-color: #071f17;
  color: #f0ead8;
  transform: scale(1.06);
}
.tst-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}
.tst-dot-btn {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: rgba(185,154,82,0.30);
  border: none;
  cursor: pointer;
  transition: background 0.22s, transform 0.22s;
  padding: 0;
}
.tst-dot-btn.tst-dot-active {
  background: #B99A52;
  transform: scale(1.3);
}

/* ── Skeleton ── */
.tst-loading { padding: 0 8px; }
.tst-skel-track { display: flex; gap: 16px; }
.tst-skel-card {
  flex: 1;
  background: rgba(185,154,82,0.07);
  border-radius: 20px;
  padding: 36px 32px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tst-skel-line {
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(185,154,82,0.10) 25%, rgba(185,154,82,0.18) 50%, rgba(185,154,82,0.10) 75%);
  background-size: 200% 100%;
  animation: tst-shimmer 1.6s infinite;
}
@keyframes tst-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.tst-sl-1 { height: 10px; width: 60%; }
.tst-sl-2 { height: 10px; width: 90%; }
.tst-sl-3 { height: 10px; width: 80%; }
.tst-sl-4 { height: 10px; width: 40%; margin-top: 20px; }

/* ── Empty / error ── */
.tst-empty {
  text-align: center;
  padding: 40px 0;
  font-family: var(--lsans);
  font-size: 13px;
  color: #5a7a62;
}

/* ── Bottom trust line ── */
.tst-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 40px;
  opacity: 0.55;
}
.tst-trust-stars { display: flex; gap: 3px; }
.tst-trust-txt {
  font-family: var(--lsans);
  font-size: 11px;
  color: #2e4a38;
  letter-spacing: 0.04em;
}

/* ── Responsive ── */
@media (max-width: 1024px) and (min-width: 768px) {
  .tst { padding: 64px 0 52px; }
  .tst-inner { padding: 0 28px; }
  .tst-card { flex: 0 0 calc(50% - 12px); padding: 40px 30px 36px; }
  .tst-h2 { font-size: clamp(28px, 4vw, 38px); }
}
@media (max-width: 767px) {
  .tst { padding: 56px 0 48px; }
  .tst-inner { padding: 0 16px; }
  /* card fills the track exactly — no margin gap that causes adjacent-card bleed */
  .tst-stage { margin: 0; }
  .tst-card { flex: 0 0 100%; margin: 0 0 16px; padding: 36px 24px 32px; }
  .tst-h2 { font-size: clamp(26px, 7vw, 34px); }
  .tst-sub { font-size: 14px; }
  .tst-bot-bl, .tst-bot-br { display: none; }
  .tst-msg { font-size: 13.5px; -webkit-line-clamp: 6; }
  .tst-trust-txt { font-size: 10px; text-align: center; }
  .tst-skel-track { flex-direction: column; }
  .tst-skel-card:not(:first-child) { display: none; }
}
@media (max-width: 480px) {
  .tst-inner { padding: 0 12px; }
  .tst-card { padding: 32px 18px 28px; }
  .tst-dot { display: none; }
}

/* ═══════════════════════════════════════════
   BOTANICAL SECTION DIVIDER
   Lives INSIDE .wcu (position:absolute inside it).
   Anchored to bottom-right corner of WCU —
   never overlaps cards/content above it.
   Branch runs left along bottom edge;
   cluster drapes into TST below.
═══════════════════════════════════════════ */
.bot-div {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 4;
  pointer-events: none;
  overflow: visible;
  /* no width/height — sized by the img */
}
.bot-div-img {
  display: block;
  width: 620px;
  max-width: 54vw;
  height: auto;
  /* translateY(100%) = top edge of image lands exactly at WCU bottom boundary.
     Slight negative pulls the very tip of the branch to sit on the boundary line. */
  transform: translateY(88%);
  filter: drop-shadow(0 4px 16px rgba(45,107,74,0.12));
}
@media (max-width: 1024px) {
  .bot-div-img { width: 440px; max-width: 58vw; transform: translateY(88%); }
}
@media (max-width: 768px) {
  .bot-div-img { width: 300px; max-width: 62vw; transform: translateY(88%); }
}
@media (max-width: 480px) {
  .bot-div-img { width: 150px; max-width: 48vw; transform: translateY(85%); }
}

/* ═══════════════════════════════════════════
   PROMOTION BANNER
═══════════════════════════════════════════ */
.promo-banner {
  width: 100%;
  line-height: 0;
  overflow: hidden;
}
.promo-banner-img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

/* ═══════════════════════════════════════════
   FAQ SECTION  — full-bleed feature.png bg
═══════════════════════════════════════════ */
.faq {
  position: relative;
  overflow: hidden;
  padding: 96px 0 80px;
}

/* Full-bleed background image — attachment:fixed prevents rescale on accordion open */
.faq-bg {
  position: absolute;
  inset: 0;
  background: url('/assets/images/feature.png') center / cover fixed no-repeat;
  z-index: 0;
  pointer-events: none;
}
/* Cream overlay — semi-transparent so feature.png shows through */
.faq-ov {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(240,235,224,0.62) 0%,
    rgba(245,241,230,0.68) 40%,
    rgba(245,241,230,0.65) 70%,
    rgba(240,235,224,0.62) 100%
  );
  z-index: 1;
}

/* Ambient gold dot accents */
.faq-dot {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
}
.faq-dot-1 {
  width: 320px; height: 320px;
  top: -80px; left: -100px;
  background: radial-gradient(circle, rgba(185,154,82,0.10) 0%, transparent 70%);
}
.faq-dot-2 {
  width: 200px; height: 200px;
  bottom: 40px; right: -40px;
  background: radial-gradient(circle, rgba(45,107,74,0.08) 0%, transparent 70%);
}
.faq-dot-3 {
  width: 140px; height: 140px;
  top: 40%; left: 55%;
  background: radial-gradient(circle, rgba(185,154,82,0.07) 0%, transparent 70%);
}

/* Botanical side decorations */
.faq-deco {
  position: absolute;
  pointer-events: none;
  z-index: 2;
}
.faq-deco-tl { top: 20px; left: 24px; }
.faq-deco-tr { top: 20px; right: 24px; transform: scaleX(-1); }

/* ── Main inner — centered column ── */
.faq-inner {
  position: relative;
  z-index: 3;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

/* ── TOP HEADING ── */
.faq-head {
  text-align: center;
  margin-bottom: 52px;
}
.faq-head-lotus {
  margin: 0 auto 16px;
  display: flex;
  justify-content: center;
}
.faq-head-eye {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: var(--lsans);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  color: #B99A52;
  margin-bottom: 16px;
}
.faq-head-line,
.faq-head-line-r {
  display: inline-block;
  height: 1px;
  width: 40px;
  background: linear-gradient(to right, transparent, #B99A52);
}
.faq-head-line-r { background: linear-gradient(to left, transparent, #B99A52); }

.faq-head-h2 {
  font-family: var(--lserif);
  font-size: clamp(30px, 3.4vw, 50px);
  font-weight: 500;
  color: #071f17;
  line-height: 1.15;
  margin: 0 0 18px;
}
.faq-head-h2 em { font-style: italic; color: #2d6b4a; }

.faq-head-sub {
  font-family: var(--lsans);
  font-size: 14px;
  color: #3a5242;
  line-height: 1.7;
  max-width: 520px;
  margin: 0 auto 20px;
}

.faq-head-orn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.faq-head-rl {
  display: inline-block;
  height: 1px;
  width: 48px;
  background: linear-gradient(to right, transparent, rgba(185,154,82,0.55));
}
.faq-head-rl-r { background: linear-gradient(to left, transparent, rgba(185,154,82,0.55)); }

/* ── ACCORDION BOX (centered) ── */
.faq-box {
  width: 100%;
  max-width: 860px;
}

/* Loading skeleton */
.faq-loading { display: flex; flex-direction: column; gap: 0; }
.faq-skel-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 22px 0;
  border-bottom: 1px solid rgba(185,154,82,0.16);
}
.faq-skel-num {
  flex-shrink: 0;
  width: 28px; height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(185,154,82,0.12) 25%, rgba(185,154,82,0.22) 50%, rgba(185,154,82,0.12) 75%);
  background-size: 200% 100%;
  animation: faq-shimmer 1.6s infinite;
}
.faq-skel-q {
  height: 14px;
  border-radius: 4px;
  flex: 1;
  max-width: 70%;
  background: linear-gradient(90deg, rgba(185,154,82,0.10) 25%, rgba(185,154,82,0.18) 50%, rgba(185,154,82,0.10) 75%);
  background-size: 200% 100%;
  animation: faq-shimmer 1.6s infinite;
}
@keyframes faq-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Error / empty */
.faq-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 40px 0;
  font-family: var(--lsans);
  font-size: 13px;
  color: #5a7a62;
  justify-content: center;
}

/* ── Accordion ── */
.faq-acc { display: flex; flex-direction: column; width: 100%; }
.faq-item { display: flex; flex-direction: column; }

/* Open state gets a cream card */
.faq-item-open {
  background: rgba(252,248,240,0.85);
  border: 1px solid rgba(185,154,82,0.30);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(185,154,82,0.10), 0 1px 4px rgba(45,107,74,0.06);
  margin: 4px 0;
  backdrop-filter: blur(4px);
}

/* Question row */
.faq-row {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  padding: 22px 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: #1a2e1f;
  transition: color 0.22s;
}
.faq-row:hover { color: #2d6b4a; }
.faq-item-open .faq-row { color: #0d4a2e; padding-bottom: 14px; }

/* Question number */
.faq-num {
  flex-shrink: 0;
  font-family: var(--lserif);
  font-size: 18px;
  font-weight: 400;
  color: #B99A52;
  opacity: 0.75;
  min-width: 30px;
  line-height: 1;
  transition: opacity 0.22s, color 0.22s;
}
.faq-row:hover .faq-num { opacity: 1; }
.faq-item-open .faq-num { color: #2d6b4a; opacity: 1; }

.faq-q-text {
  font-family: var(--lsans);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  flex: 1;
}

/* Plus/minus icon */
.faq-icon {
  flex-shrink: 0;
  width: 30px; height: 30px;
  border-radius: 50%;
  border: 1.5px solid rgba(185,154,82,0.40);
  background: rgba(247,241,227,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #B99A52;
  transition: background 0.22s, border-color 0.22s, transform 0.30s cubic-bezier(0.22,1,0.36,1);
}
.faq-item-open .faq-icon {
  background: #0d4a2e;
  border-color: #0d4a2e;
  color: #f0ead8;
  transform: rotate(45deg);
}
.faq-icon-h { transition: opacity 0.22s; }
.faq-item-open .faq-icon-h { opacity: 0; }

/* Answer */
.faq-ans-wrap {
  overflow: hidden;
  transition: max-height 0.40s cubic-bezier(0.22,1,0.36,1);
}
.faq-ans {
  padding: 0 24px 22px 74px;
  position: relative;
  display: flex;
  flex-direction: column;
}
.faq-ans-leaf {
  position: absolute;
  left: 48px;
  top: 2px;
}
.faq-ans p {
  font-family: var(--lsans);
  font-size: 13.5px;
  color: #2e4a38;
  line-height: 1.78;
  margin: 0;
}
.faq-cat {
  display: inline-block;
  align-self: flex-start;
  margin-top: 12px;
  font-family: var(--lsans);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #B99A52;
  background: rgba(185,154,82,0.10);
  border: 1px solid rgba(185,154,82,0.22);
  border-radius: 20px;
  padding: 3px 10px;
}

/* Separator (hidden for open item) */
.faq-sep {
  height: 1px;
  background: linear-gradient(to right, rgba(185,154,82,0.25), rgba(185,154,82,0.05));
  margin: 0 24px;
}
.faq-item-open .faq-sep,
.faq-item:last-child .faq-sep { display: none; }

/* ── Show more button ── */
.faq-more-wrap {
  display: flex;
  justify-content: center;
  padding: 28px 0 8px;
}
.faq-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 28px;
  background: rgba(247,241,227,0.80);
  border: 1.5px solid rgba(185,154,82,0.45);
  border-radius: 40px;
  font-family: var(--lsans);
  font-size: 13px;
  font-weight: 600;
  color: #2d6b4a;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.22s, border-color 0.22s, transform 0.18s;
}
.faq-more-btn:hover {
  background: rgba(247,241,227,0.96);
  border-color: #B99A52;
  transform: translateY(-1px);
}
.faq-more-btn svg {
  transition: transform 0.28s cubic-bezier(0.22,1,0.36,1);
}

/* ── BOTTOM CTA ── */
.faq-cta {
  margin-top: 56px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.faq-cta-lbl {
  font-family: var(--lserif);
  font-size: 22px;
  font-weight: 400;
  color: #071f17;
  margin: 0;
}
.faq-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: linear-gradient(135deg, #1c4514 0%, #2d6b4a 100%);
  color: #f0ead8;
  font-family: var(--lsans);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-decoration: none;
  border-radius: 4px;
  transition: filter 0.22s, transform 0.18s;
}
.faq-cta-btn:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
}
.faq-cta-sec {
  font-family: var(--lsans);
  font-size: 13px;
  font-weight: 500;
  color: #2d6b4a;
  text-decoration: none;
  border-bottom: 1px solid rgba(45,107,74,0.35);
  padding-bottom: 1px;
  transition: border-color 0.22s, color 0.22s;
}
.faq-cta-sec:hover { color: #0d4a2e; border-color: #0d4a2e; }

/* ── Responsive ── */
@media (max-width: 1024px) and (min-width: 768px) {
  .faq-inner { padding: 0 32px; }
  .faq-box { max-width: 100%; }
  .faq-head-h2 { font-size: clamp(28px, 4vw, 38px); }
}
@media (max-width: 767px) {
  .faq { padding: 64px 0 56px; }
  .faq-bg { background-attachment: scroll; }
  .faq-inner { padding: 0 16px; }
  .faq-box { max-width: 100%; }
  .faq-head { margin-bottom: 36px; }
  .faq-head-h2 { font-size: clamp(24px, 6.5vw, 32px); }
  .faq-head-sub { font-size: 13.5px; }
  .faq-row { padding: 18px 14px; gap: 12px; }
  .faq-num { font-size: 15px; min-width: 22px; }
  .faq-q-text { font-size: 13.5px; }
  .faq-ans { padding: 0 14px 18px 50px; }
  .faq-ans-leaf { left: 28px; }
  .faq-sep { margin: 0 14px; }
  .faq-deco-tl, .faq-deco-tr { display: none; }
  .faq-item-open .faq-row { padding-bottom: 10px; }
}
@media (max-width: 480px) {
  .faq-inner { padding: 0 12px; }
  .faq-row { padding: 16px 12px; gap: 10px; }
  .faq-ans { padding: 0 12px 16px 46px; }
}

/* ═══════════════════════════════════════════
   BLOG SECTION
═══════════════════════════════════════════ */
.blg {
  position: relative;
  background: #f5f1e6;
  padding: 88px 0 72px;
  overflow: hidden;
}
.blg-bg {
  position: absolute; inset: 0;
  background: url('/assets/images/blogs.png') center / cover fixed no-repeat;
  z-index: 0; pointer-events: none;
}
.blg-ov {
  display: none;
}

/* Botanical side decorations */
.blg-deco {
  position: absolute;
  pointer-events: none;
  z-index: 1;
}
.blg-deco-l { top: 32px; left: 16px; }
.blg-deco-r { top: 32px; right: 16px; transform: scaleX(-1); }

/* ── Inner wrapper ── */
.blg-inner {
  position: relative;
  z-index: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 48px;
}

/* ── Heading ── */
.blg-head {
  text-align: center;
  margin-bottom: 52px;
}
.blg-eye {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: var(--lsans);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.38em;
  text-transform: uppercase;
  color: #B99A52;
  margin-bottom: 18px;
}
.blg-eye-line {
  display: inline-block;
  width: 36px; height: 1px;
  background: linear-gradient(to right, transparent, #B99A52);
}
.blg-eye-line-r { background: linear-gradient(to left, transparent, #B99A52); }
.blg-h2 {
  font-family: var(--lserif);
  font-size: clamp(30px, 3.5vw, 52px);
  font-weight: 500;
  color: #071f17;
  line-height: 1.15;
  margin: 0 0 18px;
}
.blg-h2 em { font-style: italic; color: #2d6b4a; }
.blg-sub {
  font-family: var(--lsans);
  font-size: 14px;
  color: #3a5242;
  line-height: 1.72;
  max-width: 540px;
  margin: 0 auto 18px;
}
.blg-orn {
  display: flex;
  justify-content: center;
}

/* ── Grid ── */
.blg-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 52px;
}

/* ── Skeleton ── */
.blg-grid-loading { pointer-events: none; }
.blg-skel-card {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255,255,255,0.55);
  border: 1px solid rgba(185,154,82,0.12);
}
.blg-skel-img {
  height: 200px;
  background: linear-gradient(90deg, rgba(185,154,82,0.10) 25%, rgba(185,154,82,0.18) 50%, rgba(185,154,82,0.10) 75%);
  background-size: 200% 100%;
  animation: blg-shimmer 1.6s infinite;
}
.blg-skel-body { padding: 18px 16px; display: flex; flex-direction: column; gap: 10px; }
.blg-skel-cat  { height: 8px;  width: 55px;  border-radius: 4px; background: rgba(185,154,82,0.18); }
.blg-skel-t1   { height: 14px; width: 90%;   border-radius: 4px; background: rgba(185,154,82,0.14); }
.blg-skel-t2   { height: 14px; width: 65%;   border-radius: 4px; background: rgba(185,154,82,0.12); }
.blg-skel-ex   { height: 10px; width: 100%;  border-radius: 4px; background: rgba(185,154,82,0.09); }
.blg-skel-meta { height: 8px;  width: 70px;  border-radius: 4px; background: rgba(185,154,82,0.10); margin-top: 4px; }
@keyframes blg-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Empty / Error state ── */
.blg-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 60px 0;
  font-family: var(--lsans);
  font-size: 14px;
  color: #5a7a62;
  text-align: center;
}

/* ── Blog Card ── */
.blg-card {
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(185,154,82,0.14);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.26s cubic-bezier(0.22,1,0.36,1), box-shadow 0.26s;
  text-decoration: none;
  color: inherit;
}
.blg-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 40px rgba(45,107,74,0.10), 0 2px 8px rgba(185,154,82,0.08);
}

/* Featured first card */
.blg-card-feat {
  border-color: rgba(185,154,82,0.28);
  box-shadow: 0 2px 12px rgba(185,154,82,0.08);
}

/* Image */
.blg-card-img-wrap {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
}
.blg-card-feat .blg-card-img-wrap {
  aspect-ratio: 3 / 2;
}
.blg-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.50s cubic-bezier(0.22,1,0.36,1);
}
.blg-card:hover .blg-card-img { transform: scale(1.04); }

/* Featured badge */
.blg-feat-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(247,241,227,0.92);
  border: 1px solid rgba(185,154,82,0.45);
  border-radius: 20px;
  font-family: var(--lsans);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7a5c1a;
  backdrop-filter: blur(4px);
}

/* Card body */
.blg-card-body {
  padding: 20px 18px 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
}
.blg-card-cat {
  font-family: var(--lsans);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #B99A52;
}
.blg-card-title {
  font-family: var(--lserif);
  font-size: 17px;
  font-weight: 500;
  color: #071f17;
  line-height: 1.3;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.blg-card-excerpt {
  font-family: var(--lsans);
  font-size: 12.5px;
  color: #3a5242;
  line-height: 1.70;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.blg-card-meta {
  font-family: var(--lsans);
  font-size: 11px;
  color: #7a8f7e;
}
.blg-card-author { color: #5a7a62; }
.blg-card-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--lsans);
  font-size: 11.5px;
  font-weight: 600;
  color: #2d6b4a;
  margin-top: 4px;
  transition: gap 0.20s;
}
.blg-card:hover .blg-card-link { gap: 9px; }

/* ── Bottom CTA ── */
.blg-cta {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.blg-cta-lbl {
  font-family: var(--lserif);
  font-size: 20px;
  font-weight: 400;
  color: #071f17;
  margin: 0;
}
.blg-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 14px 34px;
  background: linear-gradient(135deg, #0d4a2e 0%, #2d6b4a 100%);
  color: #f0ead8;
  font-family: var(--lsans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  text-decoration: none;
  border-radius: 4px;
  border: 1px solid rgba(185,154,82,0.30);
  transition: filter 0.22s, transform 0.18s, gap 0.20s;
}
.blg-cta-btn:hover {
  filter: brightness(1.10);
  transform: translateY(-2px);
  gap: 13px;
}
.blg-cta-div {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.blg-cta-rl {
  display: inline-block;
  height: 1px;
  width: 56px;
  background: linear-gradient(to right, transparent, rgba(185,154,82,0.45));
}
.blg-cta-rl-r { background: linear-gradient(to left, transparent, rgba(185,154,82,0.45)); }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .blg-inner { padding: 0 32px; }
}
@media (max-width: 1024px) and (min-width: 768px) {
  .blg { padding: 72px 0 60px; }
  .blg-inner { padding: 0 28px; }
  .blg-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .blg-card-feat .blg-card-img-wrap { aspect-ratio: 4 / 3; }
  .blg-h2 { font-size: clamp(28px, 4vw, 42px); }
}
@media (max-width: 767px) {
  .blg { padding: 60px 0 52px; }
  .blg-bg { background-attachment: scroll; }
  .blg-inner { padding: 0 16px; }
  .blg-head { margin-bottom: 36px; }
  .blg-h2 { font-size: clamp(26px, 7vw, 34px); }
  .blg-sub { font-size: 13.5px; }
  .blg-grid { grid-template-columns: 1fr; gap: 18px; }
  .blg-deco-l, .blg-deco-r { display: none; }
  .blg-cta-btn { width: 100%; justify-content: center; }
}
@media (max-width: 480px) {
  .blg-inner { padding: 0 12px; }
  .blg-head { margin-bottom: 28px; }
}

  `]
})
export class HomeComponent implements OnDestroy, AfterViewInit {
  private zone = inject(NgZone);

  /* ── Hero Slider ── */
  currentSlide = signal(0);
  sliderPaused = signal(false);
  private autoPlayTimer?: ReturnType<typeof setInterval>;
  private touchStartX = 0;

  readonly promoRepeats = [0, 1, 2, 3];

  slides = [
    {
      bg: '/assets/images/hero-1.png',
      bgPos: '30% center',
      bgPosMobile: '62% center',
      eyebrow: 'Trusted Ayurvedic Wellness',
      heading: ['Ancient Wisdom,', 'Modern Healing'],
      desc: 'Formulated from classical Ayurvedic texts and sourced from certified farms across India — wellness the way nature intended.',
      cta: { label: 'Explore Products', link: '/products' },
      sub: 'GMP Certified · 100% Natural · Lab Tested',
    },
    {
      bg: '/assets/images/hero-2.png',
      bgPos: '28% center',
      bgPosMobile: '60% center',
      eyebrow: 'Premium Herbal Formulations',
      heading: ['Rooted in Tradition,', 'Backed by Science'],
      desc: 'Every product undergoes third-party lab testing for purity and potency. From Arjunarishta to Wheat Grass — quality you can trust.',
      cta: { label: 'Shop Bestsellers', link: '/products' },
      sub: 'Free Shipping above ₹999 · Expert Vaidya Guidance',
    },
    {
      bg: '/assets/images/hero-3.png',
      bgPos: '26% center',
      bgPosMobile: '64% center',
      eyebrow: 'Complete Ayurvedic Care',
      heading: ['Nourish Your Body,', 'Balance Your Life'],
      desc: 'From Chyawanprash to Guggul — our curated range supports immunity, digestion, and holistic vitality for the whole family.',
      cta: { label: 'View All Products', link: '/products' },
      sub: 'Authentic · Ethical · Effective',
    },
  ];

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft')  { this.pauseSlider(); this.prevSlide(); }
    if (e.key === 'ArrowRight') { this.pauseSlider(); this.nextSlide(); }
  }

  private fpRevealCheck  = () => this.checkReveal('fp',  'fp-in',  this.fpRevealCheck);
  private fpcRevealCheck = () => this.checkReveal('fpc', 'fpc-in', this.fpcRevealCheck);

  ngAfterViewInit(): void {
    this.startAutoPlay();
    this.zone.runOutsideAngular(() => {
      this.runPreloader();
      this.initRevealListeners();
    });
    this.loadShowcaseProducts();
    this.loadTestimonials();
    this.loadFaqs();
    this.loadBlogPosts();
    this.loadCategories();
    this.initReveal();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    this.fpStopAuto();
    if (this.fpResumeTimer) clearTimeout(this.fpResumeTimer);
    this.fpcStopAuto();
    if (this.fpcResumeTimer) clearTimeout(this.fpcResumeTimer);
    this.tstStopAuto();
    window.removeEventListener('scroll', this.fpRevealCheck);
    window.removeEventListener('scroll', this.fpcRevealCheck);
  }

  private checkReveal(id: string, cls: string, handler: EventListener): void {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.90) {
      el.classList.add(cls);
      window.removeEventListener('scroll', handler);
    }
  }

  private initRevealListeners(): void {
    window.addEventListener('scroll', this.fpRevealCheck,  { passive: true });
    window.addEventListener('scroll', this.fpcRevealCheck, { passive: true });
    // Fire once immediately in case sections are already visible on load
    setTimeout(() => { this.fpRevealCheck(); this.fpcRevealCheck(); }, 600);
  }

  private runPreloader(): void {
    const el = document.getElementById('lc-intro');
    if (!el) return;
    setTimeout(() => el.classList.add('lc-intro-fadeout'), 2600);
    setTimeout(() => el.style.display = 'none', 3000);
  }

  /* ── Slider controls ── */
  nextSlide(): void {
    this.zone.run(() => {
      this.currentSlide.set((this.currentSlide() + 1) % this.slides.length);
    });
  }

  prevSlide(): void {
    this.zone.run(() => {
      this.currentSlide.set((this.currentSlide() - 1 + this.slides.length) % this.slides.length);
    });
  }

  goToSlide(i: number): void {
    this.zone.run(() => this.currentSlide.set(i));
  }

  pauseSlider(): void {
    this.sliderPaused.set(true);
    this.stopAutoPlay();
    setTimeout(() => {
      this.sliderPaused.set(false);
      this.startAutoPlay();
    }, 8000);
  }

  startAutoPlay(): void {
    this.stopAutoPlay();
    this.autoPlayTimer = setInterval(() => {
      if (!this.sliderPaused()) {
        this.zone.run(() => {
          this.currentSlide.set((this.currentSlide() + 1) % this.slides.length);
        });
      }
    }, 5000);
  }

  stopAutoPlay(): void {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = undefined;
    }
  }

  /* ── Product Showcase ── */
  private productSvc = inject(ProductService);
  private cartSvc    = inject(CartService);
  private toastSvc   = inject(ToastService);

  showcaseProducts = signal<ProductList[]>([]);
  showcaseLoading  = signal(true);
  showcaseError    = signal(false);
  showcasePaused   = signal(false);
  private psAddingIds = signal<string[]>([]);

  private loadShowcaseProducts(): void {
    this.productSvc.getFeatured().subscribe({
      next: (res) => {
        const featured: ProductList[] = (res as any).data ?? [];
        if (featured.length > 0) {
          this.showcaseProducts.set(featured);
          this.showcaseLoading.set(false);
          this.fpLoadDetail();
          this.fpStartAuto();
          this.fpcLoadDetail();
          this.fpcStartAuto();
        } else {
          // No featured products — fall back to all products
          this.productSvc.getAll({ pageNumber: 1, pageSize: 12 } as any).subscribe({
            next: (r2) => {
              const d = (r2 as any).data;
              this.showcaseProducts.set(d?.items ?? d ?? []);
              this.showcaseLoading.set(false);
              this.fpLoadDetail();
              this.fpStartAuto();
              this.fpcLoadDetail();
              this.fpcStartAuto();
            },
            error: () => {
              this.showcaseError.set(true);
              this.showcaseLoading.set(false);
            }
          });
        }
      },
      error: () => {
        this.showcaseError.set(true);
        this.showcaseLoading.set(false);
      }
    });
  }

  pauseShowcase():  void { this.showcasePaused.set(true); }
  resumeShowcase(): void { this.showcasePaused.set(false); }

  psDiscount(p: ProductList): number {
    if (!p.discountPrice || p.discountPrice >= p.price) return 0;
    return Math.round(((p.price - p.discountPrice) / p.price) * 100);
  }

  psRound(r: number): number { return Math.round(r); }

  psIsAdding(id: string): boolean { return this.psAddingIds().includes(id); }

  psAddToCart(p: ProductList): void {
    if (this.psIsAdding(p.id) || p.stockQuantity <= 0) return;
    this.psAddingIds.update(ids => [...ids, p.id]);
    this.cartSvc.addItem({ productId: p.id, quantity: 1 }).subscribe({
      next: () => {
        this.psAddingIds.update(ids => ids.filter(i => i !== p.id));
        this.toastSvc.success(`${p.name} added to cart!`);
      },
      error: () => {
        this.psAddingIds.update(ids => ids.filter(i => i !== p.id));
        this.toastSvc.error('Could not add to cart. Please try again.');
      }
    });
  }

  psImgErr(e: Event): void {
    (e.target as HTMLImageElement).src = '/assets/images/logo.png';
  }

  /* ── Featured Product Carousel ── */
  readonly FP_CARD_W  = 216;
  readonly FP_CARD_GAP = 16;

  fpIndex         = signal(0);
  fpDetail        = signal<ProductDetail | null>(null);
  fpTransitioning = signal(false);
  fpDirection     = signal<'next'|'prev'>('next');
  fpExiting       = signal(false);
  fpEntering      = signal(false);
  fpFloating      = signal(false);
  fpHovered       = signal(false);
  fpQty           = signal(1);
  fpAdding        = signal(false);

  private fpAutoTimer:   ReturnType<typeof setInterval>  | undefined;
  private fpResumeTimer: ReturnType<typeof setTimeout>   | undefined;
  private fpTouchX = 0;
  private fpDragX  = 0;
  private fpDragged = false;

  fpCurrentProduct(): ProductList | undefined {
    return this.showcaseProducts()[this.fpIndex()];
  }

  fpTrackOffset(): number {
    return Math.max(0, this.fpIndex()) * (this.FP_CARD_W + this.FP_CARD_GAP);
  }

  private fpLoadDetail(): void {
    const p = this.fpCurrentProduct();
    if (!p) return;
    this.fpDetail.set(null);
    this.productSvc.getBySlug(p.slug).subscribe({
      next: (res) => this.fpDetail.set((res as any).data ?? null),
      error: () => {}
    });
  }

  fpStartAuto(): void {
    this.fpStopAuto();
    this.fpAutoTimer = setInterval(() => {
      if (!this.fpHovered() && !this.fpTransitioning()) {
        this.zone.run(() => this.fpAdvance('next', false));
      }
    }, 5500);
  }

  fpStopAuto(): void {
    if (this.fpAutoTimer) { clearInterval(this.fpAutoTimer); this.fpAutoTimer = undefined; }
  }

  private fpAdvance(dir: 'next'|'prev', isManual: boolean, targetIdx?: number): void {
    if (this.fpTransitioning() || this.showcaseProducts().length < 2) return;
    this.fpTransitioning.set(true);
    this.fpDirection.set(dir);

    if (isManual) {
      this.fpStopAuto();
      if (this.fpResumeTimer) clearTimeout(this.fpResumeTimer);
      this.fpResumeTimer = setTimeout(() => this.fpStartAuto(), 4000);
    }

    this.fpExiting.set(true);

    setTimeout(() => {
      const n = this.showcaseProducts().length;
      if (targetIdx !== undefined) {
        this.fpIndex.set(targetIdx);
      } else if (dir === 'next') {
        this.fpIndex.set((this.fpIndex() + 1) % n);
      } else {
        this.fpIndex.set((this.fpIndex() - 1 + n) % n);
      }
      this.fpQty.set(1);
      this.fpExiting.set(false);
      this.fpEntering.set(true);
      this.fpLoadDetail();

      if (isManual) {
        this.fpFloating.set(true);
        setTimeout(() => this.fpFloating.set(false), 700);
      }

      setTimeout(() => {
        this.fpEntering.set(false);
        this.fpTransitioning.set(false);
      }, 600);
    }, 500);
  }

  fpNext(): void { this.fpAdvance('next', true); }
  fpPrev(): void { this.fpAdvance('prev', true); }

  fpSetIndex(i: number): void {
    if (this.fpDragged) { this.fpDragged = false; return; }
    if (i === this.fpIndex() || this.fpTransitioning()) return;
    this.fpAdvance(i > this.fpIndex() ? 'next' : 'prev', true, i);
  }

  fpMouseEnter(): void { this.fpHovered.set(true); }
  fpMouseLeave(): void { this.fpHovered.set(false); }

  fpTouchStart(e: TouchEvent): void { this.fpTouchX = e.changedTouches[0].clientX; }
  fpTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.fpTouchX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) this.fpAdvance('next', true);
      else        this.fpAdvance('prev', true);
    }
  }

  fpCarouselDragStart(e: MouseEvent): void {
    this.fpDragX   = e.clientX;
    this.fpDragged = false;
  }

  fpCarouselDragEnd(e: MouseEvent): void {
    const dx = e.clientX - this.fpDragX;
    if (Math.abs(dx) > 40) {
      this.fpDragged = true;
      if (dx < 0) this.fpAdvance('next', true);
      else        this.fpAdvance('prev', true);
    }
  }

  fpIncQty(): void { if (this.fpQty() < 10) this.fpQty.update(q => q + 1); }
  fpDecQty(): void { if (this.fpQty() > 1)  this.fpQty.update(q => q - 1); }

  fpRound(r: number): number { return Math.round(r); }

  fpAddToCart(): void {
    const p = this.fpCurrentProduct();
    if (!p || this.fpAdding() || p.stockQuantity <= 0) return;
    this.fpAdding.set(true);
    this.cartSvc.addItem({ productId: p.id, quantity: this.fpQty() }).subscribe({
      next: () => {
        this.fpAdding.set(false);
        this.toastSvc.success(`${p.name} added to cart!`);
      },
      error: () => {
        this.fpAdding.set(false);
        this.toastSvc.error('Could not add to cart. Please try again.');
      }
    });
  }

  fpImgErr(e: Event): void {
    (e.target as HTMLImageElement).src = '/assets/images/logo.png';
  }

  /* ── Product Collection Carousel (fpc) ── */
  readonly FPC_CARD_W  = 210;
  readonly FPC_CARD_GAP = 14;

  fpcIndex         = signal(0);
  fpcDetail        = signal<ProductDetail | null>(null);
  fpcTransitioning = signal(false);
  fpcDirection     = signal<'next'|'prev'>('next');
  fpcExiting       = signal(false);
  fpcEntering      = signal(false);
  fpcFloating      = signal(false);
  fpcHovered       = signal(false);
  fpcQty           = signal(1);
  fpcAdding        = signal(false);

  private fpcAutoTimer:   ReturnType<typeof setInterval> | undefined;
  private fpcResumeTimer: ReturnType<typeof setTimeout>  | undefined;
  private fpcTouchX = 0;
  private fpcDragX  = 0;
  private fpcDragged = false;

  fpcCurrentProduct(): ProductList | undefined {
    return this.showcaseProducts()[this.fpcIndex()];
  }

  fpcDoubledProducts(): ProductList[] {
    const p = this.showcaseProducts();
    return [...p, ...p];
  }

  fpcTrackOffset(): number {
    return Math.max(0, this.fpcIndex()) * (this.FPC_CARD_W + this.FPC_CARD_GAP);
  }

  fpcSetMarqueeIndex(i: number): void {
    const realIdx = i % this.showcaseProducts().length;
    if (realIdx === this.fpcIndex() || this.fpcTransitioning()) return;
    this.fpcAdvance(realIdx > this.fpcIndex() ? 'next' : 'prev', true, realIdx);
  }

  private fpcLoadDetail(): void {
    const p = this.fpcCurrentProduct();
    if (!p) return;
    this.fpcDetail.set(null);
    this.productSvc.getBySlug(p.slug).subscribe({
      next: (res) => this.fpcDetail.set((res as any).data ?? null),
      error: () => {}
    });
  }

  fpcStartAuto(): void {
    this.fpcStopAuto();
    this.fpcAutoTimer = setInterval(() => {
      if (!this.fpcHovered() && !this.fpcTransitioning()) {
        this.zone.run(() => this.fpcAdvance('next', false));
      }
    }, 5500);
  }

  fpcStopAuto(): void {
    if (this.fpcAutoTimer) { clearInterval(this.fpcAutoTimer); this.fpcAutoTimer = undefined; }
  }

  private fpcAdvance(dir: 'next'|'prev', isManual: boolean, targetIdx?: number): void {
    if (this.fpcTransitioning() || this.showcaseProducts().length < 2) return;
    this.fpcTransitioning.set(true);
    this.fpcDirection.set(dir);

    if (isManual) {
      this.fpcStopAuto();
      if (this.fpcResumeTimer) clearTimeout(this.fpcResumeTimer);
      this.fpcResumeTimer = setTimeout(() => this.fpcStartAuto(), 4000);
    }

    this.fpcExiting.set(true);

    setTimeout(() => {
      const n = this.showcaseProducts().length;
      if (targetIdx !== undefined) {
        this.fpcIndex.set(targetIdx);
      } else if (dir === 'next') {
        this.fpcIndex.set((this.fpcIndex() + 1) % n);
      } else {
        this.fpcIndex.set((this.fpcIndex() - 1 + n) % n);
      }
      this.fpcQty.set(1);
      this.fpcExiting.set(false);
      this.fpcEntering.set(true);
      this.fpcLoadDetail();

      if (isManual) {
        this.fpcFloating.set(true);
        setTimeout(() => this.fpcFloating.set(false), 700);
      }

      setTimeout(() => {
        this.fpcEntering.set(false);
        this.fpcTransitioning.set(false);
      }, 600);
    }, 500);
  }

  fpcNext(): void { this.fpcAdvance('next', true); }
  fpcPrev(): void { this.fpcAdvance('prev', true); }

  fpcSetIndex(i: number): void {
    if (this.fpcDragged) { this.fpcDragged = false; return; }
    if (i === this.fpcIndex() || this.fpcTransitioning()) return;
    this.fpcAdvance(i > this.fpcIndex() ? 'next' : 'prev', true, i);
  }

  fpcMouseEnter(): void { this.fpcHovered.set(true); }
  fpcMouseLeave(): void { this.fpcHovered.set(false); }

  fpcTouchStart(e: TouchEvent): void { this.fpcTouchX = e.changedTouches[0].clientX; }
  fpcTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.fpcTouchX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) this.fpcAdvance('next', true);
      else        this.fpcAdvance('prev', true);
    }
  }

  fpcDragStart(e: MouseEvent): void {
    this.fpcDragX   = e.clientX;
    this.fpcDragged = false;
  }

  fpcDragEnd(e: MouseEvent): void {
    const dx = e.clientX - this.fpcDragX;
    if (Math.abs(dx) > 40) {
      this.fpcDragged = true;
      if (dx < 0) this.fpcAdvance('next', true);
      else        this.fpcAdvance('prev', true);
    }
  }

  fpcIncQty(): void { if (this.fpcQty() < 10) this.fpcQty.update(q => q + 1); }
  fpcDecQty(): void { if (this.fpcQty() > 1)  this.fpcQty.update(q => q - 1); }

  fpcAddToCart(): void {
    const p = this.fpcCurrentProduct();
    if (!p || this.fpcAdding() || p.stockQuantity <= 0) return;
    this.fpcAdding.set(true);
    this.cartSvc.addItem({ productId: p.id, quantity: this.fpcQty() }).subscribe({
      next: () => {
        this.fpcAdding.set(false);
        this.toastSvc.success(`${p.name} added to cart!`);
      },
      error: () => {
        this.fpcAdding.set(false);
        this.toastSvc.error('Could not add to cart. Please try again.');
      }
    });
  }

  onHeroTouchStart(e: TouchEvent): void {
    this.touchStartX = e.changedTouches[0].clientX;
  }

  onHeroTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(dx) < 40) return;
    this.pauseSlider();
    if (dx < 0) this.nextSlide(); else this.prevSlide();
  }

  /* ══════════════════════════════════════════
     TESTIMONIALS
  ══════════════════════════════════════════ */
  private contentSvc = inject(ContentService);

  tstTestimonials = signal<Testimonial[]>([]);
  tstLoading      = signal(true);
  tstError        = signal(false);
  tstActive       = signal(0);   // scroll offset index (card-based)
  tstHovered      = signal(false);
  private tstTimer: ReturnType<typeof setInterval> | undefined;
  private tstTouchX = 0;

  private loadTestimonials(): void {
    this.contentSvc.getTestimonials().subscribe({
      next: (res: any) => {
        const data: Testimonial[] = res?.data ?? [];
        this.tstTestimonials.set(data.filter(t => t.isActive));
        this.tstLoading.set(false);
        this.tstStartAuto();
      },
      error: () => {
        this.tstError.set(true);
        this.tstLoading.set(false);
      }
    });
  }

  /* How many cards are visible — respond to viewport */
  tstVisible(): number {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    if (w >= 1024) return 3;
    if (w >= 640)  return 2;
    return 1;
  }

  /* Total unique pages */
  private tstPages(): number {
    return Math.max(1, this.tstTestimonials().length);
  }

  tstActivePage(): number {
    return this.tstActive() % this.tstPages();
  }

  /* Infinite loop array — duplicate so the track always has enough items */
  tstLoop(): Testimonial[] {
    const t = this.tstTestimonials();
    if (t.length === 0) return [];
    return [...t, ...t, ...t];  // 3× ensures no blank at any offset
  }

  tstIsCenter(i: number): boolean {
    return i === this.tstActive() + 1;
  }

  tstStars(rating: number): boolean[] {
    return [1,2,3,4,5].map(n => n <= rating);
  }

  tstNext(): void {
    const len = this.tstTestimonials().length;
    if (len === 0) return;
    this.tstActive.update(a => (a + 1) % len);
    this.tstResetTimer();
  }

  tstPrev(): void {
    const len = this.tstTestimonials().length;
    if (len === 0) return;
    this.tstActive.update(a => (a - 1 + len) % len);
    this.tstResetTimer();
  }

  tstGoTo(i: number): void {
    this.tstActive.set(i);
    this.tstResetTimer();
  }

  tstPause():  void { this.tstHovered.set(true);  this.tstStopAuto(); }
  tstResume(): void { this.tstHovered.set(false); this.tstStartAuto(); }

  private tstStartAuto(): void {
    this.tstStopAuto();
    this.tstTimer = setInterval(() => {
      if (!this.tstHovered()) this.zone.run(() => this.tstNext());
    }, 5500);
  }

  private tstStopAuto(): void {
    if (this.tstTimer) { clearInterval(this.tstTimer); this.tstTimer = undefined; }
  }

  private tstResetTimer(): void { this.tstStartAuto(); }

  tstTouchStart(e: TouchEvent): void { this.tstTouchX = e.changedTouches[0].clientX; }
  tstTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.tstTouchX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) this.tstNext(); else this.tstPrev();
  }

  tstImgErr(e: Event): void {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  /* ══════════════════════════════════════════
     FAQ
  ══════════════════════════════════════════ */
  /* ── Blog ── */
  blgPosts   = signal<BlogPost[]>([]);
  blgLoading = signal(true);
  blgError   = signal(false);

  private loadBlogPosts(): void {
    this.contentSvc.getBlogPosts().subscribe({
      next: (res: any) => {
        const all: BlogPost[] = (res?.data ?? res ?? []).filter((p: BlogPost) => p.isActive);
        this.blgPosts.set(all.slice(0, 4));
        this.blgLoading.set(false);
      },
      error: () => { this.blgError.set(true); this.blgLoading.set(false); }
    });
  }

  blgDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ══════════════════════════════════════════
     CATEGORIES
  ══════════════════════════════════════════ */
  catList    = signal<any[]>([]);
  catLoading = signal(true);
  catError   = signal(false);

  loadCategories(): void {
    this.catLoading.set(true);
    this.catError.set(false);
    this.productSvc.getCategories().subscribe({
      next: (res: any) => {
        const all = (res?.data ?? res ?? []).filter((c: any) => c.isActive);
        this.catList.set(all);
        this.catLoading.set(false);
      },
      error: () => { this.catError.set(true); this.catLoading.set(false); }
    });
  }

  catImgErr(e: Event): void {
    (e.target as HTMLImageElement).src = '/assets/images/feature.png';
  }

  private rvIO?: IntersectionObserver;

  private initReveal(): void {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.rv,.rv-stagger,.rv-stagger-sm').forEach(el => el.classList.add('is-vis'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        el.classList.add('is-vis');
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    this.rvIO = io;

    const observeTree = (root: Element) => {
      root.querySelectorAll('.rv,.rv-stagger,.rv-stagger-sm').forEach(el => {
        if (!el.classList.contains('is-vis')) io.observe(el);
      });
    };

    observeTree(document.documentElement);

    // Watch for *ngIf elements added to DOM after initReveal runs
    const mo = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          const el = node as Element;
          if (el.matches('.rv,.rv-stagger,.rv-stagger-sm')) {
            if (!el.classList.contains('is-vis')) io.observe(el);
          } else {
            observeTree(el);
          }
        });
      });
    });

    mo.observe(document.body, { childList: true, subtree: true });
  }

  faqList    = signal<Faq[]>([]);
  faqLoading = signal(true);
  faqError   = signal(false);
  faqOpen    = signal<number | null>(0);
  faqShowAll = signal(false);
  faqVisible() { return this.faqShowAll() ? this.faqList() : this.faqList().slice(0, 6); }

  private loadFaqs(): void {
    this.contentSvc.getFaqs().subscribe({
      next: (res: any) => {
        const data: Faq[] = (res?.data ?? []).filter((f: Faq) => f.isActive);
        this.faqList.set(data);
        this.faqLoading.set(false);
        this.faqOpen.set(data.length > 0 ? 0 : null);
      },
      error: () => {
        this.faqError.set(true);
        this.faqLoading.set(false);
      }
    });
  }

  faqToggle(i: number): void {
    this.faqOpen.set(this.faqOpen() === i ? null : i);
  }

  faqAnswerHeight(_i: number): string {
    return '600px';
  }

}
