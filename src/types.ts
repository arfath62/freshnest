export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  rating: number;
  reviewsCount: number;
  sellerId: string;
  tags: string[];
  freshnessType?: "prepared" | "harvested" | "collected" | "processed";
  preparedAt?: string;
  packedAt?: string;
  storageStartedAt?: string;
  shelfLifeHours?: number;
}

export interface Seller {
  id: string;
  name: string;
  email: string;
  shopName: string;
  shopDescription: string;
  story: string; // Engaging background story of the cottage industry
  avatar: string;
  coverImage: string;
  location: string;
  rating: number;
  verified: boolean;
  badge: string; // Custom title like "Star Baker", "Herb Alchemist"
  joinedDate: string;
}

export interface Review {
  id: string;
  productId: string;
  buyerName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  sellerId: string;
}

export interface Order {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  deliveryMethod: "pickup" | "delivery";
  address: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  date: string;
  notes?: string;
}
