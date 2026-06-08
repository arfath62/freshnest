import { useState, useEffect, FormEvent } from "react";
import { 
  ShoppingBag, 
  Store, 
  Sparkles, 
  MapPin, 
  Search, 
  Heart, 
  ArrowRight, 
  ChevronRight, 
  Star, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  Edit, 
  PlusCircle, 
  Clock, 
  Settings, 
  AlertCircle, 
  MessageSquare, 
  Feather, 
  Check, 
  Info, 
  Coins, 
  FileText,
  User,
  X,
  RefreshCw,
  TrendingUp,
  Award,
  Bot,
  Send
} from "lucide-react";
import { Navbar } from "./components/Navbar.tsx";
import { Product, Seller, Review, Order, OrderItem } from "./types.ts";
import appLogoUrl from "../assets/freshnest-logo.png";
import freshNestLandingUrl from "../assets/freshnest-hero.png";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

const freshProductCategories = [
  "Food & Bakery",
  "Fruits",
  "Vegetables",
  "Dairy",
  "Meat",
  "Homemade Food",
  "Handmade Home",
  "Beauty & Apothecary"
];

const getDefaultFreshTrackValues = () => {
  const now = new Date();
  const prepared = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const packed = new Date(now.getTime() - 60 * 60 * 1000);
  return {
    preparedAt: toDateTimeLocalValue(prepared.toISOString()),
    packedAt: toDateTimeLocalValue(packed.toISOString()),
    storageStartedAt: toDateTimeLocalValue(packed.toISOString()),
    shelfLifeHours: 24
  };
};

const getDefaultFreshnessType = (category: string) => {
  if (category === "Fruits" || category === "Vegetables") return "harvested";
  if (category === "Dairy") return "collected";
  if (category === "Meat") return "processed";
  return "prepared";
};

const getFreshnessTypeLabel = (productOrCategory: Product | string) => {
  const category = typeof productOrCategory === "string" ? productOrCategory : productOrCategory.category;
  const freshnessType = typeof productOrCategory === "string"
    ? getDefaultFreshnessType(productOrCategory)
    : productOrCategory.freshnessType || getDefaultFreshnessType(category);

  return getFreshnessEventLabel(freshnessType, category);
};

const getFreshnessEventLabel = (freshnessType: string, category = "") => {
  if (freshnessType === "harvested") return "Harvested";
  if (freshnessType === "collected") return "Collected";
  if (freshnessType === "processed") return "Processed";
  return category === "Food & Bakery" ? "Baked / Prepared" : "Prepared";
};

const toDateTimeLocalValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toIsoDateTime = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const formatFreshDateTime = (value?: string) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (sameDay(date, today)) return `Today ${time}`;
  if (sameDay(date, yesterday)) return `Yesterday ${time}`;
  if (sameDay(date, tomorrow)) return `Tomorrow ${time}`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ` ${time}`;
};

const getFreshTrack = (product: Product, now = Date.now()) => {
  const storageValue = product.storageStartedAt || product.packedAt || product.preparedAt;
  const storageStart = storageValue ? new Date(storageValue).getTime() : now;
  const shelfLifeHours = Math.max(Number(product.shelfLifeHours) || 24, 1);
  const storageHours = Math.max((now - storageStart) / (1000 * 60 * 60), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - (storageHours / shelfLifeHours) * 100)));
  const status = score >= 85 ? "Excellent" : score >= 65 ? "Good" : score >= 40 ? "Use soon" : "Past peak";
  return { score, status, storageHours, shelfLifeHours };
};

