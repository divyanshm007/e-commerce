import { Component, OnInit, inject, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf, NgClass, CurrencyPipe, DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardService } from '../../core/services/dashboard.service';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

/* ── Types ── */
interface DStats {
  totalOrders: number; totalCustomers: number; totalProducts: number;
  totalCategories: number; totalRevenue: number; todayRevenue: number;
  todayOrders: number; pendingOrders: number; deliveredOrders: number;
  cancelledOrders: number; returnedOrders: number; lowStockProducts: number;
  abandonedCarts: number;
  visitors: { totalVisitors: number; guestVisitors: number; registeredUsers: number;
    todayVisitors: number; weeklyVisitors: number; monthlyVisitors: number; };
}
interface ChartPt  { label: string; revenue: number; orders: number; }
interface Seller   { productId: string; productName: string; imageUrl?: string; soldCount: number; revenue: number; }
interface LowStock { productId: string; productName: string; imageUrl?: string; stockQuantity: number; lowStockThreshold: number; }
interface ROrder   { id: string; orderNumber: string; customerName?: string; customerEmail?: string; totalAmount: number; status: string; createdAt: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, NgFor, NgIf, NgClass, CurrencyPipe, DatePipe, DecimalPipe, PercentPipe, TooltipModule, MediaUrlPipe],
  template: `
  <div class="db-page">

    <!-- ══ PAGE HEADER ══════════════════════════════════════ -->
    <div class="db-page-head">
      <div class="db-head-left">
        <h1 class="db-page-title">Welcome back, {{ userName }}!</h1>
        <p class="db-page-sub">Here's what's happening with your store today.</p>
      </div>
      <div class="db-head-actions">
        <div class="db-date-chip">
          <i class="pi pi-calendar"></i>
          <span>{{ today }}</span>
        </div>
        <button class="db-refresh-btn" (click)="refresh()" [class.db-spinning]="refreshing"
          pTooltip="Refresh dashboard" tooltipPosition="bottom">
          <i class="pi pi-refresh"></i>
        </button>
        <a class="db-reports-btn" routerLink="/admin/reports">
          <i class="pi pi-chart-bar"></i> <span>View Reports</span>
        </a>
      </div>
    </div>

    <!-- ══ KPI CARDS ═══════════════════════════════════════ -->
    <section class="db-kpi-grid">
      <ng-container *ngIf="statsLoading">
        <div class="db-kpi-skeleton db-skeleton" *ngFor="let i of [1,2,3,4,5,6,7,8]"></div>
      </ng-container>

      <div class="db-section-error db-kpi-error" *ngIf="statsError && !statsLoading">
        <i class="pi pi-exclamation-circle"></i>
        <span>Could not load stats</span>
        <button (click)="loadStats()">Retry</button>
      </div>

      <ng-container *ngIf="!statsLoading && !statsError && stats()">
        <div class="db-kpi-card" [style.border-top-color]="c.color" *ngFor="let c of kpiCards">
          <div class="db-kpi-icon" [style.background]="c.iconBg">
            <i [class]="'pi ' + c.icon" [style.color]="c.color"></i>
          </div>
          <p class="db-kpi-value">
            <span *ngIf="c.format==='currency'">{{ c.value | currency:'INR':'symbol':'1.0-0' }}</span>
            <span *ngIf="c.format==='number'">{{ c.value | number }}</span>
          </p>
          <p class="db-kpi-label">{{ c.label }}</p>
        </div>
      </ng-container>
    </section>

    <!-- ══ SALES CHART + BEST SELLERS ═══════════════════════ -->
    <section class="db-main-row">

      <!-- Sales Chart -->
      <div class="db-card db-chart-card">
        <div class="db-card-head">
          <div>
            <h3 class="db-card-title">Sales Overview</h3>
            <p class="db-card-sub">Revenue and orders performance</p>
          </div>
          <div class="db-period-toggle">
            <button class="db-period-btn" [class.db-active]="chartPeriod()==='weekly'" (click)="setPeriod('weekly')">Weekly</button>
            <button class="db-period-btn" [class.db-active]="chartPeriod()==='monthly'" (click)="setPeriod('monthly')">Monthly</button>
          </div>
        </div>

        <div class="db-chart-skeleton db-skeleton" *ngIf="chartLoading"></div>

        <div class="db-section-error" *ngIf="chartError && !chartLoading">
          <i class="pi pi-wifi"></i>
          <span>Could not load chart data</span>
          <button (click)="loadChart()">Retry</button>
        </div>

        <ng-container *ngIf="!chartLoading && !chartError && chartData().length">
          <div class="db-chart-summary">
            <div class="db-cs-item">
              <span class="db-cs-val">{{ totalChartRevenue | currency:'INR':'symbol':'1.0-0' }}</span>
              <span class="db-cs-lbl">Total Revenue</span>
            </div>
            <div class="db-cs-item">
              <span class="db-cs-val">{{ avgChartRevenue | currency:'INR':'symbol':'1.0-0' }}</span>
              <span class="db-cs-lbl">Avg Daily Revenue</span>
            </div>
            <div class="db-cs-item">
              <span class="db-cs-val">{{ totalChartOrders | number }}</span>
              <span class="db-cs-lbl">Total Orders</span>
            </div>
            <div class="db-cs-item">
              <span class="db-cs-val">{{ avgOrderValue | currency:'INR':'symbol':'1.0-0' }}</span>
              <span class="db-cs-lbl">Avg Order Value</span>
            </div>
          </div>

          <div class="db-chart-wrap" (mouseleave)="hovIdx=-1">
            <svg [attr.viewBox]="'0 0 760 170'" preserveAspectRatio="none" class="db-chart-svg">
              <defs>
                <linearGradient id="dbRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0F766E" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#0F766E" stop-opacity="0.02"/>
                </linearGradient>
              </defs>
              <line *ngFor="let g of gridLines" [attr.x1]="24" [attr.y1]="g" [attr.x2]="746" [attr.y2]="g"
                stroke="#CCFBF1" stroke-width="1"/>
              <path [attr.d]="chartAreaPath" fill="url(#dbRevGrad)" />
              <path [attr.d]="chartLinePath" fill="none" stroke="#0F766E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <g *ngFor="let pt of chartPoints; let i=index">
                <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="5"
                  fill="white" stroke="#0F766E" stroke-width="2.5"
                  [class.db-dot-hover]="hovIdx===i"/>
                <text [attr.x]="pt.x" y="165" text-anchor="middle" font-size="10" fill="#94A3B8">{{ chartData()[i].label }}</text>
              </g>
            </svg>
            <div class="db-hover-strips">
              <div class="db-hover-strip" *ngFor="let pt of chartPoints; let i=index"
                (mouseenter)="hovIdx=i"
                [style.left.%]="(i / (chartPoints.length - 1)) * 100"
                [style.transform]="'translateX(-50%)'">
                <div class="db-chart-tooltip" *ngIf="hovIdx===i">
                  <p class="db-tt-label">{{ chartData()[i].label }}</p>
                  <p class="db-tt-rev">{{ chartData()[i].revenue | currency:'INR':'symbol':'1.0-0' }}</p>
                  <p class="db-tt-ord">{{ chartData()[i].orders }} orders</p>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <div class="db-empty-chart" *ngIf="!chartLoading && !chartError && !chartData().length">
          <i class="pi pi-chart-line"></i>
          <p>No sales data available for this period.</p>
        </div>
      </div>

      <!-- Best Sellers -->
      <div class="db-card db-sellers-card">
        <div class="db-card-head">
          <div>
            <h3 class="db-card-title">Top Products</h3>
            <p class="db-card-sub">Best selling this period</p>
          </div>
          <a routerLink="/admin/products" class="db-view-all">View All →</a>
        </div>

        <div class="db-sellers-skeleton db-skeleton" *ngIf="sellersLoading"></div>

        <div class="db-section-error" *ngIf="sellersError && !sellersLoading">
          <i class="pi pi-exclamation-circle"></i><span>Could not load</span>
          <button (click)="loadSellers()">Retry</button>
        </div>

        <div class="db-sellers-list" *ngIf="!sellersLoading && !sellersError">
          <div class="db-seller-row" *ngFor="let p of bestSellers(); let i=index">
            <div class="db-seller-rank" [ngClass]="rankClass(i)">{{ i+1 }}</div>
            <img [src]="(p.imageUrl || 'assets/images/no-image.png') | mediaUrl" [alt]="p.productName" class="db-seller-img" loading="lazy"/>
            <div class="db-seller-body">
              <p class="db-seller-name">{{ p.productName }}</p>
              <div class="db-seller-bar-track">
                <div class="db-seller-bar-fill" [style.width.%]="sellerBarPct(p.soldCount)"></div>
              </div>
              <div class="db-seller-foot">
                <span class="db-seller-sold">{{ p.soldCount }} sold</span>
                <span class="db-seller-rev">{{ p.revenue | currency:'INR':'symbol':'1.0-0' }}</span>
              </div>
            </div>
          </div>
          <div class="db-empty" *ngIf="!bestSellers().length && !sellersLoading">
            <i class="pi pi-box"></i>
            <h3>No sales yet</h3>
            <p>Best sellers will appear here once orders are placed.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ ANALYTICS ROW ════════════════════════════════════ -->
    <section class="db-analytics-row">

      <!-- Order Status Donut -->
      <div class="db-card">
        <div class="db-card-head">
          <h3 class="db-card-title">Order Status</h3>
        </div>
        <div class="db-donut-skeleton db-skeleton" *ngIf="statsLoading"></div>
        <ng-container *ngIf="!statsLoading && !statsError && stats()">
          <div class="db-donut-wrap">
            <svg viewBox="0 0 160 160" class="db-donut-svg">
              <circle cx="80" cy="80" r="60" fill="none" stroke="#F0FDF9" stroke-width="24"/>
              <circle *ngFor="let seg of donutSegments"
                cx="80" cy="80" r="60" fill="none"
                [attr.stroke]="seg.color"
                stroke-width="22"
                [attr.stroke-dasharray]="seg.dash + ' ' + seg.gap"
                [attr.transform]="'rotate(' + seg.startDeg + ' 80 80)'"
                stroke-linecap="butt"/>
              <text x="80" y="75" text-anchor="middle" font-size="20" font-weight="800" fill="#0F172A">{{ stats()!.totalOrders | number }}</text>
              <text x="80" y="92" text-anchor="middle" font-size="10" fill="#94A3B8">Total Orders</text>
            </svg>
            <div class="db-donut-legend">
              <div class="db-legend-row" *ngFor="let seg of donutSegments">
                <span class="db-legend-dot" [style.background]="seg.color"></span>
                <span class="db-legend-label">{{ seg.label }}</span>
                <span class="db-legend-count">{{ seg.count | number }}</span>
                <span class="db-legend-pct">{{ seg.pct | percent:'1.1-1' }}</span>
              </div>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- Visitor Stats -->
      <div class="db-card">
        <div class="db-card-head">
          <h3 class="db-card-title">Visitor Insights</h3>
        </div>
        <div class="db-donut-skeleton db-skeleton" *ngIf="statsLoading"></div>
        <ng-container *ngIf="!statsLoading && !statsError && stats()">
          <div class="db-visitor-grid">
            <div class="db-vstat" *ngFor="let v of visitorStats">
              <div class="db-vstat-icon" [style.background]="v.bg">
                <i [class]="'pi ' + v.icon"></i>
              </div>
              <p class="db-vstat-val">{{ v.value | number }}</p>
              <p class="db-vstat-lbl">{{ v.label }}</p>
            </div>
          </div>
          <div class="db-vbar-section">
            <p class="db-vbar-title">Registered vs Guests</p>
            <div class="db-vbar-track">
              <div class="db-vbar-reg" [style.width.%]="registeredPct"></div>
              <div class="db-vbar-guest" [style.width.%]="guestPct"></div>
            </div>
            <div class="db-vbar-labels">
              <span><span class="db-vbar-dot db-reg"></span>Registered ({{ registeredPct | number:'1.0-0' }}%)</span>
              <span><span class="db-vbar-dot db-guest"></span>Guests ({{ guestPct | number:'1.0-0' }}%)</span>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- Store Pulse -->
      <div class="db-card">
        <div class="db-card-head">
          <h3 class="db-card-title">Store Pulse</h3>
        </div>
        <div class="db-donut-skeleton db-skeleton" *ngIf="statsLoading"></div>
        <ng-container *ngIf="!statsLoading && !statsError && stats()">
          <div class="db-quick-stats">
            <div class="db-qstat" *ngFor="let q of quickStats">
              <div class="db-qstat-icon" [style.background]="q.iconBg">
                <i [class]="'pi ' + q.icon" [style.color]="q.color"></i>
              </div>
              <div>
                <p class="db-qstat-val">{{ q.value | number }}</p>
                <p class="db-qstat-lbl">{{ q.label }}</p>
              </div>
            </div>
          </div>
        </ng-container>
      </div>
    </section>

    <!-- ══ OPERATIONS ROW ════════════════════════════════════ -->
    <section class="db-ops-row">

      <!-- Recent Orders -->
      <div class="db-card">
        <div class="db-card-head">
          <div>
            <h3 class="db-card-title">Recent Orders</h3>
            <p class="db-card-sub">Latest {{ recentOrders().length }} transactions</p>
          </div>
          <a routerLink="/admin/orders" class="db-view-all">View All →</a>
        </div>

        <div class="db-table-skeleton db-skeleton" *ngIf="ordersLoading"></div>

        <div class="db-section-error" *ngIf="ordersError && !ordersLoading">
          <i class="pi pi-exclamation-circle"></i><span>Could not load orders</span>
          <button (click)="loadOrders()">Retry</button>
        </div>

        <div class="db-table-scroll" *ngIf="!ordersLoading && !ordersError">
          <table class="db-table" *ngIf="recentOrders().length">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of recentOrders()">
                <td>
                  <a [routerLink]="['/admin/orders', o.id]" class="db-order-link">
                    #{{ o.orderNumber }}
                  </a>
                </td>
                <td>
                  <div class="db-cust-cell">
                    <div class="db-cust-avatar">{{ (o.customerName || o.customerEmail || 'G')[0].toUpperCase() }}</div>
                    <span class="db-cust-name">{{ o.customerName || o.customerEmail || 'Guest' }}</span>
                  </div>
                </td>
                <td class="db-date-cell">{{ o.createdAt | date:'dd MMM, HH:mm' }}</td>
                <td class="db-amount-cell">{{ o.totalAmount | currency:'INR':'symbol':'1.0-0' }}</td>
                <td>
                  <span class="db-badge" [ngClass]="orderStatusClass(o.status)">{{ o.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="db-empty" *ngIf="!recentOrders().length">
            <i class="pi pi-file-check"></i>
            <h3>No recent orders</h3>
            <p>Orders will appear here once customers start purchasing.</p>
          </div>
        </div>
      </div>

      <!-- Low Stock -->
      <div class="db-card">
        <div class="db-card-head">
          <div>
            <h3 class="db-card-title">
              <i class="pi pi-exclamation-triangle db-warn-icon"></i>
              Low Stock
            </h3>
            <p class="db-card-sub" *ngIf="lowStock().length">{{ lowStock().length }} product(s) need restocking</p>
          </div>
          <a routerLink="/admin/products" class="db-view-all">Manage →</a>
        </div>

        <div class="db-sellers-skeleton db-skeleton" *ngIf="stockLoading"></div>

        <div class="db-section-error" *ngIf="stockError && !stockLoading">
          <i class="pi pi-exclamation-circle"></i><span>Could not load</span>
          <button (click)="loadStock()">Retry</button>
        </div>

        <ng-container *ngIf="!stockLoading && !stockError">
          <div class="db-stock-list" *ngIf="lowStock().length">
            <div class="db-stock-row" *ngFor="let p of lowStock()">
              <img [src]="(p.imageUrl || 'assets/images/no-image.png') | mediaUrl" [alt]="p.productName" class="db-stock-img" loading="lazy"/>
              <div class="db-stock-body">
                <p class="db-stock-name">{{ p.productName }}</p>
                <div class="db-stock-bar-track">
                  <div class="db-stock-bar-fill"
                    [style.width.%]="stockBarPct(p.stockQuantity, p.lowStockThreshold)"
                    [style.background]="p.stockQuantity <= 3 ? '#DC2626' : '#D97706'">
                  </div>
                </div>
                <div class="db-stock-foot">
                  <span class="db-stock-qty" [ngClass]="p.stockQuantity <= 3 ? 'db-critical' : 'db-low'">
                    {{ p.stockQuantity }} left
                  </span>
                  <span class="db-stock-threshold">min: {{ p.lowStockThreshold }}</span>
                </div>
              </div>
              <a [routerLink]="['/admin/products', p.productId, 'edit']" class="db-restock-btn"
                pTooltip="Update stock" tooltipPosition="left">
                <i class="pi pi-plus-circle"></i>
              </a>
            </div>
          </div>
          <div class="db-all-stocked" *ngIf="!lowStock().length">
            <i class="pi pi-check-circle db-stocked-icon"></i>
            <p>All products are sufficiently stocked.</p>
          </div>
        </ng-container>
      </div>
    </section>

  </div>
  `,
  styles: [`
    /* ── Page ── */
    .db-page { padding: 20px; }

    /* ── Page Header ── */
    .db-page-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
    }
    .db-page-title {
      font-size: 22px; font-weight: 700; color: #0F172A;
      letter-spacing: -0.3px; margin: 0 0 3px;
    }
    .db-page-sub { font-size: 13px; color: #64748B; font-weight: 400; margin: 0; }
    .db-head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .db-date-chip {
      display: flex; align-items: center; gap: 6px;
      background: #fff; border: 1px solid #E2E8F0; border-radius: 8px;
      padding: 6px 12px; font-size: 12.5px; color: #0F172A; font-weight: 500;
    }
    .db-date-chip .pi { font-size: 14px; color: #0F766E; }

    .db-refresh-btn {
      width: 32px; height: 32px; border: 1px solid #E2E8F0; border-radius: 7px;
      background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .db-refresh-btn .pi { font-size: 16px; color: #64748B; transition: transform 0.6s; }
    .db-refresh-btn:hover { background: #F0FDF9; }
    .db-refresh-btn.db-spinning .pi { animation: db-spin 0.8s linear infinite; }
    @keyframes db-spin { to { transform: rotate(360deg); } }

    .db-reports-btn {
      display: flex; align-items: center; gap: 6px; background: #0F766E; color: #fff;
      border: none; border-radius: 8px; padding: 7px 14px; font-size: 12.5px; font-weight: 600;
      cursor: pointer; text-decoration: none; transition: background 0.15s; font-family: inherit;
    }
    .db-reports-btn .pi { font-size: 14px; }
    .db-reports-btn:hover { background: #0F5C4D; }

    /* ── KPI Grid ── */
    .db-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .db-kpi-skeleton { height: 130px; border-radius: 14px; }
    .db-kpi-error { grid-column: 1 / -1; }

    .db-kpi-card {
      background: rgba(255,255,255,0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(226,232,240,0.85); border-top: 3px solid #0F766E;
      border-radius: 14px; min-height: 130px; padding: 16px;
      box-shadow: 0 2px 8px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.07);
      transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; gap: 8px;
    }
    .db-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(15,23,42,0.1), 0 12px 32px rgba(15,23,42,0.1); }

    .db-kpi-icon {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
    }
    .db-kpi-icon .pi { font-size: 16px; }
    .db-kpi-value { font-size: 26px; font-weight: 700; color: #0F172A; letter-spacing: -0.5px; margin: 0; line-height: 1; }
    .db-kpi-label { font-size: 10.5px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }

    /* ── Card base ── */
    .db-card {
      background: rgba(255,255,255,0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(226,232,240,0.9); border-radius: 14px;
      box-shadow: 0 4px 16px rgba(15,23,42,0.035); padding: 20px 22px; overflow: hidden;
    }

    /* ── Card head ── */
    .db-card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 8px; }
    .db-card-title { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 3px; display: flex; align-items: center; gap: 6px; }
    .db-card-sub { font-size: 11.5px; color: #94A3B8; margin: 0; }
    .db-view-all {
      font-size: 12px; font-weight: 600; color: #0F766E; text-decoration: none;
      padding: 4px 10px; border-radius: 6px; transition: background 0.15s; white-space: nowrap;
    }
    .db-view-all:hover { background: #F0FDF9; }

    /* ── Main Row ── */
    .db-main-row { display: grid; grid-template-columns: 1fr 340px; gap: 14px; margin-bottom: 14px; align-items: start; }

    /* Chart */
    .db-chart-skeleton { height: 220px; border-radius: 10px; margin-top: 8px; }
    .db-chart-summary {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
      margin-bottom: 18px; padding: 12px; background: #F0FDF9;
      border-radius: 10px; border: 1px solid #CCFBF1;
    }
    .db-cs-item { text-align: center; }
    .db-cs-val { display: block; font-size: 15px; font-weight: 700; color: #0F172A; line-height: 1; margin-bottom: 3px; }
    .db-cs-lbl { font-size: 10.5px; color: #94A3B8; font-weight: 500; }

    .db-chart-wrap { position: relative; padding-bottom: 8px; }
    .db-chart-svg { width: 100%; height: 175px; display: block; overflow: visible; }
    .db-dot-hover { r: 7; }
    .db-hover-strips { position: absolute; top: 0; left: 0; right: 0; bottom: 28px; pointer-events: none; }
    .db-hover-strip { position: absolute; top: 0; bottom: 0; width: 40px; transform: translateX(-50%); pointer-events: all; cursor: crosshair; }
    .db-chart-tooltip {
      position: absolute; top: -4px; left: 50%; transform: translateX(-50%) translateY(-100%);
      background: #0F172A; border-radius: 8px; padding: 8px 12px; white-space: nowrap;
      z-index: 20; pointer-events: none; box-shadow: 0 4px 16px rgba(15,23,42,0.3);
    }
    .db-chart-tooltip::after {
      content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: #0F172A;
    }
    .db-tt-label { font-size: 10px; color: #94A3B8; margin: 0 0 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .db-tt-rev { font-size: 14px; color: #fff; font-weight: 700; margin: 0 0 2px; }
    .db-tt-ord { font-size: 11px; color: rgba(255,255,255,0.6); margin: 0; }
    .db-empty-chart {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 160px; gap: 8px; color: #94A3B8;
    }
    .db-empty-chart .pi { font-size: 36px; color: #CCFBF1; }
    .db-empty-chart p { font-size: 13px; margin: 0; }

    /* Period toggle */
    .db-period-toggle {
      display: flex; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background: #F8FAFC;
    }
    .db-period-btn {
      padding: 5px 12px; border: none; background: transparent; font-size: 12px; font-weight: 600;
      color: #64748B; cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .db-period-btn.db-active { background: #0F766E; color: #fff; }
    .db-period-btn:hover:not(.db-active) { background: #F0FDF9; color: #0F5C4D; }

    /* Best Sellers */
    .db-sellers-skeleton { height: 280px; border-radius: 10px; }
    .db-sellers-list { display: flex; flex-direction: column; gap: 12px; }
    .db-seller-row { display: flex; align-items: center; gap: 10px; }
    .db-seller-rank {
      width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0;
      background: #F0FDF9; color: #0F766E;
    }
    .db-seller-rank.gold { background: #FEFCE8; color: #92400E; }
    .db-seller-rank.silver { background: #F1F5F9; color: #374151; }
    .db-seller-rank.bronze { background: #FFF7ED; color: #9A3412; }
    .db-seller-img { width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid #E2E8F0; }
    .db-seller-body { flex: 1; min-width: 0; }
    .db-seller-name { font-size: 12px; font-weight: 600; color: #0F172A; margin: 0 0 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .db-seller-bar-track { height: 4px; background: #F0FDF9; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
    .db-seller-bar-fill { height: 100%; background: linear-gradient(90deg, #0F766E, #2DD4BF); border-radius: 4px; transition: width 0.6s ease; }
    .db-seller-foot { display: flex; justify-content: space-between; }
    .db-seller-sold { font-size: 10.5px; color: #94A3B8; }
    .db-seller-rev { font-size: 10.5px; color: #0F766E; font-weight: 600; }

    /* ── Analytics Row ── */
    .db-analytics-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 14px; align-items: start; }
    .db-donut-skeleton { height: 180px; border-radius: 10px; }
    .db-donut-wrap { display: flex; align-items: center; gap: 18px; }
    .db-donut-svg { width: 120px; height: 120px; flex-shrink: 0; }
    .db-donut-legend { flex: 1; display: flex; flex-direction: column; gap: 7px; }
    .db-legend-row { display: flex; align-items: center; gap: 6px; font-size: 11.5px; }
    .db-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .db-legend-label { flex: 1; color: #0F172A; font-weight: 500; }
    .db-legend-count { color: #0F172A; font-weight: 700; }
    .db-legend-pct { color: #94A3B8; font-size: 10.5px; min-width: 34px; text-align: right; }

    /* Visitor stats */
    .db-visitor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
    .db-vstat {
      background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;
      padding: 10px; text-align: center;
    }
    .db-vstat-icon {
      width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center;
      justify-content: center; margin: 0 auto 7px;
    }
    .db-vstat-icon .pi { font-size: 14px; color: #fff; }
    .db-vstat-val { font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
    .db-vstat-lbl { font-size: 10px; color: #94A3B8; margin: 0; }
    .db-vbar-title { font-size: 11px; color: #64748B; font-weight: 600; margin: 0 0 7px; }
    .db-vbar-track { display: flex; height: 7px; border-radius: 7px; overflow: hidden; background: #F0FDF9; }
    .db-vbar-reg { background: #0F766E; border-radius: 7px 0 0 7px; transition: width 0.5s; }
    .db-vbar-guest { background: #60A5FA; border-radius: 0 7px 7px 0; transition: width 0.5s; }
    .db-vbar-labels { display: flex; justify-content: space-between; margin-top: 5px; font-size: 10.5px; color: #64748B; }
    .db-vbar-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 3px; vertical-align: middle; }
    .db-vbar-dot.db-reg { background: #0F766E; }
    .db-vbar-dot.db-guest { background: #60A5FA; }
    .db-vbar-section { }

    /* Quick stats */
    .db-quick-stats { display: flex; flex-direction: column; gap: 8px; }
    .db-qstat {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;
    }
    .db-qstat-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .db-qstat-icon .pi { font-size: 16px; }
    .db-qstat-val { font-size: 17px; font-weight: 700; color: #0F172A; margin: 0 0 1px; }
    .db-qstat-lbl { font-size: 10.5px; color: #94A3B8; margin: 0; }

    /* ── Operations Row ── */
    .db-ops-row { display: grid; grid-template-columns: 1fr 360px; gap: 14px; align-items: start; }
    .db-table-skeleton { height: 220px; border-radius: 10px; }
    .db-table-scroll { overflow-x: auto; }

    /* Table */
    .db-table { width: 100%; border-collapse: collapse; }
    .db-table thead th {
      background: #F0FDF9 !important; color: #0F5C4D !important;
      font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
      height: 44px; padding: 0 13px; text-align: left; white-space: nowrap;
      border-bottom: 1px solid #DDEFE9;
    }
    .db-table tbody tr { border-bottom: 1px solid #F1F5F9; transition: background 0.12s; }
    .db-table tbody tr:last-child { border-bottom: none; }
    .db-table tbody tr:hover { background: #FAFDFC; }
    .db-table tbody td { height: 52px; padding: 0 13px; font-size: 13px; color: #0F172A; vertical-align: middle; }

    .db-order-link { font-size: 12.5px; font-weight: 600; color: #0F766E; text-decoration: none; }
    .db-order-link:hover { text-decoration: underline; }
    .db-cust-cell { display: flex; align-items: center; gap: 8px; }
    .db-cust-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #0F766E, #2DD4BF);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .db-cust-name { font-size: 12.5px; font-weight: 500; color: #0F172A; }
    .db-date-cell { color: #475569; font-size: 12.5px; white-space: nowrap; }
    .db-amount-cell { font-weight: 600; color: #0F172A; }

    /* Status badges */
    .db-badge { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; }
    .db-badge.s-delivered  { background: #F0FDF4; color: #16A34A; }
    .db-badge.s-pending    { background: #FFFBEB; color: #CA8A04; }
    .db-badge.s-confirmed  { background: #EFF6FF; color: #2563EB; }
    .db-badge.s-shipped    { background: #F5F3FF; color: #7C3AED; }
    .db-badge.s-cancelled  { background: #FEF2F2; color: #DC2626; }
    .db-badge.s-returned   { background: #F5F3FF; color: #7C3AED; }
    .db-badge.s-default    { background: #F1F5F9; color: #475569; }

    /* Low stock */
    .db-stock-list { display: flex; flex-direction: column; gap: 12px; }
    .db-stock-row { display: flex; align-items: center; gap: 10px; }
    .db-stock-img { width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid #E2E8F0; }
    .db-stock-body { flex: 1; min-width: 0; }
    .db-stock-name { font-size: 12px; font-weight: 600; color: #0F172A; margin: 0 0 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .db-stock-bar-track { height: 4px; background: #FEF2F2; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
    .db-stock-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
    .db-stock-foot { display: flex; justify-content: space-between; }
    .db-stock-qty { font-size: 10.5px; font-weight: 700; }
    .db-stock-qty.db-critical { color: #DC2626; }
    .db-stock-qty.db-low { color: #D97706; }
    .db-stock-threshold { font-size: 10.5px; color: #94A3B8; }
    .db-restock-btn { color: #0F766E; }
    .db-restock-btn .pi { font-size: 20px; }
    .db-restock-btn:hover { color: #0F5C4D; }
    .db-all-stocked { display: flex; flex-direction: column; align-items: center; padding: 24px 16px; gap: 8px; text-align: center; }
    .db-stocked-icon { font-size: 36px; color: #2DD4BF; }
    .db-all-stocked p { font-size: 12.5px; color: #64748B; margin: 0; }

    /* Section error */
    .db-section-error {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 24px; color: #64748B; font-size: 13px; flex-wrap: wrap;
    }
    .db-section-error .pi { color: #DC2626; font-size: 18px; }
    .db-section-error button {
      padding: 4px 12px; border: 1px solid #E2E8F0; border-radius: 6px; background: #fff;
      color: #0F766E; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
    }
    .db-section-error button:hover { background: #F0FDF9; }

    .db-warn-icon { color: #D97706; font-size: 16px; }

    /* Empty state */
    .db-empty { text-align: center; padding: 28px 16px; }
    .db-empty .pi { font-size: 36px; color: #CCFBF1; }
    .db-empty h3 { font-size: 14px; font-weight: 700; color: #0F172A; margin: 8px 0 3px; }
    .db-empty p { font-size: 12px; color: #94A3B8; margin: 0; }

    /* Skeleton */
    .db-skeleton {
      background: linear-gradient(90deg, #F0FDF9 25%, #CCFBF1 50%, #F0FDF9 75%);
      background-size: 200% 100%; animation: db-shimmer 1.6s infinite;
    }
    @keyframes db-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── Responsive ── */

    /* Laptop: stack chart+sellers and orders+stock when viewport < 1100px */
    @media (max-width: 1100px) {
      .db-main-row { grid-template-columns: 1fr; }
      .db-ops-row  { grid-template-columns: 1fr; }
    }

    /* Tablet: 2-col KPI, single-col analytics, 2-col chart-summary */
    @media (max-width: 900px) {
      .db-kpi-grid       { grid-template-columns: repeat(2, 1fr); }
      .db-analytics-row  { grid-template-columns: 1fr 1fr; }
      .db-chart-summary  { grid-template-columns: repeat(2, 1fr); }
    }

    /* Small tablet / large phone */
    @media (max-width: 768px) {
      .db-page            { padding: 14px; }
      .db-card            { padding: 16px; }
      .db-page-title      { font-size: 18px; }
      .db-page-sub        { font-size: 12px; }
      .db-head-actions    { gap: 6px; }
      .db-date-chip       { display: none; }
      .db-analytics-row   { grid-template-columns: 1fr; }
      .db-donut-wrap      { flex-direction: column; align-items: flex-start; }
      .db-donut-svg       { width: 100px; height: 100px; }
    }

    /* Mobile */
    @media (max-width: 600px) {
      .db-kpi-grid        { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .db-kpi-card        { padding: 12px; min-height: 110px; }
      .db-kpi-value       { font-size: 20px; }
      .db-card            { padding: 14px; }
      .db-reports-btn span { display: none; }
      .db-reports-btn     { padding: 7px 10px; }
      .db-chart-summary   { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; }
      .db-cs-val          { font-size: 13px; }
    }

    /* Small mobile */
    @media (max-width: 480px) {
      .db-page            { padding: 10px; }
      .db-kpi-grid        { gap: 8px; }
      .db-kpi-card        { padding: 10px; min-height: 100px; }
      .db-kpi-value       { font-size: 18px; }
      .db-card            { padding: 12px; }
      .db-visitor-grid    { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private svc = inject(DashboardService);

  stats          = signal<DStats | null>(null);
  chartData      = signal<ChartPt[]>([]);
  bestSellers    = signal<Seller[]>([]);
  recentOrders   = signal<ROrder[]>([]);
  lowStock       = signal<LowStock[]>([]);
  chartPeriod    = signal<'weekly' | 'monthly'>('weekly');

  statsLoading   = true;  statsError   = false;
  chartLoading   = true;  chartError   = false;
  sellersLoading = true;  sellersError = false;
  ordersLoading  = true;  ordersError  = false;
  stockLoading   = true;  stockError   = false;
  refreshing     = false;
  hovIdx = -1;

  get today(): string {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  get userName(): string { return 'Super Admin'; }

  get kpiCards() {
    const s = this.stats();
    if (!s) return [];
    return [
      { icon: 'pi-indian-rupee',       label: 'Total Revenue',    value: s.totalRevenue,       format: 'currency', color: '#0F766E', iconBg: '#F0FDFA' },
      { icon: 'pi-calendar',           label: "Today's Revenue",  value: s.todayRevenue,       format: 'currency', color: '#0EA5E9', iconBg: '#F0F9FF' },
      { icon: 'pi-file-check',         label: 'Total Orders',     value: s.totalOrders,        format: 'number',   color: '#2563EB', iconBg: '#EFF6FF' },
      { icon: 'pi-shopping-bag',       label: "Today's Orders",   value: s.todayOrders,        format: 'number',   color: '#D97706', iconBg: '#FFFBEB' },
      { icon: 'pi-users',              label: 'Total Customers',  value: s.totalCustomers,     format: 'number',   color: '#7C3AED', iconBg: '#F5F3FF' },
      { icon: 'pi-box',                label: 'Total Products',   value: s.totalProducts,      format: 'number',   color: '#F97316', iconBg: '#FFF7ED' },
      { icon: 'pi-clock',              label: 'Pending Orders',   value: s.pendingOrders,      format: 'number',   color: '#DC2626', iconBg: '#FEF2F2' },
      { icon: 'pi-exclamation-triangle', label: 'Low Stock Items', value: s.lowStockProducts, format: 'number',   color: '#65A30D', iconBg: '#F7FEE7' },
    ];
  }

  get visitorStats() {
    const v = this.stats()?.visitors;
    if (!v) return [];
    return [
      { label: 'Total Visitors', value: v.totalVisitors,   icon: 'pi-globe',      bg: 'linear-gradient(135deg,#0F766E,#2DD4BF)' },
      { label: 'Today',          value: v.todayVisitors,   icon: 'pi-calendar',   bg: 'linear-gradient(135deg,#0EA5E9,#38BDF8)' },
      { label: 'Registered',     value: v.registeredUsers, icon: 'pi-user',       bg: 'linear-gradient(135deg,#7C3AED,#A78BFA)' },
      { label: 'Guests',         value: v.guestVisitors,   icon: 'pi-user-minus', bg: 'linear-gradient(135deg,#D97706,#FCD34D)' },
    ];
  }

  get registeredPct(): number {
    const v = this.stats()?.visitors;
    if (!v || !v.totalVisitors) return 0;
    return (v.registeredUsers / v.totalVisitors) * 100;
  }

  get guestPct(): number { return 100 - this.registeredPct; }

  get quickStats() {
    const s = this.stats();
    if (!s) return [];
    return [
      { icon: 'pi-th-large',     label: 'Categories',       value: s.totalCategories, color: '#0F766E', iconBg: '#F0FDFA' },
      { icon: 'pi-check-circle', label: 'Delivered Orders', value: s.deliveredOrders, color: '#16A34A', iconBg: '#F0FDF4' },
      { icon: 'pi-times-circle', label: 'Cancelled Orders', value: s.cancelledOrders, color: '#DC2626', iconBg: '#FEF2F2' },
      { icon: 'pi-history',      label: 'Returned Orders',  value: s.returnedOrders,  color: '#7C3AED', iconBg: '#F5F3FF' },
      { icon: 'pi-shopping-cart',label: 'Abandoned Carts',  value: s.abandonedCarts,  color: '#D97706', iconBg: '#FFFBEB' },
    ];
  }

  get donutSegments() {
    const s = this.stats();
    if (!s || !s.totalOrders) return [];
    const total = s.totalOrders;
    const other = Math.max(0, total - s.pendingOrders - s.deliveredOrders - s.cancelledOrders - s.returnedOrders);
    const items = [
      { label: 'Delivered',  count: s.deliveredOrders, color: '#22C55E' },
      { label: 'Pending',    count: s.pendingOrders,   color: '#D97706' },
      { label: 'Cancelled',  count: s.cancelledOrders, color: '#DC2626' },
      { label: 'Returned',   count: s.returnedOrders,  color: '#7C3AED' },
      { label: 'Processing', count: other,              color: '#0EA5E9' },
    ].filter(i => i.count > 0);

    const r = 60, circ = 2 * Math.PI * r;
    let startDeg = -90;
    return items.map(item => {
      const pct = item.count / total;
      const dash = pct * circ, gap = circ - dash;
      const seg = { ...item, pct, dash, gap, startDeg };
      startDeg += pct * 360;
      return seg;
    });
  }

  get totalChartRevenue() { return this.chartData().reduce((a, d) => a + d.revenue, 0); }
  get avgChartRevenue()   { const d = this.chartData(); return d.length ? this.totalChartRevenue / d.length : 0; }
  get totalChartOrders()  { return this.chartData().reduce((a, d) => a + d.orders, 0); }
  get avgOrderValue()     { return this.totalChartOrders ? this.totalChartRevenue / this.totalChartOrders : 0; }

  get gridLines(): number[] {
    const H = 170, PAD = 14, steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => PAD + ((H - PAD * 2) * i) / steps);
  }

  get chartPoints(): { x: number; y: number }[] {
    const data = this.chartData();
    if (data.length < 2) return [];
    const W = 760, H = 170, PAD = 14;
    const maxRev = Math.max(...data.map(d => d.revenue), 1);
    const xStep = (W - PAD * 2) / (data.length - 1);
    return data.map((d, i) => ({
      x: PAD + i * xStep,
      y: PAD + (H - PAD * 2) * (1 - d.revenue / maxRev)
    }));
  }

  get chartLinePath(): string {
    const pts = this.chartPoints;
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }
    return d;
  }

  get chartAreaPath(): string {
    const pts = this.chartPoints;
    if (pts.length < 2) return '';
    const H = 160;
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }
    d += ` L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;
    return d;
  }

  sellerBarPct(count: number): number {
    const max = Math.max(...this.bestSellers().map(p => p.soldCount), 1);
    return (count / max) * 100;
  }

  rankClass(i: number): string {
    return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
  }

  stockBarPct(qty: number, threshold: number): number {
    return Math.min((qty / (threshold * 2)) * 100, 100);
  }

  orderStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Delivered': 's-delivered', 'Pending': 's-pending', 'Confirmed': 's-confirmed',
      'Shipped': 's-shipped', 'Cancelled': 's-cancelled', 'Returned': 's-returned'
    };
    return map[status] ?? 's-default';
  }

  ngOnInit(): void {
    this.loadStats(); this.loadChart(); this.loadSellers(); this.loadOrders(); this.loadStock();
  }

  refresh(): void {
    this.refreshing = true;
    this.loadStats(); this.loadChart(); this.loadSellers(); this.loadOrders(); this.loadStock();
    setTimeout(() => this.refreshing = false, 1200);
  }

  setPeriod(p: 'weekly' | 'monthly'): void {
    this.chartPeriod.set(p);
    this.loadChart();
  }

  loadStats(): void {
    this.statsLoading = true; this.statsError = false;
    this.svc.getStats().subscribe({
      next: res => { this.stats.set(res.data as DStats); this.statsLoading = false; },
      error: _  => { this.statsError = true; this.statsLoading = false; }
    });
  }

  loadChart(): void {
    this.chartLoading = true; this.chartError = false;
    this.svc.getSalesChart(this.chartPeriod()).subscribe({
      next: res => { this.chartData.set((res.data ?? []) as ChartPt[]); this.chartLoading = false; },
      error: _  => { this.chartError = true; this.chartLoading = false; }
    });
  }

  loadSellers(): void {
    this.sellersLoading = true; this.sellersError = false;
    this.svc.getBestSellers(7).subscribe({
      next: res => { this.bestSellers.set((res.data ?? []) as Seller[]); this.sellersLoading = false; },
      error: _  => { this.sellersError = true; this.sellersLoading = false; }
    });
  }

  loadOrders(): void {
    this.ordersLoading = true; this.ordersError = false;
    this.svc.getRecentOrders(10).subscribe({
      next: res => { this.recentOrders.set((res.data ?? []) as ROrder[]); this.ordersLoading = false; },
      error: _  => { this.ordersError = true; this.ordersLoading = false; }
    });
  }

  loadStock(): void {
    this.stockLoading = true; this.stockError = false;
    this.svc.getLowStock().subscribe({
      next: res => { this.lowStock.set((res.data ?? []) as LowStock[]); this.stockLoading = false; },
      error: _  => { this.stockError = true; this.stockLoading = false; }
    });
  }
}
