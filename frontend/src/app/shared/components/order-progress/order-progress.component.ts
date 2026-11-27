import { Component, Input, computed, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';

export interface ProgressEvent { status: string; location?: string | null; time?: string | null; }

interface Step { key: string; title: string; note: string; time?: string | null; state: 'done' | 'current' | 'todo' | 'bad'; }

/**
 * The "where is my order" strip, like the big shopping apps: Order placed → Confirmed → Shipped → Out for delivery → Delivered.
 * Finished steps are green with their time, the step in progress pulses, later steps are grey.
 * A cancelled, returned or returning-to-seller order ends in a red step instead.
 * It is used by the logged-in order page and by the guest "Track order" page, so both always agree.
 */
@Component({
  selector: 'app-order-progress',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe],
  template: `
<ol class="op" [class.op-bad]="isBad()">
  <li *ngFor="let s of steps(); let last = last" class="op-step">
    <div class="op-rail">
      <span class="op-dot" [attr.data-state]="s.state">
        <svg *ngIf="s.state === 'done'" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <svg *ngIf="s.state === 'bad'" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>
      </span>
      <span class="op-line" *ngIf="!last" [attr.data-next]="s.state === 'done' ? 'done' : 'todo'"></span>
    </div>
    <div class="op-text">
      <div class="op-title" [attr.data-state]="s.state">{{ s.title }}</div>
      <div class="op-time" *ngIf="s.time">{{ s.time | date:'EEE, dd MMM yyyy, h:mm a':'+0530' }} IST</div>
      <div class="op-note" *ngIf="s.note">{{ s.note }}</div>
    </div>
  </li>
</ol>
  `,
  styles: [`
    .op { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .op-step { display: flex; gap: 14px; }
    .op-rail { display: flex; flex-direction: column; align-items: center; }
    .op-dot { width: 22px; height: 22px; border-radius: 50%; background: #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .op-dot[data-state='done'] { background: #16a34a; }
    .op-dot[data-state='bad'] { background: #dc2626; }
    .op-dot[data-state='current'] { background: #fff; border: 3px solid #16a34a; animation: op-pulse 1.6s ease-in-out infinite; }
    .op-line { width: 3px; flex: 1; min-height: 28px; background: #e2e8f0; }
    .op-line[data-next='done'] { background: #16a34a; }
    .op-text { padding: 0 0 20px; min-width: 0; }
    .op-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .op-title[data-state='todo'] { color: #64748b; }
    .op-title[data-state='bad'] { color: #b91c1c; }
    .op-time { font-size: 12px; color: #475569; margin-top: 2px; }
    .op-note { font-size: 13px; color: #475569; margin-top: 2px; word-break: break-word; }
    .op-step:last-child .op-text { padding-bottom: 0; }
    @keyframes op-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,.45); } 50% { box-shadow: 0 0 0 6px rgba(22,163,74,0); } }

    /* wide screens: a row of steps, like the shopping apps */
    @media (min-width: 720px) {
      .op { flex-direction: row; }
      .op-step { flex: 1; flex-direction: column; gap: 10px; min-width: 0; }
      .op-rail { flex-direction: row; align-items: center; }
      .op-line { height: 3px; width: auto; min-height: 0; flex: 1; }
      .op-text { padding: 0 10px 0 0; }
      .op-step:last-child .op-rail { width: 22px; }
    }
  `]
})
export class OrderProgressComponent {
  private s = signal({ status: 1, placedAt: '' as string | null | undefined, shippedAt: null as string | null | undefined, deliveredAt: null as string | null | undefined,
    shipmentStatus: null as string | null | undefined, courier: null as string | null | undefined, awb: null as string | null | undefined,
    expected: null as string | null | undefined, timeline: [] as ProgressEvent[] });

