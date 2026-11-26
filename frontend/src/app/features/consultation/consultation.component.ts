import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIf, NgFor } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ApiService } from '../../core/services/api.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { mediaUrl } from '../../core/utils/media';

@Component({
  selector: 'app-consultation',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [MatDatepickerModule, MatDialogModule, RouterLink, NgIf, NgFor, ReactiveFormsModule, BreadcrumbComponent, PageHeroComponent,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="container" style="padding-top:24px">
      <app-breadcrumb [items]="[{label:'Home',link:'/'},{label:'Consultation'}]" />
    </div>

    <app-page-hero
      title="Book an Ayurvedic Consultation"
      subtitle="Speak with our certified Ayurvedic experts and get personalized health guidance."
      icon="self_improvement"
      image="/uploads/heroes/hero-ayurveda.jpg">
    </app-page-hero>

    <div class="container consult-layout">

      <!-- Why Consult -->
      <div class="benefits-section">
        <p class="bs-eyebrow">Why Choose Us</p>
        <h2 class="bs-title">Why Consult with Us?</h2>
        <div class="benefits-grid">
          <div class="benefit-card" *ngFor="let b of benefits"
            [style.background-image]="'url(' + b.photo + ')'">
            <div class="bc-overlay"></div>
            <div class="bc-content">
              <div class="bc-icon-wrap">
                <mat-icon class="bc-icon">{{ b.matIcon }}</mat-icon>
              </div>
              <h4>{{ b.title }}</h4>
              <p>{{ b.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Booking Form -->
      <div class="card booking-form" *ngIf="!submitted()">
        <h2><mat-icon>event</mat-icon> Schedule Your Session</h2>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>Full Name *</mat-label>
              <input matInput formControlName="name" placeholder="Your full name" />
              <mat-error>Name is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Phone Number *</mat-label>
              <input matInput formControlName="phone" placeholder="+91 XXXXX XXXXX" />
              <mat-error>Valid phone is required</mat-error>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email Address *</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-error>Valid email is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Your Health Concern *</mat-label>
            <textarea matInput formControlName="concern" rows="4" placeholder="Describe your health concern or what you'd like to discuss..."></textarea>
            <mat-error>Please describe your concern</mat-error>
          </mat-form-field>

          <div class="row-2">
            <mat-form-field appearance="outline">
              <mat-label>Preferred Date</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="preferredDate" [min]="minDateValue" readonly
                     placeholder="Choose a date" (click)="picker.open()" />
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              <mat-hint>Past dates cannot be chosen</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Preferred Time</mat-label>
              <mat-select formControlName="preferredTime">
                <mat-option *ngFor="let t of timeSlots" [value]="t">{{ t }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Your Dosha Type (Optional)</mat-label>
            <mat-select formControlName="doshaType">
              <mat-option value="">I don't know yet</mat-option>
              <mat-option value="Vata">Vata</mat-option>
              <mat-option value="Pitta">Pitta</mat-option>
              <mat-option value="Kapha">Kapha</mat-option>
            </mat-select>
            <mat-hint>Not sure? <a routerLink="/dosha-quiz">Take our Dosha Quiz</a></mat-hint>
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || submitting()" class="submit-btn">
            <mat-icon>{{ submitting() ? 'hourglass_empty' : 'send' }}</mat-icon>
            {{ submitting() ? 'Booking...' : 'Book My Consultation' }}
          </button>
        </form>
      </div>

      <!-- Success -->
      <div class="success-card card" *ngIf="submitted()">
        <mat-icon class="success-icon">check_circle</mat-icon>
        <h2>Consultation Booked! 🎉</h2>
        <p>Thank you! Our Ayurvedic expert will contact you within 24 hours to confirm your session.</p>
        <div class="success-actions">
          <a mat-stroked-button routerLink="/">Back to Home</a>
          <a mat-flat-button color="primary" routerLink="/products">Shop Products</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Layout ── */
    .consult-layout { padding: 48px 16px 80px; max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 52px; }

    /* ── Benefits section ── */
    .benefits-section { }
    .bs-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--primary,#064E3B); margin: 0 0 6px; }
    .bs-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 34px; font-weight: 600; color: #0C2416; margin: 0 0 28px; letter-spacing: -.01em;
    }

    .benefits-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 500px) { grid-template-columns: 1fr; }
    }

    .benefit-card {
      position: relative; border-radius: 16px; overflow: hidden;
      min-height: 260px; background-size: cover; background-position: center;
      display: flex; flex-direction: column; justify-content: flex-end;
      box-shadow: 0 4px 20px rgba(0,0,0,0.16);
      transition: transform 0.28s ease, box-shadow 0.28s ease;
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 36px rgba(0,0,0,0.26);
        .bc-overlay { background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.1) 100%); }
      }
    }
    .bc-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.1) 100%);
      transition: background 0.28s ease;
    }
    .bc-content {
      position: relative; z-index: 2;
      padding: 20px 18px 22px; color: #fff; text-align: center;
    }
    .bc-icon-wrap {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(255,255,255,0.14); backdrop-filter: blur(8px);
      border: 1.5px solid rgba(255,255,255,0.28);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 12px;
    }
    .bc-icon { font-size: 26px !important; width: 26px !important; height: 26px !important; color: #fff; }
    .benefit-card h4 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 18px; font-weight: 700; margin: 0 0 6px; color: #fff; letter-spacing: 0.01em;
    }
    .benefit-card p { font-size: 12.5px; margin: 0; color: rgba(255,255,255,0.82); line-height: 1.5; }

    .booking-form { padding: 32px; h2 { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 700; margin: 0 0 24px; mat-icon { color: var(--primary); } } }
    .full-width { width: 100%; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; @media (max-width: 600px) { grid-template-columns: 1fr; } }
    mat-form-field { display: block; margin-bottom: 8px; }
    .submit-btn { height: 52px; font-size: 15px; font-weight: 700; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; }

    .success-card { padding: 48px; text-align: center; .success-icon { font-size: 64px; width: 64px; height: 64px; color: #22c55e; margin-bottom: 16px; } h2 { font-size: 28px; font-weight: 700; margin: 0 0 12px; } p { font-size: 16px; color: var(--text-secondary); margin: 0 0 24px; } }
    .success-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  `]
})
export class ConsultationComponent {
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  submitted = signal(false);
  submitting = signal(false);
  /** The first day that can be chosen: today (earlier days are greyed out in the calendar). */
  minDateValue: Date = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();

  /** Today in the user's own calendar (toISOString would give the UTC day, which can be yesterday in India). */
  minDate = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  timeSlots = ['9:00 AM – 10:00 AM', '10:00 AM – 11:00 AM', '11:00 AM – 12:00 PM', '2:00 PM – 3:00 PM', '3:00 PM – 4:00 PM', '4:00 PM – 5:00 PM'];

  benefits = [
    {
      matIcon: 'verified',
      photo: mediaUrl('/uploads/heroes/hero-consult-1.jpg'),
      title: 'Certified Experts',
      desc: 'BAMS qualified Ayurvedic doctors with 10+ years of clinical experience'
    },
    {
      matIcon: 'shield',
      photo: mediaUrl('/uploads/heroes/hero-consult-2.jpg'),
      title: 'Confidential',
      desc: 'Your health data is completely private and secured end-to-end'
    },
    {
      matIcon: 'spa',
      photo: mediaUrl('/uploads/heroes/hero-wishlist.jpg'),
      title: 'Personalised Plan',
      desc: 'Custom diet, lifestyle and herbal supplement plan tailored to your dosha'
    },
    {
      matIcon: 'video_call',
      photo: mediaUrl('/uploads/heroes/hero-consult-3.jpg'),
      title: 'Online Session',
      desc: 'Consult from the comfort of your home via video call or phone'
    },
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    concern: ['', Validators.required],
    preferredDate: [null as Date | null],
    preferredTime: [''],
    doshaType: [''],
  });

  /** yyyy-MM-dd in the visitor's own calendar (toISOString would give the UTC day, which can be yesterday in India). */
  private ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    const v = this.form.value;
    this.api.post('consultation', {
      name: v.name, email: v.email, phone: v.phone, concern: v.concern,
      preferredDate: v.preferredDate ? this.ymd(v.preferredDate as Date) : '', preferredTime: v.preferredTime, doshaType: v.doshaType
    }).subscribe({
      next: () => { this.submitting.set(false); this.submitted.set(true); },
      error: () => { this.submitting.set(false); this.snackBar.open('Booking failed. Please try again.', 'OK', { duration: 3000 }); }
    });
  }
}
