import { Component, OnInit, inject, signal, ViewEncapsulation } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService],
  imports: [NgIf, ReactiveFormsModule, FormsModule, InputTextModule, TextareaModule, SelectModule, ToggleSwitchModule, SkeletonModule, ToastModule],
  template: `
<p-toast />

<div class="st-page">

  <!-- Header -->
  <div class="st-page-header">
    <div>
      <h1 class="st-page-title">Settings</h1>
      <p class="st-page-sub">Configure your store settings</p>
    </div>
  </div>

  <!-- Tab bar -->
  <div class="st-tab-nav">
    @for (tab of tabs; track tab.key) {
      <button type="button" class="st-tab-btn" [class.st-tab-active]="activeTab === tab.key" (click)="setTab(tab.key)">
        <i [class]="'pi ' + tab.icon"></i><span>{{ tab.label }}</span>
      </button>
    }
  </div>

  <!-- ═══ GENERAL ══════════════════════════════════════════════════ -->
  @if (activeTab === 'general') {
    <div class="st-section-card">
      <div class="st-sc-head">
        <div class="st-sc-icon st-icon-teal"><i class="pi pi-shop"></i></div>
        <div>
          <div class="st-sc-title">General Settings</div>
          <div class="st-sc-sub">Basic store information and branding</div>
        </div>
      </div>

      @if (generalLoading()) {
        <div class="st-sc-body">
          @for (r of [1,2,3,4]; track r) {
            <p-skeleton width="100%" height="44px" styleClass="st-sk" />
          }
        </div>
      }

      @if (!generalLoading()) {
        <form [formGroup]="generalForm" (ngSubmit)="saveGeneral()" class="st-sc-body">
          <div class="st-2col">
            <div class="st-field">
              <label class="st-label">Site Name</label>
              <div class="st-input-wrap"><i class="pi pi-shop st-input-icon"></i><input pInputText formControlName="siteName" class="st-inp st-inp-icon" placeholder="Sidham Pharmacy"/></div>
            </div>
            <div class="st-field">
              <label class="st-label">Currency</label>
              <div class="st-input-wrap st-select-wrap">
                <i class="pi pi-dollar st-input-icon"></i>
                <p-select formControlName="currency" [options]="currencyOptions" optionLabel="label" optionValue="value" styleClass="st-sel" />
              </div>
            </div>
          </div>

          <div class="st-field">
            <label class="st-label">Site Description</label>
            <textarea pTextarea formControlName="siteDescription" rows="3" class="st-textarea" placeholder="Brief store description…"></textarea>
          </div>

          <div class="st-2col">
            <div class="st-field">
              <label class="st-label">Support Email</label>
              <div class="st-input-wrap"><i class="pi pi-envelope st-input-icon"></i><input pInputText formControlName="supportEmail" type="email" class="st-inp st-inp-icon" placeholder="support@example.com"/></div>
            </div>
            <div class="st-field">
              <label class="st-label">Support Phone</label>
              <div class="st-input-wrap"><i class="pi pi-phone st-input-icon"></i><input pInputText formControlName="supportPhone" class="st-inp st-inp-icon" placeholder="+91 XXXXXXXXXX"/></div>
            </div>
          </div>

          <div class="st-field">
            <label class="st-label">Logo URL</label>
            <div class="st-input-wrap"><i class="pi pi-image st-input-icon"></i><input pInputText formControlName="logoUrl" class="st-inp st-inp-icon" placeholder="https://…"/></div>
            @if (generalForm.get('logoUrl')?.value) {
              <div class="st-logo-preview">
                <img [src]="generalForm.get('logoUrl')?.value" alt="Logo" class="st-logo-img" />
              </div>
            }
          </div>

          <div class="st-field">
            <label class="st-label">Address</label>
            <textarea pTextarea formControlName="address" rows="2" class="st-textarea" placeholder="Store address…"></textarea>
          </div>

          <div class="st-form-footer">
            <button type="submit" class="st-save-btn" [disabled]="savingGeneral()">
              <i [class]="savingGeneral() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
              {{ savingGeneral() ? 'Saving…' : 'Save General Settings' }}
            </button>
          </div>
        </form>
      }
    </div>
  }

  <!-- ═══ PAYMENT ═══════════════════════════════════════════════════ -->
  @if (activeTab === 'payment') {
    <div class="st-section-card">
      <div class="st-sc-head">
        <div class="st-sc-icon st-icon-blue"><i class="pi pi-credit-card"></i></div>
        <div>
          <div class="st-sc-title">Razorpay Mode</div>
          <div class="st-sc-sub">Switch between test and live payments</div>
        </div>
      </div>

      @if (paymentLoading()) {
        <div class="st-sc-body"><p-skeleton width="100%" height="64px" styleClass="st-sk" /></div>
      }

      @if (!paymentLoading() && rzpMode) {
        <div class="st-sc-body">
          <div class="st-toggle-card" [class.st-toggle-on]="rzpMode.mode === 'live'">
            <div class="st-toggle-body">
              <div class="st-toggle-title">
                Current mode: {{ rzpMode.mode === 'live' ? 'LIVE' : rzpMode.mode === 'invalid' ? 'INVALID – PAYMENTS OFF' : 'TEST' }}
              </div>
              <div class="st-toggle-sub">
                {{ rzpMode.mode === 'live' ? 'Real payments are being collected.' : rzpMode.mode === 'invalid' ? 'Online payment is switched off until you choose Test or Live.' : 'Test payments only. No real money moves.' }}
                @if (rzpMode.keyId) { Key: {{ rzpMode.keyId }} }
              </div>
            </div>
            <span>Test</span>
            <p-toggleswitch [ngModel]="rzpMode.mode === 'live'" (ngModelChange)="changeRzpMode($event)" [disabled]="savingPayment()" />
            <span>Live</span>
          </div>

          @if (rzpMode.configurationError) {
            <div class="st-info-banner">
              <i class="pi pi-exclamation-triangle"></i>
              <p>{{ rzpMode.configurationError }}</p>
            </div>
          }

          @if (!rzpMode.testConfigured || !rzpMode.liveConfigured) {
            <div class="st-info-banner">
              <i class="pi pi-info-circle"></i>
              <p>
                @if (!rzpMode.testConfigured) { Test keys are not set on the server. }
                @if (!rzpMode.liveConfigured) { Live keys are not set on the server (Razorpay:Live in appsettings), so Live mode cannot be selected yet. }
              </p>
            </div>
          }
        </div>
      }
    </div>
  }

  <!-- ═══ SHIPPING (DELHIVERY) ══════════════════════════════════════ -->
  @if (activeTab === 'delhivery') {
    <div class="st-section-card">
      <div class="st-sc-head">
        <div class="st-sc-icon st-icon-blue"><i class="pi pi-send"></i></div>
        <div>
          <div class="st-sc-title">Delhivery Mode</div>
          <div class="st-sc-sub">Switch between the Delhivery test and live environments</div>
        </div>
      </div>

      @if (delhiveryLoading()) {
        <div class="st-sc-body"><p-skeleton width="100%" height="64px" styleClass="st-sk" /></div>
      }

      @if (!delhiveryLoading() && delhivery) {
        <div class="st-sc-body">
          <div class="st-toggle-card" [class.st-toggle-on]="delhivery.mode === 'live'">
            <div class="st-toggle-body">
              <div class="st-toggle-title">
                Current mode: {{ delhivery.mode === 'live' ? 'LIVE' : delhivery.mode === 'invalid' ? 'INVALID – DISABLED' : 'TEST' }}
              </div>
              <div class="st-toggle-sub">
                {{ delhivery.mode === 'live' ? 'Shipments use your real Delhivery account.' : delhivery.mode === 'invalid' ? 'Delhivery is switched off until you choose Test or Live.' : 'Test environment only. No real shipments.' }}
              </div>
            </div>
            <span>Test</span>
            <p-toggleswitch [ngModel]="delhivery.mode === 'live'" (ngModelChange)="changeDelhiveryMode($event)" [disabled]="savingDelhivery()" />
            <span>Live</span>
          </div>

          <div class="st-info-banner">
            <i class="pi pi-info-circle"></i>
            <p>
              Test credentials: <strong>{{ delhivery.testConfigured ? 'configured' : 'not configured' }}</strong> ·
              Live credentials: <strong>{{ delhivery.liveConfigured ? 'configured' : 'not configured' }}</strong><br />
              Pickup location: <strong>{{ delhivery.pickupLocation }}</strong><br />
              Automatic shipment creation: <strong>{{ delhivery.autoCreateShipment ? 'Enabled' : 'Disabled' }}</strong>
            </p>
          </div>

          @if (delhivery.configurationError) {
            <div class="st-info-banner">
              <i class="pi pi-exclamation-triangle"></i>
              <p>{{ delhivery.configurationError }}</p>
            </div>
          }

          @if (!delhivery.liveConfigured) {
            <div class="st-info-banner">
              <i class="pi pi-info-circle"></i>
              <p>The live API token is not set on the server, so Live mode cannot be selected yet.</p>
            </div>
          }
        </div>
      }
    </div>
  }

  <!-- ═══ SHIPPING ══════════════════════════════════════════════════ -->
  @if (activeTab === 'shipping') {
    <div class="st-section-card">
      <div class="st-sc-head">
        <div class="st-sc-icon st-icon-blue"><i class="pi pi-truck"></i></div>
        <div>
          <div class="st-sc-title">Shipping Settings</div>
          <div class="st-sc-sub">Delivery rates and thresholds</div>
        </div>
      </div>

      @if (shippingLoading()) {
        <div class="st-sc-body">
          @for (r of [1,2,3]; track r) {
            <p-skeleton width="100%" height="44px" styleClass="st-sk" />
          }
        </div>
      }

      @if (!shippingLoading()) {
        <form [formGroup]="shippingForm" (ngSubmit)="saveShipping()" class="st-sc-body">
          <div class="st-2col">
            <div class="st-field">
              <label class="st-label">Shipping Charge (₹)</label>
              <p class="st-hint">Flat delivery fee added to orders</p>
              <div class="st-input-wrap"><i class="pi pi-indian-rupee st-input-icon"></i><input pInputText formControlName="shippingCharge" type="number" class="st-inp st-inp-icon" placeholder="0"/></div>
            </div>
            <div class="st-field">
              <label class="st-label">Free Shipping Above (₹)</label>
              <p class="st-hint">Orders above this get free shipping</p>
              <div class="st-input-wrap"><i class="pi pi-indian-rupee st-input-icon"></i><input pInputText formControlName="freeShippingAbove" type="number" class="st-inp st-inp-icon" placeholder="0"/></div>
            </div>
          </div>

          <div class="st-field st-toggle-field">
            <div class="st-toggle-row">
              <div>
                <div class="st-label">Enable Free Shipping Threshold</div>
                <p class="st-hint">When enabled, orders above the threshold get free delivery</p>
              </div>
              <p-toggleswitch formControlName="freeShippingEnabled" />
            </div>
          </div>

          <div class="st-info-banner">
            <i class="pi pi-info-circle"></i>
            <p>Free shipping is applied automatically when cart total exceeds the threshold.</p>
          </div>

          <div class="st-form-footer">
            <button type="submit" class="st-save-btn" [disabled]="savingShipping()">
              <i [class]="savingShipping() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
              {{ savingShipping() ? 'Saving…' : 'Save Shipping Settings' }}
            </button>
          </div>
        </form>
      }
    </div>
  }

  <!-- ═══ TAX ══════════════════════════════════════════════════ -->
  @if (activeTab === 'tax') {
    <div class="st-section-card">
      <div class="st-sc-head">
        <div class="st-sc-icon st-icon-amber"><i class="pi pi-receipt"></i></div>
        <div>
          <div class="st-sc-title">Tax Settings</div>
          <div class="st-sc-sub">GST and tax configuration</div>
        </div>
      </div>

      @if (taxLoading()) {
        <div class="st-sc-body">
          @for (r of [1,2,3]; track r) {
            <p-skeleton width="100%" height="44px" styleClass="st-sk" />
          }
        </div>
      }

      @if (!taxLoading()) {
        <form [formGroup]="taxForm" (ngSubmit)="saveTax()" class="st-sc-body">
          <div class="st-2col">
            <div class="st-field">
              <label class="st-label">Tax Name</label>
              <div class="st-input-wrap"><i class="pi pi-tag st-input-icon"></i><input pInputText formControlName="taxName" class="st-inp st-inp-icon" placeholder="e.g. GST"/></div>
            </div>
            <div class="st-field">
              <label class="st-label">Default Tax (%)</label>
              <div class="st-input-wrap"><i class="pi pi-percentage st-input-icon"></i><input pInputText formControlName="taxPercentage" type="number" class="st-inp st-inp-icon" placeholder="18"/></div>
            </div>
          </div>

          <div class="st-field">
            <label class="st-label">Tax Registration Number</label>
            <div class="st-input-wrap"><i class="pi pi-id-card st-input-icon"></i><input pInputText formControlName="taxRegistrationNumber" class="st-inp st-inp-icon" placeholder="GSTIN…"/></div>
          </div>

          <label class="st-toggle-card" [class.st-toggle-on]="taxForm.get('taxIncluded')?.value">
            <div class="st-toggle-body">
              <div class="st-toggle-title">Prices include tax</div>
              <div class="st-toggle-sub">When enabled, product prices already include tax</div>
            </div>
            <p-toggleswitch formControlName="taxIncluded" />
          </label>

          <label class="st-toggle-card" [class.st-toggle-on]="taxForm.get('taxOnShipping')?.value">
            <div class="st-toggle-body">
              <div class="st-toggle-title">Apply tax on shipping</div>
              <div class="st-toggle-sub">Tax will be calculated on the shipping fee as well</div>
            </div>
            <p-toggleswitch formControlName="taxOnShipping" />
          </label>

          <div class="st-form-footer">
            <button type="submit" class="st-save-btn" [disabled]="savingTax()">
              <i [class]="savingTax() ? 'pi pi-spin pi-spinner' : 'pi pi-save'"></i>
              {{ savingTax() ? 'Saving…' : 'Save Tax Settings' }}
            </button>
          </div>
        </form>
      }
    </div>
  }


</div>
  `,
  styles: [`

/* ================================================================
   SETTINGS — ViewEncapsulation.None, all selectors .st-*
================================================================ */

.st-page { min-height: 100vh; background: #F6F8FA; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.st-page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.st-page-title  { font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; margin: 0; }
.st-page-sub    { font-size: 13px; color: #64748B; margin: 2px 0 0; }

/* Tab nav */
.st-tab-nav { display: flex; gap: 2px; background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 12px; padding: 4px; width: fit-content; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
.st-tab-btn { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border-radius: 8px; border: none; background: none; font-size: 12.5px; font-weight: 600; color: #64748B; cursor: pointer; transition: background 0.13s,color 0.13s; }
.st-tab-btn .pi { font-size: 13px; }
.st-tab-btn:hover:not(.st-tab-active) { background: #F1F5F9; color: #0F172A; }
.st-tab-active { background: #0F766E !important; color: #fff !important; }

/* Section card */
.st-section-card { background: rgba(255,255,255,0.88); border: 1px solid rgba(226,232,240,0.9); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.04); }
.st-sc-head { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.st-sc-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.st-icon-teal  { background: #F0FDFA; color: #0F766E; }
.st-icon-blue  { background: #EFF6FF; color: #2563EB; }
.st-icon-amber { background: #FFFBEB; color: #D97706; }
.st-sc-title { font-size: 14px; font-weight: 700; color: #0F172A; }
.st-sc-sub   { font-size: 11.5px; color: #64748B; margin-top: 1px; }
.st-sc-body  { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
.st-sk { display: block; border-radius: 8px !important; }

/* Fields */
.st-field { display: flex; flex-direction: column; gap: 5px; }
.st-2col  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.st-label { font-size: 10.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; }
.st-hint  { font-size: 11px; color: #94A3B8; margin: 0; }
.st-input-wrap { position: relative; display: flex; align-items: center; border: 1px solid #E2E8F0; border-radius: 8px; background: #fff; transition: border-color 0.15s,box-shadow 0.15s; }
.st-input-wrap:focus-within { border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15,118,110,0.10); }
.st-input-icon { position: absolute; left: 10px; font-size: 12px; color: #94A3B8; pointer-events: none; }
.st-inp { width: 100%; height: 36px; border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; font-size: 13px !important; color: #0F172A !important; padding: 0 10px !important; border-radius: 8px !important; }
.st-inp:focus { border: none !important; outline: none !important; box-shadow: none !important; }
.st-inp-icon { padding-left: 30px !important; }
.st-select-wrap { padding: 0 !important; overflow: hidden; }
.st-sel { width: 100% !important; }
.st-sel.p-select { border: none !important; box-shadow: none !important; background: transparent !important; height: 36px !important; font-size: 13px !important; padding-left: 28px !important; border-radius: 8px !important; }
.st-sel.p-select:focus-within { border: none !important; box-shadow: none !important; }
.st-textarea { width: 100% !important; box-sizing: border-box; resize: vertical; padding: 9px 11px !important; font-size: 13px !important; color: #0F172A !important; border: 1px solid #E2E8F0 !important; border-radius: 8px !important; background: #fff !important; line-height: 1.6; box-shadow: none !important; outline: none !important; font-family: inherit !important; }
.st-textarea:focus { border-color: #0F766E !important; box-shadow: 0 0 0 3px rgba(15,118,110,0.10) !important; }
.st-logo-preview { margin-top: 8px; padding: 8px; border: 1px solid #E2E8F0; border-radius: 8px; background: #F8FAFC; display: inline-block; }
.st-logo-img { max-height: 52px; max-width: 180px; object-fit: contain; display: block; }

/* Toggle row (inline label + switch) */
.st-toggle-field { padding: 10px 0; }
.st-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: #F8FAFC; }
.st-toggle-row .st-label { margin-bottom: 2px; }
.st-toggle-row .st-hint { margin: 0; }

/* Toggle cards */
.st-toggle-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: #F8FAFC; cursor: pointer; user-select: none; transition: border-color 0.15s,background 0.15s; }
.st-toggle-on   { border-color: #BBFFD9; background: #F0FDF9; }
.st-toggle-body { flex: 1; }
.st-toggle-title { font-size: 13px; font-weight: 600; color: #0F172A; }
.st-toggle-sub   { font-size: 11px; color: #94A3B8; margin-top: 2px; }

/* Info banner */
.st-info-banner { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; color: #1D4ED8; font-size: 12.5px; }
.st-info-banner .pi { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.st-info-banner p { margin: 0; line-height: 1.5; }

/* Footer */
.st-form-footer { display: flex; justify-content: flex-end; padding-top: 4px; }
.st-save-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 18px; border-radius: 8px; border: none; background: #0F766E; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 4px rgba(15,118,110,0.25); }
.st-save-btn:hover:not(:disabled) { background: #115E59; }
.st-save-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.st-save-btn .pi { font-size: 12px; }

@media (max-width: 640px) {
  .st-tab-nav { overflow-x: auto; width: 100%; box-sizing: border-box; }
  .st-2col { grid-template-columns: 1fr; }
}

  `]
})
export class AdminSettingsComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(MessageService);
  private fb    = inject(FormBuilder);

  activeTab: 'general' | 'shipping' | 'delhivery' | 'tax' | 'payment' = 'general';

  tabs = [
    { key: 'general',  label: 'General',  icon: 'pi-shop'    },
    { key: 'shipping', label: 'Shipping', icon: 'pi-truck'   },
    { key: 'delhivery', label: 'Shipping (Delhivery)', icon: 'pi-send' },
    { key: 'tax',      label: 'Tax',      icon: 'pi-receipt' },
    { key: 'payment',  label: 'Payment',  icon: 'pi-credit-card' },
  ];

  currencyOptions = [
    { label: 'INR (₹)', value: 'INR' },
    { label: 'USD ($)', value: 'USD' },
    { label: 'EUR (€)', value: 'EUR' },
  ];

  generalLoading  = signal(true);
  shippingLoading = signal(false);
  taxLoading      = signal(false);
  savingGeneral   = signal(false);
  savingShipping  = signal(false);
  savingTax       = signal(false);

  private shippingLoaded = false;
  private taxLoaded      = false;
  private paymentLoaded  = false;

  paymentLoading = signal(false);
  savingPayment  = signal(false);

  private delhiveryLoaded = false;
  delhiveryLoading = signal(false);
  savingDelhivery  = signal(false);
  delhivery: { mode: 'test' | 'live' | 'invalid'; configurationError?: string | null; testConfigured: boolean; liveConfigured: boolean; pickupLocation: string; autoCreateShipment: boolean } | null = null;
  rzpMode: { mode: 'test' | 'live' | 'invalid'; configurationError?: string | null; keyId: string | null; testConfigured: boolean; liveConfigured: boolean } | null = null;

  generalForm = this.fb.group({
    siteName: [''], siteDescription: [''], supportEmail: [''],
    supportPhone: [''], currency: ['INR'], logoUrl: [''], address: ['']
  });

  shippingForm = this.fb.group({
    shippingCharge: [0], freeShippingAbove: [0], freeShippingEnabled: [false]
  });

  taxForm = this.fb.group({
    taxName: ['GST'], taxPercentage: [18],
    taxRegistrationNumber: [''], taxIncluded: [false], taxOnShipping: [false]
  });

  ngOnInit(): void { this.loadGeneral(); }

  setTab(key: string): void {
    this.activeTab = key as 'general' | 'shipping' | 'delhivery' | 'tax' | 'payment';
    if (key === 'shipping' && !this.shippingLoaded) this.loadShipping();
    if (key === 'tax'      && !this.taxLoaded)      this.loadTax();
    if (key === 'payment'  && !this.paymentLoaded)  this.loadPayment();
    if (key === 'delhivery' && !this.delhiveryLoaded) this.loadDelhivery();
  }

  loadGeneral(): void {
    this.generalLoading.set(true);
    this.api.get<any>('settings/website').subscribe({
      next: res => { if (res.data) this.generalForm.patchValue(res.data); this.generalLoading.set(false); },
      error: () => this.generalLoading.set(false)
    });
  }

  loadShipping(): void {
    this.shippingLoading.set(true);
    this.api.get<any>('settings/shipping').subscribe({
      next: res => { if (res.data) this.shippingForm.patchValue(res.data); this.shippingLoading.set(false); this.shippingLoaded = true; },
      error: () => this.shippingLoading.set(false)
    });
  }

  loadTax(): void {
    this.taxLoading.set(true);
    this.api.get<any>('settings/tax').subscribe({
      next: res => { if (res.data) this.taxForm.patchValue(res.data); this.taxLoading.set(false); this.taxLoaded = true; },
      error: () => this.taxLoading.set(false)
    });
  }

  loadPayment(): void {
    this.paymentLoading.set(true);
    this.api.get<any>('payments/razorpay/mode').subscribe({
      next: res => { this.rzpMode = res.data ?? null; this.paymentLoading.set(false); this.paymentLoaded = true; },
      error: () => this.paymentLoading.set(false)
    });
  }

  loadDelhivery(): void {
    this.delhiveryLoading.set(true);
    this.api.get<any>('shipments/delhivery/mode').subscribe({
      next: res => { this.delhivery = res.data ?? null; this.delhiveryLoading.set(false); this.delhiveryLoaded = true; },
      error: () => this.delhiveryLoading.set(false)
    });
  }

  changeDelhiveryMode(live: boolean): void {
    const mode = live ? 'live' : 'test';
    if (live && !window.confirm('Switch Delhivery to LIVE mode? Shipments will be created in your real Delhivery account and billed to its wallet.')) {
      this.loadDelhivery();      // put the toggle back
      return;
    }
    this.savingDelhivery.set(true);
    this.api.put<any>('shipments/delhivery/mode', { mode }).subscribe({
      next: res => {
        this.savingDelhivery.set(false);
        if (res.success) { this.delhivery = res.data; this.toast.add({ severity: 'success', summary: 'Saved', detail: res.message, life: 2500 }); }
      },
      error: err => {
        this.savingDelhivery.set(false);
        this.loadDelhivery();    // show the mode that is actually active
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Could not change the Delhivery mode', life: 4000 });
      }
    });
  }

  changeRzpMode(live: boolean): void {
    const mode = live ? 'live' : 'test';
    if (live && !window.confirm('Switch to LIVE mode? Customers will be charged real money.')) return;
    this.savingPayment.set(true);
    this.api.put<any>('payments/razorpay/mode', { mode }).subscribe({
      next: res => {
        this.savingPayment.set(false);
        if (res.success) { this.rzpMode = res.data; this.toast.add({ severity: 'success', summary: 'Saved', detail: res.message, life: 2500 }); }
      },
      error: err => {
        this.savingPayment.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Could not change payment mode', life: 3500 });
      }
    });
  }

  saveGeneral(): void {
    this.savingGeneral.set(true);
    this.api.put('settings/website', this.generalForm.value).subscribe({
      next: () => { this.savingGeneral.set(false); this.toast.add({ severity: 'success', summary: 'Saved', detail: 'General settings saved', life: 2500 }); },
      error: () => { this.savingGeneral.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings', life: 3000 }); }
    });
  }

  saveShipping(): void {
    this.savingShipping.set(true);
    this.api.put('settings/shipping', this.shippingForm.value).subscribe({
      next: () => { this.savingShipping.set(false); this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Shipping settings saved', life: 2500 }); },
      error: () => { this.savingShipping.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings', life: 3000 }); }
    });
  }

  saveTax(): void {
    this.savingTax.set(true);
    this.api.put('settings/tax', this.taxForm.value).subscribe({
      next: () => { this.savingTax.set(false); this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Tax settings saved', life: 2500 }); },
      error: () => { this.savingTax.set(false); this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings', life: 3000 }); }
    });
  }

}