  /** Order status number: 1 Pending, 2 Confirmed, 3 Shipped, 4 Delivered, 5 Cancelled, 6 Returned. */
  @Input({ required: true }) set status(v: number) { this.s.update(o => ({ ...o, status: v })); }
  @Input() set placedAt(v: string | null | undefined) { this.s.update(o => ({ ...o, placedAt: v })); }
  @Input() set shippedAt(v: string | null | undefined) { this.s.update(o => ({ ...o, shippedAt: v })); }
  @Input() set deliveredAt(v: string | null | undefined) { this.s.update(o => ({ ...o, deliveredAt: v })); }
  /** The courier's shipment status (IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, RTO_…), when a shipment exists. */
  @Input() set shipmentStatus(v: string | null | undefined) { this.s.update(o => ({ ...o, shipmentStatus: v })); }
  @Input() set courier(v: string | null | undefined) { this.s.update(o => ({ ...o, courier: v })); }
  @Input() set awb(v: string | null | undefined) { this.s.update(o => ({ ...o, awb: v })); }
  @Input() set expected(v: string | null | undefined) { this.s.update(o => ({ ...o, expected: v })); }
  @Input() set timeline(v: ProgressEvent[] | null | undefined) { this.s.update(o => ({ ...o, timeline: v ?? [] })); }

  isBad = computed(() => this.steps().some(x => x.state === 'bad'));

  steps = computed<Step[]>(() => {
    const o = this.s();
    const sh = (o.shipmentStatus ?? '').toUpperCase();
    const hasShipment = !!sh;
    const rto = sh.startsWith('RTO');
    const delivered = o.status === 4 || sh === 'DELIVERED';
    const ofd = delivered || sh === 'OUT_FOR_DELIVERY';
    const shipped = o.status === 3 || o.status === 4 || o.status === 6 || (hasShipment && sh !== 'CREATED' && sh !== 'CANCELLED') || !!o.shippedAt;
    const confirmed = o.status >= 2 && o.status !== 5 || hasShipment || shipped;
    const timeOf = (re: RegExp) => o.timeline.find(e => re.test(e.status))?.time ?? null;
    const dateNote = o.expected && !delivered ? `Expected by ${this.shortDate(o.expected)}` : '';

    const placed: Step = { key: 'placed', title: 'Order placed', note: 'We have received your order.', time: o.placedAt, state: 'done' };

    if (o.status === 5) {
      const list: Step[] = [placed];
      if (confirmed && (shipped || hasShipment)) list.push({ key: 'conf', title: 'Order confirmed', note: '', time: null, state: 'done' });
      list.push({ key: 'cancel', title: 'Order cancelled', note: 'This order was cancelled. Any payment made is refunded to the original payment method.', time: null, state: 'bad' });
      return list;
    }

    const list: Step[] = [
      placed,
      { key: 'conf', title: 'Order confirmed', note: confirmed ? 'Your order is confirmed and is being packed.' : 'Waiting for confirmation from our team.', time: null, state: confirmed ? 'done' : 'todo' },
      { key: 'ship', title: 'Shipped', note: shipped ? [o.courier ? `Handed to ${o.courier}` : 'Handed to the courier', o.awb ? `AWB ${o.awb}` : ''].filter(Boolean).join(' · ') : 'Your parcel will be handed to the courier soon.',
        time: o.shippedAt ?? timeOf(/picked|pick|manifest|dispatch/i), state: shipped ? 'done' : 'todo' },
    ];

    if (rto) {
      list.push({ key: 'rto', title: sh === 'RTO_DELIVERED' ? 'Returned to seller' : 'Returning to seller', note: 'The courier could not deliver this parcel, so it is on its way back to us. Please contact us if you still want it.', time: sh === 'RTO_DELIVERED' ? timeOf(/rto|return/i) : null, state: 'bad' });
    } else {
      list.push({ key: 'ofd', title: 'Out for delivery', note: ofd && !delivered ? 'Your parcel is with the delivery agent and will arrive today.' : (delivered ? '' : dateNote), time: ofd ? timeOf(/out for delivery/i) : null, state: ofd ? 'done' : 'todo' });
      list.push({ key: 'del', title: 'Delivered', note: delivered ? 'Your parcel has been delivered.' : '', time: o.deliveredAt ?? (delivered ? timeOf(/delivered/i) : null), state: delivered ? 'done' : 'todo' });
    }

    if (o.status === 6) list.push({ key: 'ret', title: 'Order returned', note: 'This order was returned.', time: null, state: 'bad' });

    // the first step that is not finished is the one in progress
    const firstTodo = list.findIndex(x => x.state === 'todo');
    if (firstTodo >= 0 && !list.some(x => x.state === 'bad')) list[firstTodo] = { ...list[firstTodo], state: 'current' };
    return list;
  });

  private shortDate(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  }
}