export default function App() {
  // Navigation & Role states
  const [currentRole, setRole] = useState<"buyer" | "seller">("buyer");
  const [hasEnteredMarketplace, setHasEnteredMarketplace] = useState(false);
  const [hasChosenEntryRole, setHasChosenEntryRole] = useState(false);
  const [landingPage, setLandingPage] = useState<"home" | "about" | "how" | "sellers">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Data State loaded from REST API
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [freshnessNow, setFreshnessNow] = useState(() => Date.now());

  // Active Buyer Selection States
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ buyerName: "", rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi, I am your 24/7 FreshTrack assistant. Ask me about stores, freshness scores, prices, stock, pickup, or what to buy today."
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Basket State (persisted inside localStorage)
  const [basket, setBasket] = useState<{ product: Product; quantity: number }[]>(() => {
    const saved = localStorage.getItem("nidus_basket");
    return saved ? JSON.parse(saved) : [];
  });
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "shipping" | "success">("cart");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
    deliveryMethod: "pickup" as "pickup" | "delivery",
    address: "",
    notes: ""
  });
  const [placingOrder, setPlacingOrder] = useState(false);

  // Seller Workspace States
  const [activeSellerId, setActiveSellerId] = useState<string>(() => localStorage.getItem("nidus_seller_session") || "");
  const [isAIGeneryStoryOpen, setIsAIGeneryStoryOpen] = useState(false);
  const [aiStoryNotes, setAiStoryNotes] = useState("");
  const [generatingStory, setGeneratingStory] = useState(false);
  
  // Seller store edits
  const [sellerEditForm, setSellerEditForm] = useState({
    name: "",
    shopName: "",
    shopDescription: "",
    story: "",
    location: "",
    badge: "",
    avatar: "",
    coverImage: ""
  });
  const [savingSellerProfile, setSavingSellerProfile] = useState(false);
  const [isNewSellerFormOpen, setIsNewSellerFormOpen] = useState(false);
  const [newSellerForm, setNewSellerForm] = useState({
    name: "",
    email: "",
    shopName: "",
    shopDescription: "",
    story: "",
    location: "",
    badge: "Local Seller",
    avatar: "",
    coverImage: ""
  });
  const [creatingSellerProfile, setCreatingSellerProfile] = useState(false);

  // Seller Product Creation & Edits State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // null means adding a new product
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    description: "",
    price: 10.00,
    category: "Food & Bakery",
    image: "",
    stock: 10,
    tagsString: "homemade, local",
    freshnessType: "prepared",
    ...getDefaultFreshTrackValues()
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Gemini Copywriting helper for products
  const [isAICopywriterOpen, setIsAICopywriterOpen] = useState(false);
  const [aiProductFeatures, setAiProductFeatures] = useState("");
  const [aiProductMaterials, setAiProductMaterials] = useState("");
  const [generatingCopy, setGeneratingCopy] = useState(false);

  // Saved/liked product IDs (Client-only favorited listings)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Local static asset fallback mapping for easy visual curation
  const defaultCottageImages = [
    "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1607006342411-92fc2a4d4625?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600"
  ];

  // 1. Initial State Syncing
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setErrorStatus(null);
      const [sellersRes, productsRes, ordersRes] = await Promise.all([
        fetch("/api/sellers"),
        fetch("/api/products"),
        fetch("/api/orders")
      ]);

      if (!sellersRes.ok || !productsRes.ok || !ordersRes.ok) {
        throw new Error("Unable to synchronize marketplace cache from backend.");
      }

      const sellersData = await sellersRes.json();
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();

      setSellers(sellersData);
      setProducts(productsData);
      setOrders(ordersData);

      // Restore only this browser's seller session. Do not expose other stores in Seller Mode.
      const savedSellerId = localStorage.getItem("nidus_seller_session") || activeSellerId;
      const activeSeller = sellersData.find((s: Seller) => s.id === savedSellerId);
      if (activeSeller) {
        setActiveSellerId(activeSeller.id);
        setSellerEditForm({
          name: activeSeller.name,
          shopName: activeSeller.shopName,
          shopDescription: activeSeller.shopDescription,
          story: activeSeller.story,
          location: activeSeller.location,
          badge: activeSeller.badge,
          avatar: activeSeller.avatar,
          coverImage: activeSeller.coverImage
        });
      } else {
        setActiveSellerId("");
        localStorage.removeItem("nidus_seller_session");
      }
    } catch (err: any) {
      console.error(err);
      setErrorStatus("Could not link with the cottage server core. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setFreshnessNow(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Update active seller edit form when active seller ID changes
  useEffect(() => {
    const activeSeller = sellers.find(s => s.id === activeSellerId);
    if (activeSeller) {
      localStorage.setItem("nidus_seller_session", activeSeller.id);
      setSellerEditForm({
        name: activeSeller.name,
        shopName: activeSeller.shopName,
        shopDescription: activeSeller.shopDescription,
        story: activeSeller.story,
        location: activeSeller.location,
        badge: activeSeller.badge,
        avatar: activeSeller.avatar,
        coverImage: activeSeller.coverImage
      });
    } else if (!activeSellerId) {
      setSellerEditForm({
        name: "",
        shopName: "",
        shopDescription: "",
        story: "",
        location: "",
        badge: "",
        avatar: "",
        coverImage: ""
      });
    }
  }, [activeSellerId, sellers]);

  // Persist basket
  useEffect(() => {
    localStorage.setItem("nidus_basket", JSON.stringify(basket));
  }, [basket]);

  // Handle Review product fetching
  useEffect(() => {
    if (selectedProduct) {
      fetch(`/api/reviews?productId=${selectedProduct.id}`)
        .then(res => res.json())
        .then(data => setProductReviews(data))
        .catch(err => console.error(err));
    }
  }, [selectedProduct]);

  // Basket Management Actions
  const addToBasket = (product: Product) => {
    if (product.stock <= 0) return;
    setBasket(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const targetQty = existing.quantity + 1;
        if (targetQty > product.stock) return prev; // check stock limits
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: targetQty } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    // Trigger quick slide open representation to let user see feedback
    setIsBasketOpen(true);
  };

  const updateBasketQuantity = (productId: string, delta: number, maxStock: number) => {
    setBasket(prev => prev.map(item => {
      if (item.product.id === productId) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        if (nextQty > maxStock) return item; // limit to stock
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(Boolean) as any);
  };

  const removeFromBasket = (productId: string) => {
    setBasket(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearBasket = () => {
    setBasket([]);
    setCheckoutStep("cart");
  };

  // 2. Submit Review
  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!reviewForm.buyerName.trim() || !reviewForm.comment.trim()) return;

    try {
      setSubmittingReview(true);
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          buyerName: reviewForm.buyerName,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        })
      });

      if (!res.ok) throw new Error("Could not submit review.");
      const freshReview = await res.json();
      setProductReviews(prev => [freshReview, ...prev]);
      
      // Update our products arrays state ratings live
      setProducts(prevProducts => prevProducts.map(p => {
        if (p.id === selectedProduct.id) {
          const newCount = p.reviewsCount + 1;
          const newRating = parseFloat(((p.rating * p.reviewsCount + reviewForm.rating) / newCount).toFixed(1));
          return {
            ...p,
            reviewsCount: newCount,
            rating: newRating
          };
        }
        return p;
      }));

      // Update selected product's own card display values locally
      setSelectedProduct(prev => {
        if (!prev) return null;
        const newCount = prev.reviewsCount + 1;
        const newRating = parseFloat(((prev.rating * prev.reviewsCount + reviewForm.rating) / newCount).toFixed(1));
        return { ...prev, reviewsCount: newCount, rating: newRating };
      });

      setReviewForm({ buyerName: "", rating: 5, comment: "" });
    } catch (err) {
      alert("Uh oh! Failed to post the review details.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // 3. Place Order
  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (basket.length === 0) return;
    if (!checkoutForm.buyerName || !checkoutForm.buyerEmail || !checkoutForm.buyerPhone) {
      alert("Please complete the required buyer fields.");
      return;
    }

    try {
      setPlacingOrder(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName: checkoutForm.buyerName,
          buyerEmail: checkoutForm.buyerEmail,
          buyerPhone: checkoutForm.buyerPhone,
          deliveryMethod: checkoutForm.deliveryMethod,
          address: checkoutForm.deliveryMethod === "delivery" ? checkoutForm.address : "FreshNest Local Pickup Hub",
          items: basket.map(b => ({
            productId: b.product.id,
            name: b.product.name,
            quantity: b.quantity
          })),
          notes: checkoutForm.notes
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to finalize the kitchen order.");
      }

      const serverOrder = await res.json();
      setPlacedOrder(serverOrder);
      setCheckoutStep("success");
      
      // Clear basket, refresh backend products count update
      setBasket([]);
      fetchAllData();
    } catch (err: any) {
      alert(`Fulfillment Alert: ${err.message}`);
    } finally {
      setPlacingOrder(false);
    }
  };

  // 4. Update Order Status (Seller Role)
  const handleUpdateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Save Store profile
  const handleSaveSellerProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSellerId) {
      alert("Please create your seller profile first.");
      setIsNewSellerFormOpen(true);
      return;
    }
    try {
      setSavingSellerProfile(true);
      const res = await fetch("/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeSellerId,
          ...sellerEditForm
        })
      });
      if (res.ok) {
        const updatedSeller = await res.json();
        setSellers(prev => prev.map(s => s.id === activeSellerId ? updatedSeller : s));
        alert("FreshNest seller profile updated successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSellerProfile(false);
    }
  };

  const handleCreateSellerProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSellerForm.name.trim() || !newSellerForm.email.trim() || !newSellerForm.shopName.trim()) {
      alert("Please add your name, email, and shop name to create a seller profile.");
      return;
    }

    try {
      setCreatingSellerProfile(true);
      const res = await fetch("/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSellerForm)
      });

      if (!res.ok) throw new Error("Could not create seller profile.");
      const createdSeller = await res.json();
      setSellers(prev => [createdSeller, ...prev.filter(seller => seller.id !== createdSeller.id)]);
      setActiveSellerId(createdSeller.id);
      localStorage.setItem("nidus_seller_session", createdSeller.id);
      setSellerEditForm({
        name: createdSeller.name,
        shopName: createdSeller.shopName,
        shopDescription: createdSeller.shopDescription,
        story: createdSeller.story,
        location: createdSeller.location,
        badge: createdSeller.badge,
        avatar: createdSeller.avatar,
        coverImage: createdSeller.coverImage
      });
      setNewSellerForm({
        name: "",
        email: "",
        shopName: "",
        shopDescription: "",
        story: "",
        location: "",
        badge: "Local Seller",
        avatar: "",
        coverImage: ""
      });
      setIsNewSellerFormOpen(false);
      alert("Seller profile created. You can now add products from this account.");
    } catch (err) {
      alert("Could not create the seller profile. Please try again.");
    } finally {
      setCreatingSellerProfile(false);
    }
  };

  const handleDeleteSellerProfile = async () => {
    if (!activeSellerObj) return;

    const confirmed = confirm(
      `Delete "${activeSellerObj.shopName}"?\n\nThis will remove the store and all product listings from the marketplace. Existing order history will remain for reference.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/sellers/${activeSellerObj.id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Could not delete seller profile.");
      const result = await res.json();
      const deletedProductIds: string[] = result.deletedProductIds || [];
      const remainingSellers = sellers.filter(seller => seller.id !== activeSellerObj.id);

      setSellers(remainingSellers);
      setProducts(prev => prev.filter(product => product.sellerId !== activeSellerObj.id));
      setBasket(prev => prev.filter(item => !deletedProductIds.includes(item.product.id)));
      localStorage.removeItem("nidus_seller_session");

      if (selectedSeller?.id === activeSellerObj.id) setSelectedSeller(null);
      if (selectedProduct && deletedProductIds.includes(selectedProduct.id)) setSelectedProduct(null);

      setActiveSellerId("");
      setSellerEditForm({
        name: "",
        shopName: "",
        shopDescription: "",
        story: "",
        location: "",
        badge: "",
        avatar: "",
        coverImage: ""
      });
      setIsNewSellerFormOpen(true);

      alert("Seller store deleted.");
    } catch (err) {
      alert("Could not delete the seller store. Please try again.");
    }
  };

  // 6. Delete listing Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to stop listing this artisanal product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Save/Publish Product (Add or Edit)
  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSellerId) {
      alert("Please create your seller profile first. After that, you can publish products from Seller Mode.");
      setIsNewSellerFormOpen(true);
      return;
    }
    if (!productForm.name.trim() || !productForm.description.trim()) {
      alert("Please add a product title and description before publishing.");
      return;
    }
    const freshDefaults = getDefaultFreshTrackValues();
    const preparedAt = productForm.preparedAt || freshDefaults.preparedAt;
    const packedAt = productForm.packedAt || freshDefaults.packedAt;
    const storageStartedAt = productForm.storageStartedAt || packedAt || freshDefaults.storageStartedAt;
    try {
      setSavingProduct(true);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProduct ? editingProduct.id : undefined,
          name: productForm.name,
          description: productForm.description,
          price: Number(productForm.price),
          category: productForm.category,
          image: productForm.image || defaultCottageImages[Math.floor(Math.random() * defaultCottageImages.length)],
          stock: Number(productForm.stock),
          sellerId: activeSellerId,
          tags: productForm.tagsString.split(",").map(s => s.trim()).filter(Boolean),
          freshnessType: productForm.freshnessType,
          preparedAt: toIsoDateTime(preparedAt),
          packedAt: toIsoDateTime(packedAt),
          storageStartedAt: toIsoDateTime(storageStartedAt),
          shelfLifeHours: Number(productForm.shelfLifeHours) || 24
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Could not publish this product.");
      }

      const savedProduct = await res.json();
      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === savedProduct.id ? savedProduct : p));
      } else {
        setProducts(prev => [savedProduct, ...prev]);
      }
      setIsProductFormOpen(false);
      setEditingProduct(null);
      // Reset state
      setProductForm({
        id: "",
        name: "",
        description: "",
        price: 12.00,
        category: "Food & Bakery",
        image: "",
        stock: 10,
        tagsString: "handmade, local",
        freshnessType: "prepared",
        ...getDefaultFreshTrackValues()
      });
      alert(editingProduct ? "Product updated successfully." : "Product published and live in the buyer marketplace.");
    } catch (err: any) {
      console.error(err);
      alert(`Could not publish product: ${err.message || "Please try again."}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      id: prod.id,
      name: prod.name,
      description: prod.description,
      price: prod.price,
      category: prod.category,
      image: prod.image,
      stock: prod.stock,
      tagsString: prod.tags.join(", "),
      freshnessType: prod.freshnessType || getDefaultFreshnessType(prod.category),
      preparedAt: toDateTimeLocalValue(prod.preparedAt),
      packedAt: toDateTimeLocalValue(prod.packedAt),
      storageStartedAt: toDateTimeLocalValue(prod.storageStartedAt || prod.packedAt),
      shelfLifeHours: prod.shelfLifeHours || 24
    });
    setIsProductFormOpen(true);
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm({
      id: "",
      name: "",
      description: "",
      price: 15.00,
      category: "Food & Bakery",
      image: "",
      stock: 8,
      tagsString: "authentic, local",
      freshnessType: "prepared",
      ...getDefaultFreshTrackValues()
    });
    setIsProductFormOpen(true);
  };

  // 8. Gemini AI calls for Store Narratives
  const handleAIGenerateStory = async () => {
    if (!aiStoryNotes.trim()) {
      alert("Please jot down some notes first (e.g. 'I carry Grandma's tradition, no artificial preservatives, double ferment Sourdough').");
      return;
    }
    try {
      setGeneratingStory(true);
      const res = await fetch("/api/gemini/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: aiStoryNotes,
          artisanName: sellerEditForm.name || "Cottage Artisan",
          specialty: sellerEditForm.shopName || "Our Local Shop Workspace"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSellerEditForm(prev => ({
          ...prev,
          story: data.story || prev.story,
          badge: data.tags && data.tags.length > 0 ? data.tags[0] : prev.badge
        }));
        setIsAIGeneryStoryOpen(false);
        setAiStoryNotes("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingStory(false);
    }
  };

  // 9. Gemini AI copywriting helper inside listing form
  const handleAIGenerateProductCopy = async () => {
    if (!productForm.name.trim()) {
      alert("Please type a product name first so the AI knows what to write about (e.g. 'Stained Glass Herb Jar').");
      return;
    }
    try {
      setGeneratingCopy(true);
      const res = await fetch("/api/gemini/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          category: productForm.category,
          keyFeatures: aiProductFeatures,
          materials: aiProductMaterials
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProductForm(prev => ({
          ...prev,
          description: data.description || prev.description,
          price: data.suggestedPrice || prev.price,
          tagsString: prev.tagsString + (data.bulletPoints ? ", " + data.bulletPoints.map((b: string) => b.toLowerCase()).join(", ") : "")
        }));
        setIsAICopywriterOpen(false);
        setAiProductFeatures("");
        setAiProductMaterials("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCopy(false);
    }
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const sendChatMessage = async (messageText?: string) => {
    const outgoing = (messageText ?? chatInput).trim();
    if (!outgoing || chatLoading) return;

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: outgoing }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/gemini/customer-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: outgoing,
          history: nextMessages.slice(-8).map(message => ({
            role: message.role === "assistant" ? "assistant" : "customer",
            content: message.content
          }))
        })
      });

      if (!res.ok) throw new Error("Chat request failed.");
      const data = await res.json();
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply || "I can help with store, product, and freshness questions."
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "I could not reach the AI assistant right now, but you can still browse products and FreshTrack scores on each listing."
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleProductImageUpload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProductForm(prev => ({ ...prev, image: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  // Filter buyers product list
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeSellerObj = sellers.find(s => s.id === activeSellerId);
  const activeSellerProducts = products.filter(p => p.sellerId === activeSellerId);
  const activeSellerOrders = orders.filter(o => o.items.some(item => item.sellerId === activeSellerId));

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-amber-100 selection:text-amber-800 flex flex-col font-sans">
      
      {/* Global state warnings if loading/error */}
      {loading && sellers.length === 0 && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
          <div className="relative flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600"></div>
            <Store className="absolute h-5 w-5 text-amber-600 animate-pulse" />
          </div>
          <p className="mt-4 font-mono text-xs text-stone-500 uppercase tracking-widest animate-bounce">
            Sprouting Local Marketplace...
          </p>
        </div>
      )}

      {!loading && !hasEnteredMarketplace && (
        <div className="min-h-screen bg-[#fff8ed] text-stone-950">
          <header className="fixed inset-x-0 top-0 z-50 border-b border-orange-100 bg-white/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <button
                onClick={() => setLandingPage("home")}
                className="flex items-center gap-3"
              >
                <img src={appLogoUrl} alt="FreshNest logo" className="h-11 w-11 rounded-2xl shadow-sm" />
                <div className="text-left">
                  <span className="block text-lg font-black leading-none tracking-tight">FreshNest</span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-600">Fresh local marketplace</span>
                </div>
              </button>

              <nav className="hidden items-center gap-1 md:flex">
                {[
                  { id: "home", label: "Home" },
                  { id: "about", label: "About" },
                  { id: "how", label: "How it works" },
                  { id: "sellers", label: "For sellers" }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setLandingPage(item.id as "home" | "about" | "how" | "sellers")}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      landingPage === item.id ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50 hover:text-orange-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <button
                onClick={() => {
                  setHasEnteredMarketplace(true);
                  setHasChosenEntryRole(false);
                }}
                className="rounded-full bg-stone-950 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
              >
                Enter Marketplace
              </button>
            </div>
          </header>

          <main className="pt-16">
            {landingPage === "home" && (
              <>
                <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
                  <img
                    src={freshNestLandingUrl}
                    alt="FreshNest fresh local market collage"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-linear-to-r from-white/92 via-white/22 to-white/0"></div>
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#fff8ed] to-transparent"></div>
                  <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 pb-24 pt-10 sm:px-6 lg:px-8">
                    <div className="max-w-lg space-y-5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/80 px-3.5 py-1 text-xs font-bold text-orange-700 shadow-sm backdrop-blur">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Freshness-first shopping
                      </span>
                      <div className="space-y-3">
                        <h1 className="font-serif text-5xl font-black leading-none tracking-tight sm:text-6xl">
                          Fresh local goods, checked before you buy.
                        </h1>
                        <p className="text-sm leading-relaxed text-stone-650 sm:text-base">
                          FreshNest helps buyers see prepared, harvested, collected, packed, and storage timing before purchase, powered by FreshTrack scores.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={() => {
                            setHasEnteredMarketplace(true);
                            setHasChosenEntryRole(false);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
                        >
                          Enter Marketplace <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setLandingPage("about")}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white/85 px-6 py-3.5 text-sm font-bold text-stone-850 shadow-sm backdrop-blur hover:bg-orange-50"
                        >
                          Learn about FreshTrack
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
                  {[
                    ["Live score", "Freshness score updates from declared shelf life and storage age."],
                    ["Food-aware labels", "Bread shows baked/prepared. Fruit shows harvested. Dairy shows collected."],
                    ["Buyer confidence", "Customers compare timing before adding anything to cart."]
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                      <h3 className="font-serif text-lg font-bold">{title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-stone-550">{body}</p>
                    </div>
                  ))}
                </section>
              </>
            )}

            {landingPage === "about" && (
              <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
                <div className="space-y-5">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-orange-600">About FreshNest</span>
                  <h1 className="font-serif text-5xl font-black leading-tight">A marketplace built around visible freshness.</h1>
                  <p className="text-sm leading-relaxed text-stone-600">
                    FreshNest solves the trust gap in online food and local shopping. Instead of only showing a price, every eligible listing can show when it was prepared, harvested, collected, processed, packed, and how fresh it is right now.
                  </p>
                  <button onClick={() => setLandingPage("how")} className="rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-white hover:bg-orange-600">
                    See how it works
                  </button>
                </div>
                <img src={freshNestLandingUrl} alt="FreshNest products" className="rounded-3xl border border-orange-100 shadow-xl" />
              </section>
            )}

            {landingPage === "how" && (
              <section className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="max-w-2xl space-y-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-orange-600">How it works</span>
                  <h1 className="font-serif text-5xl font-black">From seller timing to buyer confidence.</h1>
                </div>
                <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-4">
                  {[
                    ["1", "Seller lists product", "They choose food type, upload image, price, stock, and category."],
                    ["2", "Timing is declared", "Prepared, harvested, collected, or processed time is added with packed time."],
                    ["3", "FreshTrack scores it", "Storage age and shelf-life hours create a live freshness score."],
                    ["4", "Buyer shops smarter", "Customers inspect freshness before purchase and can ask the AI assistant."]
                  ].map(([step, title, body]) => (
                    <div key={step} className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 font-mono font-black text-white">{step}</span>
                      <h3 className="mt-4 font-serif text-lg font-bold">{title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-stone-550">{body}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {landingPage === "sellers" && (
              <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
                <div className="space-y-5">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-orange-600">For sellers</span>
                  <h1 className="font-serif text-5xl font-black leading-tight">Create your store and prove freshness clearly.</h1>
                  <p className="text-sm leading-relaxed text-stone-600">
                    Sellers can create a private profile, upload product photos from their device, set stock, add FreshTrack timing, manage orders, and talk to customers through transparent product data.
                  </p>
                  <button
                    onClick={() => {
                      setHasEnteredMarketplace(true);
                      setRole("seller");
                      setHasChosenEntryRole(true);
                      if (!activeSellerId) setIsNewSellerFormOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-white hover:bg-orange-600"
                  >
                    Start selling <Store className="h-4 w-4" />
                  </button>
                </div>
                <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl">
                  <h3 className="font-serif text-xl font-bold">Seller tools included</h3>
                  <div className="mt-5 grid gap-3 text-sm">
                    {["Private seller profile", "Device image upload", "Prepared/harvested/collected labels", "Packed and storage timing", "Order management", "AI writing helper"].map(item => (
                      <span key={item} className="flex items-center gap-2 text-stone-650">
                        <CheckCircle2 className="h-4 w-4 text-orange-500" /> {item}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      )}

      {hasEnteredMarketplace && !loading && !hasChosenEntryRole && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="bg-stone-950 p-8 text-white">
                <img
                  src={appLogoUrl}
                  alt="FreshNest logo"
                  className="h-16 w-16 rounded-2xl bg-white shadow-sm"
                />
                <span className="mt-6 block text-[11px] font-mono uppercase tracking-wider text-emerald-300">
                  FreshNest Marketplace
                </span>
                <h2 className="mt-2 font-serif text-3xl font-bold leading-tight">
                  What do you want to do here?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-stone-300">
                  Choose your starting role. Buyers can inspect freshness before purchase. Sellers can create a shop, add products, and publish FreshTrack timing.
                </p>
              </div>

              <div className="space-y-3 p-6">
                <button
                  onClick={() => {
                    setRole("buyer");
                    setHasChosenEntryRole(true);
                  }}
                  className="group w-full rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left transition hover:border-amber-200 hover:bg-amber-50"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 text-white">
                    <ShoppingBag className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-bold text-stone-950">I am a Buyer</h3>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    Browse stores, compare products, ask the AI assistant, and check FreshTrack scores before ordering.
                  </p>
                </button>

                <button
                  onClick={() => {
                    setRole("seller");
                    setHasChosenEntryRole(true);
                    setIsNewSellerFormOpen(true);
                  }}
                  className="group w-full rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Store className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-bold text-stone-950">I am a Seller</h3>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    Create a seller profile, list products, upload images, and add prepared/packed freshness details.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Navigation Hub */}
      {hasEnteredMarketplace && (
      <Navbar
        currentRole={currentRole}
        setRole={(role) => {
          setRole(role);
          setHasChosenEntryRole(true);
          if (role === "seller" && !activeSellerId) {
            setIsNewSellerFormOpen(true);
          }
          // Auto-reset state variables for clear navigation flow
          setSelectedSeller(null);
          setSelectedProduct(null);
        }}
        basketCount={basket.reduce((sum, item) => sum + item.quantity, 0)}
        openBasket={() => {
          setIsBasketOpen(true);
          setCheckoutStep("cart");
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      )}

      {/* Main Core Viewport */}
      {hasEnteredMarketplace && (
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Error notification banner if any */}
        {errorStatus && (
          <div className="mx-auto max-w-2xl mb-8 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-stone-900 shadow-xs">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            <div className="text-sm">
              <span className="font-semibold text-rose-800">Connection Interrupted:</span> {errorStatus}
            </div>
            <button 
              onClick={fetchAllData} 
              className="ml-auto rounded-lg bg-stone-900 px-3 py-1.5 text-xs text-white hover:bg-stone-800"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* BUYER VIEW: IMMERSIVE LOCAL SHOPPING HUB */}
        {/* ========================================== */}
        {currentRole === "buyer" && (
          <div className="space-y-12">
            {/* 1. FRESHNEST LANDING HERO */}
            <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#fffaf1]">
              <div className="relative min-h-[calc(100vh-4rem)]">
                <img
                  src={freshNestLandingUrl}
                  alt="FreshNest fresh local marketplace collage"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-linear-to-r from-white/92 via-white/22 to-white/0"></div>
                <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-stone-50 to-transparent"></div>

                <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 pb-24 pt-10 sm:px-6 lg:px-8">
                  <div className="max-w-lg space-y-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/80 px-3.5 py-1 text-xs font-bold text-orange-700 shadow-sm backdrop-blur">
                      <Sparkles className="h-3.5 w-3.5" /> Freshness-first local shopping
                    </span>
                    <div className="space-y-3">
                      <h2 className="font-serif text-5xl font-black leading-none tracking-tight text-stone-950 sm:text-6xl">
                        Fresh local goods, checked before you buy.
                      </h2>
                      <p className="max-w-lg text-sm leading-relaxed text-stone-650 sm:text-base">
                        Shop fruits, bakery, dairy, homemade food, wellness goods, and handmade finds with live FreshTrack timing for packed, harvested, collected, or prepared products.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => {
                          const elem = document.getElementById("freshnest-market");
                          if (elem) elem.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600"
                      >
                        Shop FreshNest <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCategory("Food & Bakery");
                          const elem = document.getElementById("freshnest-market");
                          if (elem) elem.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white/80 px-6 py-3.5 text-sm font-bold text-stone-850 shadow-sm backdrop-blur transition hover:bg-orange-50"
                      >
                        Browse fresh food
                      </button>
                      <button
                        onClick={() => setRole("seller")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white/70 px-6 py-3.5 text-sm font-bold text-stone-750 backdrop-blur transition hover:bg-white"
                      >
                        <Store className="h-4 w-4" /> Sell on FreshNest
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="rounded-xl border border-orange-100 bg-white/80 px-3 py-3 shadow-sm backdrop-blur">
                        <span className="block font-mono text-lg font-black text-orange-600">Live</span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Fresh scores</span>
                      </div>
                      <div className="rounded-xl border border-orange-100 bg-white/80 px-3 py-3 shadow-sm backdrop-blur">
                        <span className="block font-mono text-lg font-black text-orange-600">24/7</span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">AI helper</span>
                      </div>
                      <div className="rounded-xl border border-orange-100 bg-white/80 px-3 py-3 shadow-sm backdrop-blur">
                        <span className="block font-mono text-lg font-black text-orange-600">Local</span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Pickup ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-xs sm:grid-cols-3">
              <div className="sm:col-span-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700">Buyer Mode</span>
                <h2 className="mt-1 font-serif text-2xl font-bold text-stone-900">Shop products and place orders</h2>
                <p className="mt-1 text-sm text-stone-500">Use this side to browse sellers, add items to your cart, and submit an order. Nothing is sent by you when you add to cart.</p>
              </div>
              <button
                onClick={() => setRole("seller")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 hover:bg-amber-100"
              >
                <Store className="h-4 w-4" /> Switch to Seller
              </button>
            </div>

            {/* Previous demo hero retained but hidden after FreshNest landing redesign */}
            <div className="hidden">
              <div className="absolute right-0 top-0 -mr-24 -mt-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
              <div className="absolute left-1/3 bottom-0 -mb-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl pointer-events-none"></div>
              
              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300">
                    <Sparkles className="h-3.5 w-3.5" /> Buyer Marketplace
                  </span>
                  <h2 className="text-4xl font-serif font-extrabold tracking-tight sm:text-5xl text-white leading-tight">
                    Buy directly from local artisans.
                  </h2>
                  <p className="text-amber-100/80 leading-relaxed text-sm md:text-base">
                    Every handloom weave, sun-cured jar, and terracotta tea cup is infused with ancestral devotion. Buy directly from Indian home artisans, hill apiarists, and family preserve kitchens—retaining 100% of receipts inside regional artisan clusters.
                  </p>
                  
                  {/* Action row with search trigger and smooth-scroll CTA */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        const elem = document.getElementById("freshnest-market");
                        if (elem) elem.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-6 py-3.5 text-sm font-bold shadow-md shadow-amber-950/20 transition-all duration-200"
                    >
                      Browse FreshNest Market <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory("Handmade Home");
                        const elem = document.getElementById("freshnest-market");
                        if (elem) elem.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-600/30 bg-amber-950/30 hover:bg-amber-950/50 text-amber-200 px-6 py-3.5 text-sm font-semibold transition"
                    >
                      Explore Handlooms
                    </button>
                  </div>

                  {/* Trust markers */}
                  <div className="pt-4 flex flex-wrap gap-x-6 gap-y-3 text-xs font-mono text-amber-200/70 border-t border-amber-900/30">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> 100% Direct to Artisan
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Zero Chemical Fillers
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Carbon-Neutral Shipments
                    </span>
                  </div>
                </div>

                {/* Hero visual promo */}
                <div className="lg:col-span-5 hidden lg:block relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-amber-900/10">
                  <img
                    src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600"
                    alt="Indian artisan weaving at foot loom"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15 text-xs text-white">
                    <p className="font-semibold text-amber-300 font-serif">Featured FreshNest aisle</p>
                    <p className="text-[11px] opacity-90 mt-0.5">Six tribal women-spinners practicing 36-hour organic vegetable indigo dyeing.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. THE SWADESHI HERITAGE BENTO GRID: COMPREHENSIVE NARRATIVE & CONVERSIONS */}
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h3 className="font-serif text-2xl font-black text-stone-900">Shop The FreshNest Aisles</h3>
                <p className="text-xs text-stone-500 font-mono tracking-wider uppercase">Click any aisle card to filter the market instantly</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Bento Card 1: Fresh Produce */}
                <div 
                  onClick={() => {
                    setSelectedCategory("Fruits");
                    setSearchQuery("");
                    const elem = document.getElementById("freshnest-market");
                    if (elem) elem.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="md:col-span-7 group cursor-pointer overflow-hidden rounded-3xl border border-stone-200/60 bg-gradient-to-br from-amber-50 to-orange-100/30 p-6 flex flex-col justify-between hover:border-amber-400 transition hover:-translate-y-1 h-64 md:h-72"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <span className="inline-block rounded-md bg-amber-100 text-amber-900 font-mono text-[9px] font-bold px-2 py-0.5 uppercase">Fresh produce</span>
                      <h4 className="text-xl font-serif font-black text-stone-900 group-hover:text-amber-800 transition">Fruits, baskets, and daily harvests</h4>
                      <p className="text-stone-605 text-xs leading-relaxed max-w-sm">
                        Seasonal fruit, vegetables, herbs, and pantry extras with harvested time, packed time, and freshness score shown before checkout.
                      </p>
                    </div>
                    <span className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-amber-700 shadow-sm border border-stone-100 group-hover:scale-110 transition shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex items-center gap-4 overflow-hidden pt-4 shrink-0">
                    <img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=200" className="h-14 w-14 object-cover rounded-xl border border-stone-100" />
                    <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=200" className="h-14 w-14 object-cover rounded-xl border border-stone-100" />
                    <span className="text-[11px] font-mono font-medium text-stone-400 group-hover:text-amber-700 transition">View produce and fresh baskets...</span>
                  </div>
                </div>

                {/* Bento Card 2: Bakery and Pantry */}
                <div 
                  onClick={() => {
                    setSelectedCategory("Food & Bakery");
                    setSearchQuery("");
                    const elem = document.getElementById("freshnest-market");
                    if (elem) elem.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="md:col-span-5 group cursor-pointer overflow-hidden rounded-3xl border border-stone-200/60 bg-gradient-to-br from-indigo-50/40 to-indigo-100/10 p-6 flex flex-col justify-between hover:border-indigo-400 transition hover:-translate-y-1 h-64 md:h-72"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <span className="inline-block rounded-md bg-indigo-100 text-indigo-900 font-mono text-[9px] font-bold px-2 py-0.5 uppercase">Bakery and pantry</span>
                      <h4 className="text-xl font-serif font-black text-stone-900 group-hover:text-indigo-850 transition">Baked, packed, and ready today</h4>
                      <p className="text-stone-605 text-xs leading-relaxed">
                        Bread, honey, cookies, pickles, snacks, and homemade foods with prepared or baked times clearly shown.
                      </p>
                    </div>
                    <span className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-indigo-700 shadow-sm border border-stone-100 group-hover:scale-110 transition shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-3">
                    <img src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=150" className="h-12 w-12 object-cover rounded-lg" />
                    <span className="text-[11px] font-mono text-stone-450">Fresh breads, jars, cookies, and pantry staples.</span>
                  </div>
                </div>

                {/* Bento Card 3: Handmade Home */}
                <div 
                  onClick={() => {
                    setSelectedCategory("Handmade Home");
                    setSearchQuery("");
                    const elem = document.getElementById("freshnest-market");
                    if (elem) elem.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="md:col-span-5 group cursor-pointer overflow-hidden rounded-3xl border border-stone-200/60 bg-gradient-to-br from-emerald-50/30 to-emerald-100/10 p-6 flex flex-col justify-between hover:border-emerald-400 transition hover:-translate-y-1 h-64"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <span className="inline-block rounded-md bg-emerald-100 text-emerald-900 font-mono text-[9px] font-bold px-2 py-0.5 uppercase">Handmade home</span>
                      <h4 className="text-xl font-serif font-black text-stone-900 group-hover:text-emerald-850 transition">Baskets, textiles, and home goods</h4>
                      <p className="text-stone-605 text-xs leading-relaxed">
                        Local home goods, decor, bags, baskets, and everyday handmade pieces from nearby sellers.
                      </p>
                    </div>
                    <span className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-emerald-700 shadow-sm border border-stone-100 group-hover:scale-110 transition shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <img src="https://images.unsplash.com/photo-1595039838779-f3780873afdd?auto=format&fit=crop&q=80&w=150" className="h-12 w-12 object-cover rounded-lg" />
                    <span className="text-[11px] font-mono text-stone-450">Woven baskets, textiles, cups, and useful goods.</span>
                  </div>
                </div>

                {/* Bento Card 4: Wellness and Gifts */}
                <div 
                  onClick={() => {
                    setSelectedCategory("Beauty & Apothecary");
                    setSearchQuery("");
                    const elem = document.getElementById("freshnest-market");
                    if (elem) elem.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="md:col-span-7 group cursor-pointer overflow-hidden rounded-3xl border border-stone-200/60 bg-gradient-to-br from-rose-50/40 to-rose-100/10 p-6 flex flex-col justify-between hover:border-rose-400 transition hover:-translate-y-1 h-64"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <span className="inline-block rounded-md bg-rose-100 text-rose-900 font-mono text-[9px] font-bold px-2 py-0.5 uppercase">Wellness and gifts</span>
                      <h4 className="text-xl font-serif font-black text-stone-900 group-hover:text-rose-800 transition">Small-batch care and gifting</h4>
                      <p className="text-stone-605 text-xs leading-relaxed max-w-sm font-sans">
                        Soaps, herbal blends, gift boxes, fresh pantry bundles, and small handmade extras with seller stories attached.
                      </p>
                    </div>
                    <span className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-rose-700 shadow-sm border border-stone-100 group-hover:scale-110 transition shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex items-center gap-4 overflow-hidden pt-4 shrink-0">
                    <img src="https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=200" className="h-14 w-14 object-cover rounded-xl" />
                    <span className="text-[11px] font-mono font-medium text-stone-400 group-hover:text-rose-700 transition">Care goods, gifts, and local favorites.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. INTERACTIVE AISLE FILTERS */}
            <div className="rounded-2xl border border-orange-100 bg-white p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500 animate-bounce" /> Filter FreshNest by aisle
                  </h4>
                  <p className="text-xs text-stone-500">Jump between fresh food, produce, dairy, meat, wellness, and handmade local goods</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                    className={`rounded-xl px-4 py-2 text-xs font-mono font-bold transition border ${
                      !searchQuery ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200"
                    }`}
                  >
                    All Aisles
                  </button>
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedCategory("Fruits"); }}
                    className={`rounded-xl px-4 py-2 text-xs font-mono font-bold transition border ${
                      selectedCategory === "Fruits" ? "bg-amber-600 text-white border-amber-600" : "bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200"
                    }`}
                  >
                    Fruits
                  </button>
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedCategory("Vegetables"); }}
                    className={`rounded-xl px-4 py-2 text-xs font-mono font-bold transition border ${
                      selectedCategory === "Vegetables" ? "bg-amber-600 text-white border-amber-600" : "bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200"
                    }`}
                  >
                    Vegetables
                  </button>
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedCategory("Dairy"); }}
                    className={`rounded-xl px-4 py-2 text-xs font-mono font-bold transition border ${
                      selectedCategory === "Dairy" ? "bg-amber-600 text-white border-amber-600" : "bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200"
                    }`}
                  >
                    Dairy
                  </button>
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedCategory("Meat"); }}
                    className={`rounded-xl px-4 py-2 text-xs font-mono font-bold transition border ${
                      selectedCategory === "Meat" ? "bg-amber-600 text-white border-amber-600" : "bg-stone-50 text-stone-600 hover:bg-stone-100 border-stone-200"
                    }`}
                  >
                    Meat
                  </button>
                </div>
              </div>
            </div>

            {/* 4. MEET THE ARTISANS RAIL - HIGHLIGHTING THE HUMAN FACES */}
            <div className="space-y-4">
              <div className="flex items-end justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-serif text-xl font-bold text-stone-900">Meet Local Sellers</h3>
                  <p className="text-xs text-stone-500">Browse seller shops, stories, and products before you order</p>
                </div>
                <span className="text-xs font-mono text-stone-400 uppercase tracking-widest">{sellers.length} active sellers</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sellers.map((seller) => (
                  <div
                    key={seller.id}
                    onClick={() => setSelectedSeller(seller)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-stone-150/70 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xs focus-within:ring-2 focus-within:ring-amber-500"
                    id={`seller-card-${seller.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={seller.avatar}
                        alt={seller.name}
                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-stone-100 group-hover:ring-amber-200 transition"
                      />
                      <div className="space-y-1">
                        <span className="inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                          {seller.badge || "Local Artisan"}
                        </span>
                        <h4 className="font-bold text-sm text-stone-900 group-hover:text-amber-700 transition leading-normal">
                          {seller.shopName}
                        </h4>
                        <p className="text-xs text-stone-505 font-mono">{seller.location}</p>
                      </div>
                    </div>
                    
                    <p className="mt-3.5 line-clamp-2 text-xs text-stone-600 leading-relaxed">
                      {seller.shopDescription}
                    </p>

                    <div className="mt-4 pt-3.5 border-t border-stone-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 font-medium text-stone-800">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span>{seller.rating.toFixed(1)}</span>
                      </div>
                      <span className="font-medium text-amber-600 group-hover:translate-x-1 transition flex items-center gap-0.5">
                        Read Story <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. THE MARKETPLACE BAZAAR ZONE (GRID CARD LAYOUTS) */}
            <div id="freshnest-market" className="space-y-6 pt-6 border-t border-orange-100 scroll-mt-24">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-stone-100 pb-5">
                <div>
                  <h3 className="font-serif text-2xl font-black text-stone-900">The FreshNest Market</h3>
                  <p className="text-sm text-stone-500 font-sans">Pick from fresh food, produce, dairy, bakery, wellness goods, and handmade local finds</p>
                </div>
                
                {/* Active search queries text feedback */}
                {(searchQuery || selectedCategory !== "All") && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 font-mono">
                      Found {filteredProducts.length} items
                      {selectedCategory !== "All" && ` in "${selectedCategory}"`}
                      {searchQuery && ` matching "${searchQuery}"`}
                    </span>
                    <button
                      onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                      className="rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-600 hover:bg-stone-200 font-mono"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-stone-200 px-6 py-16 text-center max-w-lg mx-auto">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                    <Search className="h-6 w-6" />
                  </div>
                  <h4 className="mt-4 font-bold text-stone-950">No FreshNest products found.</h4>
                  <p className="mt-2 text-sm text-stone-500">Try adjusting your region pills or searching for ingredients like "honey" or "pickle".</p>
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition"
                  >
                    Reset FreshNest Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const seller = sellers.find(s => s.id === product.sellerId);
                    const isFavorited = favorites.includes(product.id);
                    const freshTrack = getFreshTrack(product, freshnessNow);
                    
                    return (
                      <div
                        key={product.id}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/50 bg-white transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-md"
                        id={`product-card-${product.id}`}
                      >
                        {/* Imageline with tags overlay */}
                        <div className="relative aspect-video w-full overflow-hidden bg-stone-100 border-b border-stone-100">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(product.id);
                            }}
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition hover:scale-110 hover:text-rose-600 focus:outline-hidden"
                          >
                            <Heart className={`h-4.5 w-4.5 ${isFavorited ? "fill-rose-500 text-rose-500" : ""}`} />
                          </button>
                          
                          {/* Stock status indicator labels */}
                          {product.stock <= 0 ? (
                            <span className="absolute left-3 top-3 rounded-md bg-stone-900/90 px-2 py-1 text-[10px] font-bold text-white tracking-wider uppercase font-mono">
                              Sold Out
                            </span>
                          ) : product.stock <= 3 ? (
                            <span className="absolute left-3 top-3 rounded-md bg-amber-600/90 px-2 py-1 text-[10px] font-bold text-white tracking-wider uppercase font-mono animate-pulse">
                              Only {product.stock} Left!
                            </span>
                          ) : null}

                          <span className="absolute bottom-3 left-3 rounded-md bg-stone-900/85 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-amber-400 tracking-wider font-mono">
                            {product.category}
                          </span>
                        </div>

                        {/* Product Body details */}
                        <div className="flex-1 p-5 space-y-3 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            {seller && (
                              <button
                                onClick={() => setSelectedSeller(seller)}
                                className="flex items-center gap-1.5 hover:text-amber-700 text-stone-500 text-xs text-left"
                              >
                                <img src={seller.avatar} className="h-4.5 w-4.5 rounded-full object-cover" />
                                <span className="font-semibold underline decoration-stone-200 hover:decoration-amber-500">
                                  {seller.shopName}
                                </span>
                              </button>
                            )}

                            <h4 
                              onClick={() => setSelectedProduct(product)}
                              className="font-bold text-base text-stone-900 hover:text-amber-700 transition line-clamp-1 cursor-pointer font-serif"
                            >
                              {product.name}
                            </h4>

                            <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                FreshTrack
                              </span>
                              <span className="font-mono text-sm font-black text-emerald-950">
                                {freshTrack.score}/100
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white">
                              <div
                                className={`h-full rounded-full ${freshTrack.score >= 85 ? "bg-emerald-500" : freshTrack.score >= 65 ? "bg-lime-500" : freshTrack.score >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                                style={{ width: `${freshTrack.score}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] leading-normal text-stone-600">
                              <span><strong className="text-stone-800">{getFreshnessTypeLabel(product)}:</strong> {formatFreshDateTime(product.preparedAt)}</span>
                              <span><strong className="text-stone-800">Packed:</strong> {formatFreshDateTime(product.packedAt)}</span>
                            </div>
                          </div>

                          {/* Price & Rating line */}
                          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                            <div>
                              <span className="font-mono text-amber-800 text-xs font-semibold mr-1">INR</span>
                              <span className="font-mono text-lg font-bold text-amber-950">₹{product.price.toLocaleString("en-IN")}</span>
                            </div>

                            <div className="flex items-center gap-1 text-xs">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-stone-900">{product.rating.toFixed(1)}</span>
                              <span className="text-stone-400 font-mono">({product.reviewsCount})</span>
                            </div>
                          </div>

                          {/* Add to Basket and Quick view actions */}
                          <div className="pt-2 flex items-center gap-2">
                            <button
                              onClick={() => setSelectedProduct(product)}
                              className="flex-1 rounded-xl border border-stone-200 bg-white py-2 text-center text-xs font-semibold text-stone-750 hover:bg-stone-50 transition"
                            >
                              Story & Reviews
                            </button>
                            <button
                              id={`btn-add-cart-${product.id}`}
                              disabled={product.stock <= 0}
                              onClick={() => addToBasket(product)}
                              className={`flex h-9 items-center justify-center rounded-xl px-4 text-xs font-bold transition duration-205 ${
                                product.stock <= 0
                                  ? "bg-stone-105 text-stone-400 cursor-not-allowed"
                                  : "bg-amber-600 hover:bg-amber-700 text-white shadow-xs shadow-amber-600/10"
                              }`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick FreshNest trust block */}
            <div className="rounded-3xl bg-[#fff2dc] border border-orange-200/60 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="space-y-2">
                <h4 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Feather className="h-5 w-5 text-orange-500" /> Freshness you can inspect
                </h4>
                <p className="max-w-2xl text-stone-605 text-sm leading-relaxed font-sans">
                  FreshNest shows what sellers usually keep hidden: when a product was prepared, harvested, collected, processed, packed, and how long it has been stored.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <div className="text-center bg-white px-5 py-3.5 rounded-2xl border border-stone-150">
                  <span className="block font-mono text-xl font-black text-orange-600">100</span>
                  <span className="text-[10px] text-stone-405 font-mono uppercase tracking-wider block">Fresh score</span>
                </div>
                <div className="text-center bg-white px-5 py-3.5 rounded-2xl border border-stone-150">
                  <span className="block font-mono text-xl font-black text-orange-600">Live</span>
                  <span className="text-[10px] text-stone-405 font-mono uppercase tracking-wider block">Timing data</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* SELLER ROLE: THE ARTISAN PORTAL CONTROL */}
        {/* ========================================== */}
        {currentRole === "seller" && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-100 bg-white p-4 shadow-xs sm:grid-cols-3">
              <div className="sm:col-span-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700">Seller Mode</span>
                <h2 className="mt-1 font-serif text-2xl font-bold text-stone-900">Manage your shop, products, and orders</h2>
                <p className="mt-1 text-sm text-stone-500">Use this side to edit your seller profile, publish listings, and update orders placed by buyers.</p>
              </div>
              <button
                onClick={() => setRole("buyer")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold text-stone-800 hover:bg-stone-100"
              >
                <ShoppingBag className="h-4 w-4" /> Switch to Buyer
              </button>
            </div>
            
            {/* Private seller session bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-950 text-white">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">Your Seller Account</span>
                  <h3 className="text-sm font-bold text-stone-950">
                    {activeSellerObj ? activeSellerObj.shopName : "No seller profile created yet"}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {activeSellerObj ? "Only this store can be edited in this browser session." : "Create your store to unlock product listing and order tools."}
                  </p>
                </div>
              </div>

              {/* Quick instructions indicator */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  onClick={() => setIsNewSellerFormOpen(prev => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  {activeSellerObj ? "Create Different Store" : "Create Seller Profile"}
                </button>
                <button
                  onClick={handleDeleteSellerProfile}
                  disabled={!activeSellerObj}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Store
                </button>
              </div>
            </div>

            {isNewSellerFormOpen && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 shadow-xs">
                <div className="flex items-start justify-between gap-4 border-b border-emerald-100 pb-4">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-800">New Seller Registration</span>
                    <h3 className="mt-1 font-serif text-xl font-bold text-stone-950">Create your seller profile</h3>
                    <p className="mt-1 text-xs text-stone-600">After this, your new shop becomes the active seller and you can add products with FreshTrack timing.</p>
                  </div>
                  <button
                    onClick={() => setIsNewSellerFormOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-stone-500 hover:text-stone-800"
                    title="Close new seller form"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateSellerProfile} className="mt-5 grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1.5">Your Name *</label>
                    <input
                      type="text"
                      value={newSellerForm.name}
                      onChange={(e) => setNewSellerForm({ ...newSellerForm, name: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                      placeholder="Aarav Sharma"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={newSellerForm.email}
                      onChange={(e) => setNewSellerForm({ ...newSellerForm, email: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                      placeholder="seller@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1.5">Shop Name *</label>
                    <input
                      type="text"
                      value={newSellerForm.shopName}
                      onChange={(e) => setNewSellerForm({ ...newSellerForm, shopName: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                      placeholder="Morning Basket Bakery"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1.5">Seller Badge</label>
                    <input
                      type="text"
                      value={newSellerForm.badge}
                      onChange={(e) => setNewSellerForm({ ...newSellerForm, badge: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                      placeholder="Fresh Food Maker"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1.5">Location</label>
                    <input
                      type="text"
                      value={newSellerForm.location}
                      onChange={(e) => setNewSellerForm({ ...newSellerForm, location: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                      placeholder="Pune, Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-stone-700 mb-1.5">Short Shop Description *</label>
                    <input
                      type="text"
                      value={newSellerForm.shopDescription}
                      onChange={(e) => setNewSellerForm({ ...newSellerForm, shopDescription: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                      placeholder="Fresh breads, homemade snacks, and same-day packed food."
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-medium text-stone-700 mb-1.5">Shop Story</label>
                    <textarea
                      rows={3}
                      value={newSellerForm.story}
                      onChange={(e) => setNewSellerForm({ ...newSellerForm, story: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                      placeholder="Tell buyers what you make, how you prepare it, and why they can trust your freshness data."
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsNewSellerFormOpen(false)}
                      className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 font-bold text-stone-700 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingSellerProfile}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:bg-stone-300"
                    >
                      {creatingSellerProfile ? "Creating Seller..." : "Create Seller Profile"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeSellerObj ? (
            <>
            {/* Seller Two Column Workspace layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Store Profile Creator & Story Narrator Form with Gemini Integration */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-50 pb-3">
                    <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                      <Settings className="h-5 w-5 text-amber-600 animate-spin-slow" /> Store Customizer
                    </h3>
                    <span className="text-xs font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-700 uppercase">Profile Settings</span>
                  </div>

                  <form onSubmit={handleSaveSellerProfile} className="space-y-4 text-xs">
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block font-medium text-stone-700 mb-1.5">Artisan Legal Name *</label>
                        <input
                          type="text"
                          value={sellerEditForm.name}
                          onChange={(e) => setSellerEditForm({ ...sellerEditForm, name: e.target.value })}
                          className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900 text-xs"
                          placeholder="Elena Rostova..."
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1.5">Guild Badge Title</label>
                        <input
                          type="text"
                          value={sellerEditForm.badge}
                          onChange={(e) => setSellerEditForm({ ...sellerEditForm, badge: e.target.value })}
                          className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900 text-xs"
                          placeholder="Master Sourdough Baker..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-stone-700 mb-1.5">Shop / Cottage Name *</label>
                      <input
                        type="text"
                        value={sellerEditForm.shopName}
                        onChange={(e) => setSellerEditForm({ ...sellerEditForm, shopName: e.target.value })}
                        className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900 text-xs"
                        placeholder="Elena's Sourdough & Hearth..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-stone-700 mb-1.5">Quick Intro Description (pitch) *</label>
                      <input
                        type="text"
                        value={sellerEditForm.shopDescription}
                        onChange={(e) => setSellerEditForm({ ...sellerEditForm, shopDescription: e.target.value })}
                        className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900 text-xs"
                        placeholder="Artisanal naturally leavened breads, handcrafted pastries..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-stone-700 mb-1.5">Location Radius (e.g. Oakridge Valley - 2mi away)</label>
                      <input
                        type="text"
                        value={sellerEditForm.location}
                        onChange={(e) => setSellerEditForm({ ...sellerEditForm, location: e.target.value })}
                        className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900 text-xs"
                        placeholder="Oakridge Valley - 1.2 miles away"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block font-medium text-stone-700 mb-1.5">Avatar Photo URL</label>
                        <input
                          type="text"
                          value={sellerEditForm.avatar}
                          onChange={(e) => setSellerEditForm({ ...sellerEditForm, avatar: e.target.value })}
                          className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-905 text-[11px]"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-stone-700 mb-1.5">Cover Header URL</label>
                        <input
                          type="text"
                          value={sellerEditForm.coverImage}
                          onChange={(e) => setSellerEditForm({ ...sellerEditForm, coverImage: e.target.value })}
                          className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-905 text-[11px]"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    {/* Store Story box with prominent Gemini Call tool */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block font-medium text-stone-705">Engaging Story Bio (Cottage Background)</label>
                        <button
                          type="button"
                          onClick={() => setIsAIGeneryStoryOpen(true)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-850 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                        >
                          <Sparkles className="h-3 w-3 text-amber-600" /> AI Storyteller Helper
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={sellerEditForm.story}
                        onChange={(e) => setSellerEditForm({ ...sellerEditForm, story: e.target.value })}
                        className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900 text-xs leading-relaxed"
                        placeholder="Elena bakes naturally leavened bread utilizing our grandparent's unique heirloom sourdough cultures dating back from..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingSellerProfile}
                      className="w-full bg-stone-950 text-white rounded-xl py-3 font-semibold hover:bg-stone-850 active:bg-stone-900 transition flex items-center justify-center gap-2 text-xs"
                    >
                      {savingSellerProfile ? (
                        <>
                          <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                          Publishing Shop Profile Changes...
                        </>
                      ) : (
                        <>
                          <Check className="h-4.5 w-4.5" />
                          Save & Sync Store Profile
                        </>
                      )}
                    </button>

                  </form>
                </div>

                {/* AI generated story helper sub-modal popup overlay */}
                {isAIGeneryStoryOpen && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 mt-4 space-y-3 relative">
                    <button 
                      onClick={() => setIsAIGeneryStoryOpen(false)}
                      className="absolute top-2 right-2 text-stone-400 hover:text-stone-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-700 animate-pulse" />
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider font-mono">Gemini AI Storefront Storyteller</h4>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-normal">
                      We'll generate a beautiful, authentic human-focused store story. Just write a few quick features you want highlighted (e.g. ingrediens, family history, certifications).
                    </p>
                    <textarea
                      rows={3}
                      value={aiStoryNotes}
                      placeholder="e.g., Fresh breads, produce boxes, dairy, handmade home goods, and packed timing you want buyers to trust."
                      onChange={(e) => setAiStoryNotes(e.target.value)}
                      className="w-full rounded-xl border border-amber-200 bg-white p-2.5 text-xs outline-hidden focus:ring-1 focus:ring-amber-500 text-stone-905"
                    />
                    <div className="flex items-center justify-end gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setIsAIGeneryStoryOpen(false)}
                        className="text-stone-550 hover:text-stone-700 px-3 py-1 bg-white border border-stone-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={generatingStory}
                        onClick={handleAIGenerateStory}
                        className="bg-amber-600 text-white rounded-lg px-4 py-1.5 font-bold hover:bg-amber-700 flex items-center gap-1.5"
                      >
                        {generatingStory ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" /> Drafting Story...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" /> Compose Story Bio
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Listings Manager Panel & local Fulfillment queue */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Product Listings grid of active seller */}
                <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-stone-900">Listed Products</h3>
                      <p className="text-xs text-stone-500">Edit, inspect, delete, or add new catalog coordinates</p>
                    </div>
                    <button
                      id="btn-add-new-prod"
                      onClick={openCreateProduct}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-705 transition cursor-pointer"
                    >
                      <PlusCircle className="h-4 w-4" /> Add Item Listing
                    </button>
                  </div>

                  {/* Listings table helper representation */}
                  {activeSellerProducts.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl">
                      <p className="text-xs text-stone-500 font-mono">No active product listings on this store.</p>
                      <button onClick={openCreateProduct} className="text-xs text-amber-700 underline font-bold mt-1.5">Put first listing live</button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {activeSellerProducts.map((p) => {
                        const freshTrack = getFreshTrack(p, freshnessNow);
                        return (
                        <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-stone-50 bg-stone-50/50 hover:bg-stone-50 hover:border-amber-200 gap-4 transition">
                          <div className="flex items-center gap-3">
                            <img src={p.image} className="h-11 w-11 object-cover rounded-lg border border-stone-200 shrink-0" />
                            <div className="space-y-1">
                              <h5 className="font-bold text-xs text-stone-905">{p.name}</h5>
                              <p className="text-[11px] text-stone-550 flex flex-wrap items-center gap-1.5">
                                <span className="bg-white px-1.5 border border-stone-200 rounded font-mono">₹{p.price.toLocaleString("en-IN")}</span>
                                <span className="font-mono">Stock level: <strong>{p.stock} units</strong></span>
                                <span className="bg-amber-50 text-amber-800 text-[9px] px-1 rounded font-medium">{p.category}</span>
                                <span className="bg-emerald-50 text-emerald-800 text-[9px] px-1 rounded font-bold font-mono">
                                  FreshTrack {freshTrack.score}/100
                                </span>
                              </p>
                              <p className="text-[10px] text-stone-400 font-mono">
                                {getFreshnessTypeLabel(p)} {formatFreshDateTime(p.preparedAt)} | Packed {formatFreshDateTime(p.packedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 justify-end">
                            <button
                              onClick={() => openEditProduct(p)}
                              className="rounded-lg bg-white p-2 border border-stone-200 text-stone-600 hover:text-amber-800 hover:border-amber-200 flex items-center justify-center transition"
                              title="Edit product data"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="rounded-lg bg-white p-2 border border-stone-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition"
                              title="Remove listing from store"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )})}
                    </div>
                  )}
                </div>

                {/* Seller product add/edit dialog drawer representation */}
                {isProductFormOpen && (
                  <div className="rounded-2xl border border-amber-650 bg-radial from-amber-50/60 to-white p-6 shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2 text-stone-950 font-serif font-bold text-base">
                        <Feather className="h-5 w-5 text-amber-600" />
                        <span>{editingProduct ? "Edit Listed Product" : "List New Cottagework Product"}</span>
                      </div>
                      <button onClick={() => setIsProductFormOpen(false)} className="text-stone-400 hover:text-stone-700">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block font-medium text-stone-700 mb-1">Product Title *</label>
                          <input
                            type="text"
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900"
                            placeholder="Herb Roasted Focaccia Bread..."
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-stone-700 mb-1">Market Category *</label>
                          <select
                            value={productForm.category}
                            onChange={(e) => {
                              const category = e.target.value;
                              setProductForm({
                                ...productForm,
                                category,
                                freshnessType: getDefaultFreshnessType(category)
                              });
                            }}
                            className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900"
                          >
                            {freshProductCategories.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block font-medium text-stone-750 mb-1">Price per unit (INR) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={productForm.price || ""}
                            onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                            className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900"
                            placeholder="9.50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-stone-750 mb-1">Quantity Stock Limit *</label>
                          <input
                            type="number"
                            value={productForm.stock || ""}
                            onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                            className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900"
                            placeholder="5"
                            required
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                            FreshTrack Timing
                          </span>
                          <span className="text-[10px] font-mono text-emerald-800">Shown before purchase</span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="block font-medium text-stone-700 mb-1">Freshness Event Type *</label>
                            <select
                              value={productForm.freshnessType}
                              onChange={(e) => setProductForm({ ...productForm, freshnessType: e.target.value as "prepared" | "harvested" | "collected" | "processed" })}
                              className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                            >
                              <option value="prepared">Cooked / Baked / Prepared</option>
                              <option value="harvested">Harvested / Picked</option>
                              <option value="collected">Collected / Milked</option>
                              <option value="processed">Processed / Cut</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-1">{getFreshnessEventLabel(productForm.freshnessType, productForm.category)} At *</label>
                            <input
                              type="datetime-local"
                              value={productForm.preparedAt}
                              onChange={(e) => setProductForm({ ...productForm, preparedAt: e.target.value })}
                              className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                              required
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-1">Packed At *</label>
                            <input
                              type="datetime-local"
                              value={productForm.packedAt}
                              onChange={(e) => setProductForm({ ...productForm, packedAt: e.target.value })}
                              className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                              required
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-1">Storage Started At *</label>
                            <input
                              type="datetime-local"
                              value={productForm.storageStartedAt}
                              onChange={(e) => setProductForm({ ...productForm, storageStartedAt: e.target.value })}
                              className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                              required
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-stone-700 mb-1">Fresh Shelf Life (hours) *</label>
                            <input
                              type="number"
                              min="1"
                              value={productForm.shelfLifeHours || ""}
                              onChange={(e) => setProductForm({ ...productForm, shelfLifeHours: Number(e.target.value) })}
                              className="w-full rounded-lg border border-stone-200 bg-white p-2.5 outline-hidden focus:border-emerald-500 text-stone-900"
                              placeholder="24"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block font-medium text-stone-700 mb-1">Product Image Upload</label>
                          <div className="rounded-xl border border-dashed border-stone-250 bg-white p-3 space-y-3">
                            {productForm.image ? (
                              <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                                <img
                                  src={productForm.image}
                                  alt="Product preview"
                                  className="h-32 w-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setProductForm({ ...productForm, image: "" })}
                                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-sm hover:text-rose-600"
                                  title="Remove image"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex h-32 flex-col items-center justify-center rounded-lg bg-stone-50 text-center text-stone-400">
                                <FileText className="h-7 w-7" />
                                <span className="mt-2 text-[11px] font-mono">No image selected</span>
                              </div>
                            )}
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-stone-950 px-3 py-2 text-xs font-bold text-white hover:bg-stone-850">
                              <PlusCircle className="h-4 w-4" />
                              Choose Image From Device
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => {
                                  handleProductImageUpload(e.target.files?.[0]);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block font-medium text-stone-700 mb-1">Product Tags (comma-separated)</label>
                          <input
                            type="text"
                            value={productForm.tagsString}
                            onChange={(e) => setProductForm({ ...productForm, tagsString: e.target.value })}
                            className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900"
                            placeholder="sourdough, local, fresh"
                          />
                        </div>
                      </div>

                      {/* Gemini Creator helper within the form */}
                      <div className="p-4 bg-amber-50/70 border border-amber-200/50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 animate-bounce text-amber-600" /> Let Gemini write the descriptive copy & pricing bounds
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAICopywriterOpen(!isAICopywriterOpen)}
                            className="text-[10px] text-amber-700 underline font-semibold"
                          >
                            {isAICopywriterOpen ? "Hide AI Panel" : "Open Assistant Panel"}
                          </button>
                        </div>

                        {isAICopywriterOpen && (
                          <div className="space-y-3 pt-1">
                            <div>
                              <label className="block font-medium text-[10px] text-stone-600 mb-1">Core details / Magic touch of this item</label>
                              <input
                                type="text"
                                value={aiProductFeatures}
                                onChange={(e) => setAiProductFeatures(e.target.value)}
                                className="w-full bg-white rounded-lg border border-stone-200 p-2 text-[11px] text-stone-900"
                                placeholder="e.g.: Fermented in dark wood box, smells like culinary pine rose leaves"
                              />
                            </div>
                            <div>
                              <label className="block font-medium text-[10px] text-stone-600 mb-1">Materials / Ingredients utilized</label>
                              <input
                                type="text"
                                value={aiProductMaterials}
                                onChange={(e) => setAiProductMaterials(e.target.value)}
                                className="w-full bg-white rounded-lg border border-stone-200 p-2 text-[11px] text-stone-900"
                                placeholder="e.g.: Stoneground fine wheat sourdough, Himalayan rock grains, lavender sprig"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={generatingCopy}
                              onClick={handleAIGenerateProductCopy}
                              className="w-full bg-amber-600 text-white font-bold py-2 rounded-lg hover:bg-amber-700 flex items-center justify-center gap-1.5"
                            >
                              {generatingCopy ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin"/> Composing sensory copy...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5" /> Auto-Write Copy & Suggest Price
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-medium text-stone-750">Final Catalog Description *</label>
                        <textarea
                          rows={3}
                          value={productForm.description}
                          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                          className="w-full rounded-lg border border-stone-200 p-2.5 outline-hidden focus:border-amber-500 text-stone-900 leading-relaxed text-xs"
                          placeholder="Introduce this product with loving kitchen words..."
                          required
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 text-xs pt-2">
                        <button
                          type="button"
                          onClick={() => setIsProductFormOpen(false)}
                          className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 font-bold text-stone-700 hover:bg-stone-50 transition"
                        >
                          Dismiss Form
                        </button>
                        <button
                          type="submit"
                          disabled={savingProduct}
                          className="rounded-xl bg-stone-950 font-bold text-white hover:bg-stone-850 px-5 py-2.5 transition flex items-center justify-center gap-1.5"
                        >
                          {savingProduct ? "Publishing Catalog..." : "Publish Listing & Go Live"}
                        </button>
                      </div>

                    </form>
                  </div>
                )}

                {/* Queue of Local Orders requiring Fulfillment */}
                <div className="rounded-2xl border border-stone-105 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-50 pb-3">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-600" /> Buyer Orders Queue
                      </h3>
                      <p className="text-xs text-stone-500">Review buyer orders, prepare items, and update fulfillment status</p>
                    </div>
                    <span className="font-mono text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">
                      {activeSellerOrders.length} received
                    </span>
                  </div>

                  {activeSellerOrders.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl">
                      <p className="text-xs text-stone-500 font-mono">No order records submitted yet for this store.</p>
                      <p className="text-[10px] text-stone-400 mt-1">Switch to Buyer mode, place an order, then come back here to manage it.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeSellerOrders.map((o) => (
                        <div key={o.id} className="rounded-2xl border border-stone-100 p-4 space-y-3 text-xs bg-stone-50/50">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-stone-900 bg-amber-100/50 text-amber-900 px-2 py-0.5 rounded">ORDER #{o.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              o.status === "completed" ? "bg-green-100 text-green-800" :
                              o.status === "preparing" ? "bg-amber-100 text-amber-900" :
                              o.status === "ready" ? "bg-blue-100 text-blue-900" :
                              o.status === "cancelled" ? "bg-rose-100 text-rose-800" :
                              "bg-stone-200 text-stone-800"
                            }`}>
                              {o.status}
                            </span>
                          </div>

                          <div className="space-y-1 text-stone-600">
                            <p>Buyer: <strong className="font-bold text-stone-900">{o.buyerName}</strong> ({o.buyerPhone})</p>
                            <p>Delivery coordination: <span className="font-semibold uppercase text-[10px] bg-stone-100 px-1.5 rounded">{o.deliveryMethod}</span></p>
                            {o.deliveryMethod === "delivery" && <p className="text-stone-500 italic mt-0.5">Address: {o.address}</p>}
                            {o.notes && <p className="text-stone-500 bg-white p-2 rounded border border-stone-100 text-[11px] mt-1">Notes: "{o.notes}"</p>}
                          </div>

                          {/* Items listed in this order matching this seller */}
                          <div className="border-t border-stone-100 pt-2.5">
                            <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block mb-1">Your Items:</span>
                            <ul className="space-y-1 font-mono text-[11px]">
                              {o.items.filter(item => item.sellerId === activeSellerId).map((item, idx) => (
                                <li key={idx} className="flex justify-between text-stone-900">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span>₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Order Actions - changing statuses */}
                          <div className="flex items-center gap-1.5 justify-end pt-2 border-t border-stone-100">
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "preparing")}
                              className="bg-white hover:bg-amber-50 text-[10px] font-bold text-amber-800 border border-stone-200 px-2 py-1.5 rounded-lg"
                            >
                              Baking/Preparing
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "ready")}
                              className="bg-white hover:bg-blue-50 text-[10px] font-bold text-blue-800 border border-stone-200 px-2 py-1.5 rounded-lg"
                            >
                              Ready for Pickup
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "completed")}
                              className="bg-stone-900 hover:bg-stone-850 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                            >
                              Mark Fulfilled
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

            </div>

            </>
            ) : (
              <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-10 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Store className="h-7 w-7" />
                </div>
                <h3 className="mt-4 font-serif text-2xl font-bold text-stone-950">Create your seller profile first</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                  Seller tools are private. A new person cannot view or edit other stores from Seller Mode.
                </p>
                <button
                  onClick={() => setIsNewSellerFormOpen(true)}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create My Store
                </button>
              </div>
            )}

          </div>
        )}

      </main>
      )}

      {/* Buyer-only 24/7 Gemini support assistant */}
      {hasEnteredMarketplace && currentRole === "buyer" && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
          {isChatOpen && (
            <div className="w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-stone-100 bg-stone-950 px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-none">FreshTrack AI</h3>
                    <span className="text-[10px] text-emerald-100 font-mono">24/7 customer helper</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
                  title="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="h-80 overflow-y-auto bg-stone-50 px-3 py-4 space-y-3">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs ${
                      message.role === "user"
                        ? "bg-amber-600 text-white rounded-br-md"
                        : "bg-white text-stone-700 border border-stone-100 rounded-bl-md"
                    }`}>
                      {message.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs text-stone-500 border border-stone-100 flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Checking live marketplace data...
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-100 bg-white p-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {["Which bread is freshest?", "Show food stores", "Explain FreshTrack"].map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={chatLoading}
                      onClick={() => sendChatMessage(prompt)}
                      className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendChatMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about products, stores, freshness..."
                    className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400"
                    title="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsChatOpen(prev => !prev)}
            className="group flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-900/20 ring-4 ring-emerald-100 transition hover:bg-emerald-700 hover:scale-105"
            title="Open FreshTrack AI chat"
          >
            {isChatOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            {!isChatOpen && (
              <span className="absolute right-16 whitespace-nowrap rounded-full bg-stone-950 px-3 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                Ask FreshTrack AI
              </span>
            )}
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* 10. PRODUCT DETAIL MODAL + SELLER BIO CARD */}
      {/* ========================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl max-w-2xl w-full mx-auto overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-md transition hover:scale-110"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto">
              
              {/* Product Visual Header */}
              <div className="relative aspect-video w-full bg-stone-100">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-5 left-5 right-5 text-white space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                    {selectedProduct.category}
                  </span>
                  <h3 className="font-serif text-2xl font-bold tracking-tight text-white leading-tight">
                    {selectedProduct.name}
                  </h3>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-6">
                
                {/* Product Description */}
                <div className="space-y-3">
                  <h4 className="font-serif text-sm font-bold text-stone-905 uppercase tracking-wider">Handcrafted Product Coordinates</h4>
                  <p className="text-stone-650 text-sm leading-relaxed">
                    {selectedProduct.description}
                  </p>
                  
                  {/* Tags Listing */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedProduct.tags.map((tag, idx) => (
                      <span key={idx} className="bg-stone-100 text-stone-600 text-[10px] font-mono px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 space-y-4">
                  {(() => {
                    const freshTrack = getFreshTrack(selectedProduct, freshnessNow);
                    return (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-mono font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              FreshTrack verified timing
                            </span>
                            <h4 className="mt-1 font-serif text-lg font-bold text-stone-950">
                              Freshness Score: {freshTrack.score}/100
                            </h4>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            freshTrack.score >= 85
                              ? "bg-emerald-600 text-white"
                              : freshTrack.score >= 65
                                ? "bg-lime-600 text-white"
                                : freshTrack.score >= 40
                                  ? "bg-amber-500 text-white"
                                  : "bg-rose-600 text-white"
                          }`}>
                            {freshTrack.status}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-white shadow-inner">
                          <div
                            className={`h-full rounded-full ${freshTrack.score >= 85 ? "bg-emerald-500" : freshTrack.score >= 65 ? "bg-lime-500" : freshTrack.score >= 40 ? "bg-amber-500" : "bg-rose-500"}`}
                            style={{ width: `${freshTrack.score}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                          <div className="rounded-xl bg-white/80 p-3 border border-emerald-100">
                            <span className="block text-[10px] uppercase tracking-wider font-mono text-stone-400">{getFreshnessTypeLabel(selectedProduct)}</span>
                            <strong className="text-stone-900">{formatFreshDateTime(selectedProduct.preparedAt)}</strong>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3 border border-emerald-100">
                            <span className="block text-[10px] uppercase tracking-wider font-mono text-stone-400">Packed</span>
                            <strong className="text-stone-900">{formatFreshDateTime(selectedProduct.packedAt)}</strong>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3 border border-emerald-100">
                            <span className="block text-[10px] uppercase tracking-wider font-mono text-stone-400">Storage age</span>
                            <strong className="text-stone-900">
                              {freshTrack.storageHours < 1 ? "Under 1 hour" : `${freshTrack.storageHours.toFixed(1)} hours`}
                            </strong>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3 border border-emerald-100">
                            <span className="block text-[10px] uppercase tracking-wider font-mono text-stone-400">Listed shelf life</span>
                            <strong className="text-stone-900">{freshTrack.shelfLifeHours} hours</strong>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Seller Story Highlight Section (Wholesome Narrative Block) */}
                {(() => {
                  const s = sellers.find(sellerObj => sellerObj.id === selectedProduct.sellerId);
                  if (!s) return null;
                  return (
                    <div className="bg-amber-50/70 rounded-2xl border border-amber-100 p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <img src={s.avatar} alt={s.name} className="h-10 w-10 object-cover rounded-xl border-2 border-stone-200" />
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-amber-800 font-mono font-bold leading-none block">{s.badge}</span>
                          <h5 className="font-bold text-sm text-stone-900 leading-normal">{s.shopName}</h5>
                          <span className="text-[11px] text-stone-500 font-mono">{s.location}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-stone-650 leading-relaxed">
                        <strong className="font-bold text-stone-900 block font-serif">Our Cottage Story:</strong>
                        <p className="italic">
                          "{s.story}"
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs text-stone-500 font-mono border-t border-amber-200/50">
                        <span>Local Guild Member since {s.joinedDate}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-stone-900">{s.rating.toFixed(s.rating % 1 === 0 ? 0 : 1)} / 5</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Product Reviews & Rating Subsystem */}
                <div className="space-y-4 pt-4 border-t border-stone-100">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-base font-bold text-stone-900">Buyer Reviews</h4>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-stone-900">{selectedProduct.rating.toFixed(1)}</span>
                      <span className="text-stone-400 font-mono">({selectedProduct.reviewsCount} notes)</span>
                    </div>
                  </div>

                  {/* Submit review interactive box */}
                  <form onSubmit={handleReviewSubmit} className="bg-stone-50 p-4 rounded-xl space-y-3 text-xs">
                    <span className="block font-bold text-stone-800">Add My Honest Experience</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-500 mb-1">Your Name</label>
                        <input
                          type="text"
                          required
                          value={reviewForm.buyerName}
                          onChange={(e) => setReviewForm({ ...reviewForm, buyerName: e.target.value })}
                          className="w-full rounded-md border border-stone-200 bg-white p-2"
                          placeholder="Samantha..."
                        />
                      </div>
                      <div>
                        <label className="block text-stone-500 mb-1">Select Rating</label>
                        <select
                          value={reviewForm.rating}
                          onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                          className="w-full rounded-md border border-stone-200 bg-white p-2"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ Wonderful (5/5)</option>
                          <option value="4">⭐⭐⭐⭐ Great (4/5)</option>
                          <option value="3">⭐⭐⭐ Standard (3/5)</option>
                          <option value="2">⭐⭐ Fair (2/5)</option>
                          <option value="1">⭐ Poor (1/5)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-stone-500 mb-1">Share sensory details (taste, feel, craftsmanship)...</label>
                      <textarea
                        required
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        className="w-full rounded-md border border-stone-200 bg-white p-2"
                        rows={2}
                        placeholder="Love the subtle pine rose aroma..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="bg-stone-950 text-white hover:bg-stone-850 px-4 py-2 rounded-lg font-semibold active:bg-stone-900"
                    >
                      {submittingReview ? "Posting review..." : "Submit Review Note"}
                    </button>
                  </form>

                  {/* Past Reviews List */}
                  <div className="space-y-3 pt-2">
                    {productReviews.length === 0 ? (
                      <p className="text-xs text-stone-400 font-mono italic">No review notes written yet. Be the first to share your experience!</p>
                    ) : (
                      productReviews.map((rev) => (
                        <div key={rev.id} className="p-3.5 rounded-xl border border-stone-50 bg-stone-50/50 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-stone-900">{rev.buyerName}</span>
                            <span className="text-stone-400 font-mono text-[10px]">{rev.date}</span>
                          </div>
                          <div className="flex gap-0.5 text-amber-500">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <p className="text-stone-605 italic">
                            "{rev.comment}"
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                </div>

              </div>

            </div>

            {/* Bottom Sticky Action Line */}
            <div className="border-t border-stone-100 p-5 bg-stone-50 flex items-center justify-between">
              <div>
                <span className="block text-xs text-stone-500">Listed unit price:</span>
                <span className="text-xl font-bold font-mono text-amber-950">₹{selectedProduct.price.toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={() => {
                  addToBasket(selectedProduct);
                  setSelectedProduct(null);
                }}
                disabled={selectedProduct.stock <= 0}
                className={`rounded-xl px-6 py-2.5 font-bold text-xs shadow-xs transition ${
                  selectedProduct.stock <= 0 ? "bg-stone-105 text-stone-400 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-705 text-white"
                }`}
              >
                {selectedProduct.stock <= 0 ? "Out of stock" : "Add to Cart"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 11. ARTISAN FULL BIO OVERLAY */}
      {/* ========================================== */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl max-w-xl w-full mx-auto overflow-hidden shadow-2xl flex flex-col">
            
            {/* Cover photo */}
            <div className="h-44 w-full relative">
              <img src={selectedSeller.coverImage} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 to-transparent"></div>
              
              <button
                onClick={() => setSelectedSeller(null)}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow-md transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-4 left-5 right-5 text-white text-xs">
                <span className="bg-amber-600 font-semibold px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
                  {selectedSeller.badge}
                </span>
                <h4 className="font-serif text-xl font-bold mt-1 text-white leading-tight">
                  {selectedSeller.shopName}
                </h4>
              </div>
            </div>

            {/* Content body */}
            <div className="p-6 space-y-5 text-xs">
              
              {/* Meet the maker card intro */}
              <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-105">
                <img src={selectedSeller.avatar} className="h-10 w-10 object-cover rounded-lg shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Artisan Maker</span>
                  <span className="font-bold text-stone-900 leading-normal">{selectedSeller.name}</span>
                </div>
                <div className="ml-auto text-right font-mono text-[10px]">
                  <span className="text-stone-450 block uppercase">Location Base</span>
                  <strong className="text-stone-900 font-bold">{selectedSeller.location}</strong>
                </div>
              </div>

              {/* Story summary */}
              <div className="space-y-2">
                <h5 className="font-serif text-sm font-bold text-stone-950 uppercase tracking-wider">Our Wholesome Craft Story</h5>
                <p className="text-stone-600 line-height-relaxed leading-relaxed whitespace-pre-wrap italic bg-amber-50/40 p-4 rounded-xl border border-amber-100/50">
                  "{selectedSeller.story}"
                </p>
              </div>

              <div className="space-y-3">
                <h5 className="font-serif text-sm font-bold text-stone-950 uppercase tracking-wider">Active Creations</h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {products.filter(p => p.sellerId === selectedSeller.id).map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setSelectedSeller(null); }}
                      className="p-2.5 border border-stone-100 rounded-xl flex items-center justify-between hover:bg-stone-50 hover:border-amber-200 cursor-pointer transition gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={p.image} className="h-9 w-9 object-cover rounded-md" />
                        <div>
                          <h6 className="font-bold text-stone-900 line-clamp-1">{p.name}</h6>
                          <span className="font-mono text-stone-500 text-[10px]">${p.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <span className="text-amber-700 font-semibold text-[11px] shrink-0">View Item →</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Dismiss line */}
            <div className="border-t border-stone-100 p-4 bg-stone-50 flex items-center justify-between">
              <span className="text-[11px] text-stone-450 font-mono">100% of receipts go straight to the artisan</span>
              <button
                onClick={() => setSelectedSeller(null)}
                className="rounded-lg bg-stone-900 px-4 py-2 text-white font-bold text-xs"
              >
                Finished Inspecting
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 12. FLOATING SHOPPING BASKET DRAWER OVERLAY */}
      {/* ========================================== */}
      {isBasketOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            <div 
              onClick={() => setIsBasketOpen(false)}
              className="absolute inset-0 bg-stone-900/60 transition-opacity backdrop-blur-xs"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col bg-white shadow-2xl border-l border-stone-100">
                  
                  {/* Drawer Header */}
                  <div className="px-4 py-6 sm:px-6 bg-stone-50 border-b border-stone-105">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-bold font-serif text-stone-905" id="slide-over-title">
                        Your Cart
                      </h2>
                      <div className="ml-3 flex h-7 items-center">
                        <button
                          type="button"
                          onClick={() => setIsBasketOpen(false)}
                          className="rounded-md text-stone-400 hover:text-stone-500 focus:outline-hidden"
                        >
                          <span className="sr-only">Close cart drawer</span>
                          <X className="h-5.5 w-5.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Body Area */}
                  <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-6">
                    
                    {/* Progress coordination indicators */}
                    <div className="flex items-center justify-between mb-6 text-xs text-stone-550 border-b border-stone-50 pb-4 font-mono">
                      <span className={`px-2 py-1 rounded-full ${checkoutStep === "cart" ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-850"}`}>1. Cart</span>
                      <span className="text-stone-300">→</span>
                      <span className={`px-2 py-1 rounded-full ${checkoutStep === "shipping" ? "bg-amber-600 text-white" : "bg-stone-100 text-stone-850"}`}>2. Buyer Info</span>
                      <span className="text-stone-300">→</span>
                      <span className={`px-2 py-1 rounded-full ${checkoutStep === "success" ? "bg-green-600 text-white" : "bg-stone-100 text-stone-850"}`}>3. Placed!</span>
                    </div>

                    {/* Step A: CART LIST OF PRODUCTS */}
                    {checkoutStep === "cart" && (
                      <div className="space-y-4">
                        {basket.length === 0 ? (
                          <div className="text-center py-20 card max-w-xs mx-auto space-y-3.5">
                            <ShoppingBag className="h-10 w-10 text-stone-300 mx-auto" />
                            <h4 className="font-bold text-stone-700 text-sm">Your basket is fully empty.</h4>
                            <p className="text-xs text-stone-500">Add products as a buyer. Your order is only created after checkout.</p>
                            <button
                              onClick={() => setIsBasketOpen(false)}
                              className="bg-stone-900 text-white rounded-lg px-4 py-2 text-xs font-semibold"
                            >
                              Browse Products
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {basket.map((item) => (
                              <div key={item.product.id} className="flex gap-4 p-3 rounded-xl border border-stone-100 bg-stone-50/50 font-sans">
                                <img src={item.product.image} className="h-14 w-14 object-cover rounded-lg shrink-0 border border-stone-105" />
                                <div className="flex-1 space-y-1 text-xs">
                                  <div className="flex justify-between items-start">
                                    <h5 className="font-bold text-stone-900 leading-normal line-clamp-1">{item.product.name}</h5>
                                    <button 
                                      onClick={() => removeFromBasket(item.product.id)}
                                      className="text-stone-405 hover:text-rose-600 px-1"
                                      title="Remove from basket"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  
                                  {/* Price calculation logic */}
                                  <p className="font-mono font-medium text-stone-500">
                                    ₹{item.product.price.toLocaleString("en-IN")} each
                                  </p>
                                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1 text-[10px] text-emerald-900 font-mono">
                                    FreshTrack {getFreshTrack(item.product, freshnessNow).score}/100 | Packed {formatFreshDateTime(item.product.packedAt)}
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg p-0.5">
                                      <button 
                                        onClick={() => updateBasketQuantity(item.product.id, -1, item.product.stock)}
                                        className="h-5 w-5 rounded bg-stone-50 hover:bg-stone-100 text-stone-605 text-xs font-bold flex items-center justify-center"
                                      >
                                        -
                                      </button>
                                      <span className="font-mono text-center min-w-4 text-xs font-semibold">{item.quantity}</span>
                                      <button 
                                        onClick={() => updateBasketQuantity(item.product.id, 1, item.product.stock)}
                                        className="h-5 w-5 rounded bg-stone-50 hover:bg-stone-100 text-stone-605 text-xs font-bold flex items-center justify-center"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <span className="font-mono font-black text-amber-950">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</span>
                                  </div>

                                  {/* Stock limitations message */}
                                  <span className="text-[10px] text-stone-400 font-mono">Max stock available: {item.product.stock} units</span>
                                </div>
                              </div>
                            ))}

                            <div className="border-t border-stone-105 pt-5 space-y-2 text-xs">
                              <div className="flex justify-between text-stone-550">
                                <span>Product subtotal:</span>
                                <span className="font-mono">₹{basket.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex justify-between text-stone-550">
                                <span>Delivery / pickup service:</span>
                                <span className="font-mono text-emerald-700 font-semibold">FREE (Local Support)</span>
                              </div>
                              <div className="flex justify-between text-base font-serif font-black text-stone-905 pt-2 border-t border-stone-50">
                                <span>Est. Order Total:</span>
                                <span className="font-mono">₹{basket.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step B: SHIPPING COORDINATES DETAILS FORM */}
                    {checkoutStep === "shipping" && (
                      <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                        <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50 mb-3 text-[11px] text-amber-900 leading-normal">
                          FreshNest sellers coordinate pickups through local hubs or nearby delivery options. Confirm your preferred method before placing the order.
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-medium text-stone-700">Buyer Name *</label>
                          <input
                            type="text"
                            required
                            value={checkoutForm.buyerName}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, buyerName: e.target.value })}
                            className="w-full rounded-xl border border-stone-200 p-2.5 text-stone-905"
                            placeholder="Alex Thorne"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block font-medium text-stone-700 mb-1">Email Address *</label>
                            <input
                              type="email"
                              required
                              value={checkoutForm.buyerEmail}
                              onChange={(e) => setCheckoutForm({ ...checkoutForm, buyerEmail: e.target.value })}
                              className="w-full rounded-xl border border-stone-200 p-2.5 text-[11px] text-stone-905"
                              placeholder="alex@gmail.com"
                            />
                          </div>
                          <div>
                              <label className="block font-medium text-stone-700 mb-1">Buyer Phone *</label>
                            <input
                              type="tel"
                              required
                              value={checkoutForm.buyerPhone}
                              onChange={(e) => setCheckoutForm({ ...checkoutForm, buyerPhone: e.target.value })}
                              className="w-full rounded-xl border border-stone-200 p-2.5 text-[11px] text-stone-905"
                              placeholder="555-019-2834"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-medium text-stone-700">How do you want to receive the order?</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setCheckoutForm({ ...checkoutForm, deliveryMethod: "pickup" })}
                              className={`flex-1 rounded-xl p-2.5 font-bold border transition text-center ${
                                checkoutForm.deliveryMethod === "pickup"
                                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                  : "bg-white text-stone-600 border-stone-200"
                              }`}
                            >
                              Pickup
                            </button>
                            <button
                              type="button"
                              onClick={() => setCheckoutForm({ ...checkoutForm, deliveryMethod: "delivery" })}
                              className={`flex-1 rounded-xl p-2.5 font-bold border transition text-center ${
                                checkoutForm.deliveryMethod === "delivery"
                                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                  : "bg-white text-stone-600 border-stone-200"
                              }`}
                            >
                              Local Delivery
                            </button>
                          </div>
                        </div>

                        {checkoutForm.deliveryMethod === "delivery" && (
                          <div className="space-y-1.5 animate-fade-in">
                            <label className="block font-medium text-stone-700">Delivery Address *</label>
                            <input
                              type="text"
                              required
                              value={checkoutForm.address}
                              onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                              className="w-full rounded-xl border border-stone-200 p-2.5 text-stone-905"
                              placeholder="e.g. 14 FreshNest Market Road, Pune, MH"
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="block font-medium text-stone-750">Order Notes</label>
                          <textarea
                            rows={3}
                            value={checkoutForm.notes}
                            onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                            className="w-full rounded-xl border border-stone-200 p-2.5 text-stone-905"
                            placeholder="e.g., Please leave near the dark brown mailbox, bake Sourdough a little extra crumbly if possible..."
                          />
                        </div>

                        {/* Order calculation confirmation in form */}
                        <div className="p-4 rounded-xl bg-stone-50 border border-stone-105 space-y-1">
                          <div className="flex justify-between items-center text-stone-550">
                            <span>Cart items total:</span>
                            <span className="font-mono font-bold">₹{basket.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toLocaleString("en-IN")}</span>
                          </div>
                          <p className="text-[10px] text-stone-400 font-mono">No card is charged in trial marketplace; checkout submits orders instantly to seller queues.</p>
                        </div>

                        <div className="flex gap-2 text-xs pt-4">
                          <button
                            type="button"
                            onClick={() => setCheckoutStep("cart")}
                            className="rounded-xl border border-stone-250 bg-white px-4 py-3 font-semibold text-stone-750 hover:bg-stone-50"
                          >
                            Go Back to basket
                          </button>
                          <button
                            type="submit"
                            disabled={placingOrder}
                            className="flex-1 rounded-xl bg-stone-950 font-bold text-white hover:bg-stone-850 py-3 text-center flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            {placingOrder ? "Placing Order..." : "Place Order"}
                          </button>
                        </div>

                      </form>
                    )}

                    {/* Step C: ORDER COMPLETED SUCCESS PANEL SCREEN */}
                    {checkoutStep === "success" && placedOrder && (
                      <div className="text-center py-10 space-y-5">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                          <CheckCircle2 className="h-10 w-10 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-serif text-xl font-bold text-stone-900">Your Order Has Been Placed!</h3>
                          <p className="text-xs text-stone-505">
                            Order reference <strong className="font-mono text-amber-700">#{placedOrder.id}</strong> has been created.
                          </p>
                        </div>
                        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 text-left text-[11px] space-y-2 leading-relaxed">
                          <span className="text-stone-800 font-bold font-mono uppercase tracking-wider block border-b border-stone-150 pb-1.5">Order Overview</span>
                          <p>Customer Name: <strong className="font-semibold text-stone-900">{placedOrder.buyerName}</strong></p>
                          <p>Total transaction: <strong className="font-mono text-stone-900">₹{placedOrder.total.toLocaleString("en-IN")}</strong></p>
                          <p>Pick-up address coordination: <span className="font-bold underline text-stone-750">{placedOrder.address}</span></p>
                          <p className="text-stone-400 pt-1.5 border-t border-stone-100/50">The seller has been notified. Open Seller mode to manage and fulfill this order.</p>
                        </div>

                        <div className="pt-4 flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setIsBasketOpen(false);
                              setCheckoutStep("cart");
                              setPlacedOrder(null);
                            }}
                            className="w-full bg-stone-950 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-stone-850"
                          >
                            Awesome, return to shopping
                          </button>
                          <button
                            onClick={() => {
                              setRole("seller");
                              setIsBasketOpen(false);
                              setCheckoutStep("cart");
                              setPlacedOrder(null);
                            }}
                            className="w-full bg-amber-50 text-amber-900 hover:bg-amber-100/80 rounded-xl py-2.5 text-xs font-bold"
                          >
                            Open Seller Mode to manage order
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Drawer Footer sticky action */}
                  {checkoutStep === "cart" && basket.length > 0 && (
                    <div className="border-t border-stone-200 py-6 px-4 sm:px-6 bg-stone-50">
                      <div className="flex justify-between text-sm font-serif font-bold text-stone-900 mb-4">
                        <span>Order subtotal:</span>
                        <span className="font-mono text-base">₹{basket.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toLocaleString("en-IN")}</span>
                      </div>
                      
                      <button
                        onClick={() => setCheckoutStep("shipping")}
                        className="w-full bg-amber-600 hover:bg-amber-705 text-white py-3 rounded-xl font-bold text-xs text-center flex items-center justify-center gap-2 shadow-sm"
                      >
                        Enter Buyer Info <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global Footer element */}
      {hasEnteredMarketplace && (
      <footer className="mt-20 border-t border-stone-200/60 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs text-stone-400 font-mono space-y-2">
          <div className="flex items-center justify-center gap-3">
            <span>FreshNest Local Freshness Initiative</span>
            <span>•</span>
            <span>Est. 2026</span>
            <span>•</span>
            <span>Active Community Hub: India Cottage Guild Hubs</span>
          </div>
          <p className="max-w-md mx-auto text-[11px] leading-relaxed text-stone-400">
            Empowering micro-producers with smart digital copywriting & direct local market conduits, bypassing the carbon-heavy overheads of wholesale shipping.
          </p>
        </div>
      </footer>
      )}

    </div>
  );
}
