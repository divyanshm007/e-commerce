import { OrderDetail } from '../../core/models/order.models';
import { istDateTime, inr, ORDER_STATUS, PAYMENT_METHOD } from '../shared/pdf-export';

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SENDER = ['Sidham Pharmacy (M/S Ganpati Herbal Ayurveda)', 'Phalsanda Jattan, Kurukshetra, Haryana, India', 'www.sidham.in'];

/**
 * The slip that goes into the parcel: where it goes, what is inside, and (for cash on delivery) how much to collect.
 * It is drawn in a hidden frame and sent to the printer, so the admin page itself is untouched.
 */
export function printPackingSlip(o: OrderDetail): void {
  const a = o.shippingAddress as any;
  const cod = o.paymentMethod === 2 && o.paymentStatus !== 2;
  const lines = (o.items ?? []).map((i, n) => {
    const unit = i.quantity > 0 ? (i.unitPrice - (i.discountAmount ?? 0) / i.quantity) : i.unitPrice;
    return `<tr><td>${n + 1}</td><td>${esc(i.productName)}${i.variantInfo ? `<div class="m">${esc(i.variantInfo)}</div>` : ''}</td>
      <td class="r">${i.quantity}</td><td class="r">${inr(unit)}</td><td class="r">${inr(i.totalPrice)}</td></tr>`;
  }).join('');
  const addr = [a?.line1, a?.line2, [a?.city, a?.state].filter(Boolean).join(', '), [a?.postalCode, a?.country].filter(Boolean).join(' ')]
    .filter(Boolean).map(esc).join('<br>');
  const row = (k: string, v: string) => `<tr><td>${k}</td><td class="r">${v}</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Packing slip ${esc(o.orderNumber)}</title><style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; margin: 0; }
    h1 { font-size: 18px; margin: 0; } h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: #555; margin: 0 0 6px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; margin-bottom: 12px; }
    .box { border: 1px solid #111; padding: 10px; }
    .ship { font-size: 15px; line-height: 1.45; }
    .ship b { font-size: 17px; }
    .cod { border: 3px solid #111; text-align: center; padding: 8px; margin-bottom: 12px; font-size: 18px; font-weight: bold; }
    .awb { font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; }
    .items th, .items td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
    .items th { background: #eee; }
    .r { text-align: right !important; } .m { color: #555; font-size: 11px; }
    .tot { width: 45%; margin-left: auto; margin-top: 8px; } .tot td { padding: 3px 0; } .tot .g td { border-top: 2px solid #111; font-weight: bold; font-size: 14px; padding-top: 6px; }
    .foot { margin-top: 18px; border-top: 1px dashed #777; padding-top: 8px; color: #444; font-size: 11px; }
    .cut { margin-top: 14px; }
  </style></head><body>
    <div class="top">
      <div><h1>Packing slip</h1><div class="m">Order #${esc(o.orderNumber)} &middot; ${esc(istDateTime(o.createdAt))}</div></div>
      <div style="text-align:right"><b>Sidham Pharmacy</b><div class="m">Ayurvedic medicines &amp; healthcare</div></div>
    </div>

    ${cod ? `<div class="cod">CASH ON DELIVERY &mdash; COLLECT ${esc(inr(o.totalAmount))}</div>` : ''}

    <div class="grid">
      <div class="box ship"><h2>Deliver to</h2><b>${esc(a?.fullName)}</b><br>${addr}<br><b>Phone: ${esc(a?.phone)}</b></div>
      <div class="box">
        <h2>Shipment</h2>
        <table>
          ${row('Order status', esc(ORDER_STATUS[o.status] ?? ''))}
          ${row('Payment', esc(PAYMENT_METHOD[o.paymentMethod] ?? ''))}
          ${row('Items', String((o.items ?? []).reduce((s, i) => s + i.quantity, 0)))}
        </table>
        <div style="margin-top:8px"><div class="m">AWB / tracking number</div><div class="awb">${esc(o.trackingNumber || '—')}</div></div>
      </div>
    </div>

    <table class="items">
      <thead><tr><th style="width:28px">#</th><th>Item</th><th class="r" style="width:50px">Qty</th><th class="r" style="width:90px">Price</th><th class="r" style="width:100px">Amount</th></tr></thead>
      <tbody>${lines}</tbody>
    </table>

    <table class="tot">
      ${row('Subtotal', esc(inr(o.subTotal)))}
      ${o.discountAmount > 0 ? row('Discount' + (o.couponCode ? ` (${esc(o.couponCode)})` : ''), '- ' + esc(inr(o.discountAmount))) : ''}
      ${o.taxAmount > 0 ? row('Tax', esc(inr(o.taxAmount))) : ''}
      ${row('Shipping', o.shippingCharge > 0 ? esc(inr(o.shippingCharge)) : 'Free')}
      <tr class="g"><td>Total</td><td class="r">${esc(inr(o.totalAmount))}</td></tr>
    </table>

    <div class="foot">
      <div class="cut"><b>From / return address:</b> ${SENDER.map(esc).join(', ')}</div>
      <div class="cut">Thank you for shopping with Sidham Pharmacy. Questions about this order? Track it on sidham.in/track-order with your order number and email.</div>
    </div>
  </body></html>`;

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow!.document;
  doc.open(); doc.write(html); doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  frame.contentWindow!.addEventListener('afterprint', cleanup);
  setTimeout(() => { frame.contentWindow!.focus(); frame.contentWindow!.print(); }, 250);
}
