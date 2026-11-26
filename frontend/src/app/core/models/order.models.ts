export enum OrderStatus {
  Pending = 1,
  Confirmed = 2,
  Shipped = 3,
  Delivered = 4,
  Cancelled = 5,
  Returned = 6
}

export enum PaymentStatus {
  Pending = 1,
  Paid = 2,
  Failed = 3,
  Refunded = 4,
  PartialRefund = 5
}

export enum PaymentMethod {
  Razorpay = 1,
  CashOnDelivery = 2
}

export enum RefundStatus {
  NotRequested = 0,
  Requested = 1,
  Processing = 2,
  Completed = 3,
  Rejected = 4
}

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantInfo?: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  totalPrice: number;
}

/** An ordered line that was sold below its MRP (unitPrice is the MRP; discountAmount is the saving on the whole line). */
export function orderItemHasOffer(i: OrderItem): boolean {
  return (i.discountAmount ?? 0) > 0;
}

export function orderItemSellingUnit(i: OrderItem): number {
  return i.quantity > 0 ? i.unitPrice - (i.discountAmount ?? 0) / i.quantity : i.unitPrice;
}

export interface PaymentSummary {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  razorpayPaymentId?: string;
  paidAt?: string;
  refundStatus: RefundStatus;
}

export interface OrderReport {
  from?: string | null;
  to?: string | null;
  ordersCount: number;
  countedOrders: number;
  revenue: number;
  averageOrderValue: number;
  deliveredCount: number;
  cancelledCount: number;
  topOrders: OrderList[];
}

export interface OrderList {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

export interface OrderDetail extends OrderList {
  userId?: string;
  subTotal: number;
  discountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  couponCode?: string;
  notes?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancellationReason?: string;
  refundStatus: RefundStatus;
  shippingAddress: AddressSnapshot;
  billingAddress: AddressSnapshot;
  items: OrderItem[];
  payments: PaymentSummary[];
}

export interface CreateOrderDto {
  userId?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestName?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
  shippingAddress: AddressSnapshot;
  billingAddress: AddressSnapshot;
  items: { productId: string; variantId?: string; quantity: number }[];
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  trackingNumber?: string;
  notes?: string;
}

export interface CustomerAddress {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: number;
  isDefault: boolean;
}
