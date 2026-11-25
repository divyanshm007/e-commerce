import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContentService } from '../../../core/services/content.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [NgIf, MatProgressSpinnerModule, BreadcrumbComponent],
  template: `
    <div class="container" style="padding-top:24px" *ngIf="page">
      <app-breadcrumb [items]="[{label:'Home',link:'/'},{label: page.title}]" />
    </div>

    <div class="loading-overlay" *ngIf="loading"><mat-spinner /></div>

    <div class="container static-page" *ngIf="!loading && page">
      <h1>{{ page.title }}</h1>
      <div class="page-content" [innerHTML]="page.content"></div>
    </div>

    <div class="empty-state" *ngIf="!loading && !page">
      <h3>Page Not Found</h3>
      <p>The page you are looking for does not exist.</p>
    </div>
  `,
  styles: [`
    .static-page {
      padding: 24px 16px 80px;
      max-width: 860px;
      h1 { font-size: 36px; font-weight: 700; margin: 0 0 32px; }
    }

    .page-content {
      font-size: 15px;
      line-height: 1.8;
      color: var(--text-secondary);

      h2, h3 { color: var(--text-primary); margin-top: 32px; }
      p { margin-bottom: 16px; }
      ul, ol { padding-left: 24px; margin-bottom: 16px; }
      li { margin-bottom: 8px; }
    }
  `]
})
export class PageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contentService = inject(ContentService);

  page: any = null;
  loading = true;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug')!;
      this.loadPage(slug);
    });
  }

  private loadPage(slug: string): void {
    this.loading = true;
    this.contentService.getPage(slug).subscribe({
      next: (res) => { this.page = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
