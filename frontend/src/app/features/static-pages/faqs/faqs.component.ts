import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContentService } from '../../../core/services/content.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-faqs',
  standalone: true,
  imports: [NgFor, NgIf, MatExpansionModule, MatProgressSpinnerModule, BreadcrumbComponent, PageHeroComponent],
  template: `
    <app-page-hero
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about Ayurveda, our products and services."
      icon="quiz"
      image="/uploads/heroes/hero-faqs.jpg">
    </app-page-hero>

    <div class="container faqs-page">

      <div class="loading-overlay" *ngIf="loading"><mat-spinner /></div>

      <mat-accordion *ngIf="!loading">
        <mat-expansion-panel *ngFor="let faq of faqs()">
          <mat-expansion-panel-header>
            <mat-panel-title>{{ faq.question }}</mat-panel-title>
          </mat-expansion-panel-header>
          <p>{{ faq.answer }}</p>
        </mat-expansion-panel>
      </mat-accordion>

      <div class="empty-state" *ngIf="!loading && !faqs().length">
        <h3>No FAQs available</h3>
        <p>Check back later for frequently asked questions.</p>
      </div>
    </div>
  `,
  styles: [`
    .faqs-page { padding: 24px 16px 80px; max-width: 860px; }

    .page-header {
      margin-bottom: 40px;
      h1 { font-size: 36px; font-weight: 700; margin: 0 0 8px; }
      p { color: var(--text-secondary); font-size: 16px; margin: 0; }
    }

    mat-expansion-panel {
      margin-bottom: 8px !important;
      border-radius: var(--radius-sm) !important;
      p { font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin: 0; }
    }
  `]
})
export class FaqsComponent implements OnInit {
  private contentService = inject(ContentService);
  faqs = signal<any[]>([]);
  loading = true;

  ngOnInit(): void {
    this.contentService.getFaqs().subscribe({
      next: (res) => { if (res.data) this.faqs.set(res.data); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
