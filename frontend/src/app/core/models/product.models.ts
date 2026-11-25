export interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  priceAdjustment?: number;
  stockQuantity: number;
  sku?: string;
}

export interface ReviewSummary {
  id: string;
  customerName: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
}

export interface ProductList {
  id: string;
  name: string;
  slug: string;
  categoryName?: string;
  price: number;
  discountPrice?: number;
  taxPercentage: number;
  currency: string;
  stockQuantity: number;
  primaryImageUrl?: string;
  averageRating: number;
  reviewCount: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isSpecialOffer: boolean;
  isActive: boolean;
  prescriptionRequired: boolean;
  createdAt: string;
}

export interface ProductDetail extends ProductList {
  categoryId?: string;
  manufacturer?: string;
  sku?: string;
  description?: string;
  composition?: string;
  dosageForm?: string;
  packaging?: string;
  benefits?: string;
  storageInstructions?: string;
  sideEffects?: string;
  ingredients?: string;
  howToUse?: string;
  dosageInstructions?: string;
  safetyInformation?: string;
  certifications?: string;
  metaTitle?: string;
  metaDescription?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  reviews: ReviewSummary[];
}

export interface ProductFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isSpecialOffer?: boolean;
  inStock?: boolean;
  isActive?: boolean;
  prescriptionRequired?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  sortOrder: number;
  imageUrl?: string;
  isFeatured: boolean;
  isActive: boolean;
  productCount: number;
  subCategories: Category[];
  createdAt: string;
}

export interface CreateProductDto {
  name: string;
  categoryId: string;
  manufacturer?: string;
  sku?: string;
  price: number;
  discountPrice?: number;
  taxPercentage: number;
  currency: string;
  stockQuantity: number;
  lowStockThreshold: number;
  description?: string;
  composition?: string;
  dosageForm?: string;
  packaging?: string;
  benefits?: string;
  storageInstructions?: string;
  sideEffects?: string;
  ingredients?: string;
  howToUse?: string;
  dosageInstructions?: string;
  safetyInformation?: string;
  certifications?: string;
  prescriptionRequired: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isSpecialOffer: boolean;
  metaTitle?: string;
  metaDescription?: string;
  variants: CreateVariantDto[];
}

export interface CreateVariantDto {
  name: string;
  value: string;
  priceAdjustment?: number;
  stockQuantity: number;
  sku?: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  customerName: string;
  rating: number;
  title?: string;
  comment?: string;
  status: ReviewStatus;
  createdAt: string;
}

export enum ReviewStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3
}
