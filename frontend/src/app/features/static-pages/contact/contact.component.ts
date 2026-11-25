import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ContentService } from '../../../core/services/content.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    ReactiveFormsModule, NgIf,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, BreadcrumbComponent, PageHeroComponent
  ],
  template: `
    <app-page-hero
      title="Contact Us"
      subtitle="Have a question? Our Ayurvedic experts are happy to help you."
      icon="mail"
      image="/uploads/heroes/hero-contact.jpg">
    </app-page-hero>

    <div class="contact-page container">
      <!-- Info -->
      <div class="contact-info">
        <h2>Get In Touch</h2>
        <p>Have a question or need help? We're here for you. Reach out through any of these channels.</p>

        <div class="info-items">
          <div class="info-item">
            <mat-icon>location_on</mat-icon>
            <div>
              <strong>Address</strong>
              <p>Phalsanda Jattan, Kurukshetra, Haryana, India</p>
            </div>
          </div>
          <div class="info-item">
            <mat-icon>phone</mat-icon>
            <div>
              <strong>Phone</strong>
              <p>+91 9588383903</p>
            </div>
          </div>
          <div class="info-item">
            <mat-icon>email</mat-icon>
            <div>
              <strong>Email</strong>
              <p>sidhampharmacy&#64;gmail.com</p>
            </div>
          </div>
          <div class="info-item">
            <mat-icon>access_time</mat-icon>
            <div>
              <strong>Hours</strong>
              <p>Mon–Sat: 9:00 AM – 6:00 PM IST</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="contact-form card">
        <h3>Send us a Message</h3>

        <p class="success-msg" *ngIf="sent">
          <mat-icon>check_circle</mat-icon> Message sent! We'll get back to you within 24 hours.
        </p>
        <p class="error-msg" *ngIf="error">{{ error }}</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" *ngIf="!sent">
          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>Your Name</mat-label>
              <input matInput formControlName="name" />
              <mat-error>Name is required</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
              <mat-error>Valid email required</mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Phone (optional)</mat-label>
            <input matInput type="tel" formControlName="phone" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Subject</mat-label>
            <mat-select formControlName="subject">
              <mat-option value="order">Order Issue</mat-option>
              <mat-option value="product">Product Query</mat-option>
              <mat-option value="return">Return / Refund</mat-option>
              <mat-option value="other">Other</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Message</mat-label>
            <textarea matInput rows="5" formControlName="message"></textarea>
            <mat-error>Message is required</mat-error>
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" class="submit-btn" [disabled]="loading">
            {{ loading ? 'Sending...' : 'Send Message' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .contact-page {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      padding: 40px 16px 80px;
      @media (max-width: 960px) { grid-template-columns: 1fr; }
    }

    h2 { font-size: 28px; font-weight: 700; margin: 0 0 12px; }
    p { color: var(--text-secondary); font-size: 14px; line-height: 1.7; }

    .info-items { margin-top: 32px; display: flex; flex-direction: column; gap: 24px; }

    .info-item {
      display: flex;
      gap: 16px;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: var(--primary); flex-shrink: 0; margin-top: 2px; }
      strong { font-size: 14px; display: block; margin-bottom: 4px; color: var(--text-primary); }
      p { margin: 0; font-size: 14px; }
    }

    .contact-form h3 { font-size: 22px; font-weight: 700; margin: 0 0 24px; }

    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      mat-form-field { width: 100%; margin-bottom: 4px; }
      @media (max-width:600px) { grid-template-columns: 1fr; }
    }

    .full-width { width: 100%; margin-bottom: 4px; }

    .submit-btn { width: 100%; height: 48px; font-size: 15px; font-weight: 600; }

    .success-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #e8f5e9;
      color: #2e7d32;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
      mat-icon { color: #4caf50; }
    }

    .error-msg {
      background: #ffebee;
      color: #c62828;
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
    }
  `]
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private contentService = inject(ContentService);

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: ['other', Validators.required],
    message: ['', Validators.required]
  });

  loading = false;
  sent = false;
  error = '';

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.contentService.sendContact(this.form.value as any).subscribe({
      next: () => { this.sent = true; this.loading = false; },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to send. Try again.';
        this.loading = false;
      }
    });
  }
}
