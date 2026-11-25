import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { ContentService } from '../../core/services/content.service';
import { mediaUrl } from '../../core/utils/media';

type TrustPage = 'why-choose-us' | 'quality-assurance' | 'manufacturing' | 'certifications' | 'lab-testing';

interface TrustSection { icon: string; heading: string; body: string; attachedFileUrl?: string; attachedFileName?: string; }
interface TrustPageData { slug: string; title: string; subtitle: string; heroImageUrl?: string; attachedFileUrl?: string; attachedFileName?: string; sections: TrustSection[]; }

@Component({
  selector: 'app-trust-pages',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, MatButtonModule, MatIconModule, BreadcrumbComponent, PageHeroComponent],
  template: `
    <app-page-hero
      [title]="heroTitle"
      [subtitle]="heroSubtitle"
      [icon]="trustIcon"
      [image]="heroImage">
    </app-page-hero>

    <div class="container trust-body">

      <!-- Loading skeleton -->
      <div class="trust-skeleton" *ngIf="loading">
        <div class="sk-card" *ngFor="let n of [1,2,3,4,5,6]"></div>
      </div>

      <div class="trust-grid" *ngIf="!loading && sections.length">
        <div class="trust-card" *ngFor="let s of sections">
          <div class="tc-icon-wrap">
            <span class="material-icons tc-icon">{{ s.icon }}</span>
          </div>
          <h3>{{ s.heading }}</h3>
          <p>{{ s.body }}</p>
          <a *ngIf="s.attachedFileUrl" [href]="s.attachedFileUrl" target="_blank" rel="noopener" class="tc-download">
            <span class="material-icons">download</span>
            {{ s.attachedFileName || 'Download' }}
          </a>
        </div>
      </div>

      <div class="trust-cta">
        <p>Have questions about our quality standards?</p>
        <div>
          <a mat-flat-button color="primary" routerLink="/contact">Contact Us</a>
          <a mat-stroked-button routerLink="/consultation">Book a Consultation</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .trust-body { padding: 48px 16px 80px; }

    .trust-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; margin-bottom: 48px; }
    .sk-card { height: 180px; border-radius: 12px; background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%); background-size: 200% 100%; animation: sk-shimmer 1.4s infinite; }
    @keyframes sk-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    .trust-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; margin-bottom: 48px; }
    .trust-card { background: var(--surface); border-radius: var(--radius-md); padding: 28px; box-shadow: var(--shadow-sm); }
    .tc-icon-wrap { width: 48px; height: 48px; border-radius: 12px; background: rgba(5,150,105,0.10); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .tc-icon { font-size: 24px; color: var(--primary); }
    .trust-card h3 { font-size: 16px; font-weight: 700; margin: 0 0 10px; }
    .trust-card p  { font-size: 14px; color: var(--text-secondary); margin: 0; line-height: 1.7; }
    .tc-download { display: inline-flex; align-items: center; gap: 5px; margin-top: 12px; font-size: 13px; font-weight: 600; color: var(--primary); text-decoration: none; }
    .tc-download:hover { text-decoration: underline; }
    .tc-download .material-icons { font-size: 16px; }

.trust-cta { text-align: center; padding: 40px; background: var(--bg); border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .trust-cta p { font-size: 16px; font-weight: 500; margin: 0; }
    .trust-cta div { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
  `]
})
export class TrustPagesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contentService = inject(ContentService);

  currentPage: TrustPage | null = null;
  loading = false;
  heroTitle = '';
  heroSubtitle = '';
  sections: TrustSection[] = [];

  private readonly ICONS: Record<TrustPage, string> = {
    'why-choose-us':    'verified',
    'quality-assurance':'science',
    'manufacturing':    'factory',
    'certifications':   'workspace_premium',
    'lab-testing':      'biotech',
  };

  private readonly PHOTOS: Record<TrustPage, string> = {
    'why-choose-us':    mediaUrl('/uploads/heroes/hero-ayurveda.jpg'),
    'quality-assurance':mediaUrl('/uploads/heroes/hero-quality.jpg'),
    'manufacturing':    mediaUrl('/uploads/heroes/hero-manufacturing.jpg'),
    'certifications':   mediaUrl('/uploads/heroes/hero-certifications.jpg'),
    'lab-testing':      mediaUrl('/uploads/heroes/hero-lab.jpg'),
  };

  private readonly DEFAULTS: Record<TrustPage, { title: string; subtitle: string }> = {
    'why-choose-us':    { title: 'Why Choose Sidham Pharmacy?',   subtitle: 'We are committed to bringing you the purest, most effective Ayurvedic products with complete transparency.' },
    'quality-assurance':{ title: 'Quality Assurance',             subtitle: 'Every product that reaches you has passed through our rigorous multi-stage quality process.' },
    'manufacturing':    { title: 'Our Manufacturing Process',     subtitle: 'Tradition meets technology in our state-of-the-art Ayurvedic manufacturing facility.' },
    'certifications':   { title: 'Our Certifications',            subtitle: 'We hold the most respected quality certifications in the Ayurvedic and nutraceutical industry.' },
    'lab-testing':      { title: 'Lab Testing & Safety',          subtitle: 'Every batch is independently tested to guarantee your safety and satisfaction.' },
  };

  get trustIcon(): string { return this.currentPage ? this.ICONS[this.currentPage] : 'verified'; }
  get heroImage(): string { return this.currentPage ? this.PHOTOS[this.currentPage] : ''; }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      const page = data['page'] as TrustPage;
      this.currentPage = page;
      const def = this.DEFAULTS[page];
      this.heroTitle = def.title;
      this.heroSubtitle = def.subtitle;
      this.sections = [];
      this.loadPage(page);
    });
  }

  private loadPage(slug: TrustPage) {
    this.loading = true;
    this.contentService.getTrustPage(slug).subscribe({
      next: res => {
        if (res?.data) {
          const d = res.data as TrustPageData;
          this.heroTitle = d.title || this.heroTitle;
          this.heroSubtitle = d.subtitle || this.heroSubtitle;
          this.sections = d.sections ?? [];
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
}
