export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl?: string;
  variantId?: string;
  variantInfo?: string;
  quantity: number;
  unitPrice: number;
  discountPrice: number;
  taxPercentage: number;
  lineTotal: number;
  originalLineTotal: number;
  itemDiscountAmount: number;
  stockQuantity: number;
  inStock: boolean;
}

/** The product has a selling price below its MRP: show both, the MRP struck through. */
export function hasOffer(i: CartItem): boolean {
  return i.discountPrice > 0 && i.discountPrice < i.unitPrice;
}

/** The line at MRP, with tax in the same way lineTotal has it, so the two numbers can be compared. */
export function mrpLineTotal(i: CartItem): number {
  return i.unitPrice * (1 + (i.taxPercentage || 0) / 100) * i.quantity;
}

export function offerPercent(i: CartItem): number {
  return hasOffer(i) ? Math.round(((i.unitPrice - i.discountPrice) / i.unitPrice) * 100) : 0;
}

/** What the customer saves against MRP across the whole cart. */
export function cartMrpSavings(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + (hasOffer(i) ? mrpLineTotal(i) - i.lineTotal : 0), 0);
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  subTotal: number;
  discountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  totalAmount: number;
  appliedCouponCode?: string;
  couponDiscountType?: number;   // 1=Percentage, 2=Fixed
  couponDiscountValue?: number;
  itemCount: number;
}

export interface AddCartItemDto {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CouponValidation {
  isValid: boolean;
  message?: string;
  couponId?: string;
  code?: string;
  discountType: number;
  discountValue: number;
  discountAmount: number;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: number;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  startDate?: string;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
}
