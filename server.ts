import express, { type Response } from "express";
import * as fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Product, Seller, Review, Order, OrderItem } from "./src/types.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Safe import of type if running in JS bundle - using standard types
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = "gemini-2.5-flash";

type MarketplaceDatabase = {
  sellers: Seller[];
  products: Product[];
  reviews: Review[];
  orders: Order[];
};

const DATABASE_DIR = path.resolve(process.cwd(), "data");
const DATABASE_PATH = path.join(DATABASE_DIR, "marketplace-db.json");

// Default entries used to seed the file database on first run.
let sellers: Seller[] = [
  {
    id: "seller_1",
    name: "Asha Devi",
    email: "asha.devi@example.com",
    shopName: "Asha's Varanasi Handlooms",
    shopDescription: "Authentic hand-spun Khadi throw blankets, pure Mulberry silk wraps, and heritage home linens woven slowly on hand-constructed foot looms.",
    story: "Asha Devi is a veteran weaver from the handloom colonies of Sarnath, Varanasi. Having inherited her family's weaving pits, she dedicates her life to preserving ancient geometric patterns and vegetable dyeing methods. Asha guides a small self-help group of six marginalized tribal weavers, assisting them with handloom workspace resources, organic yarn counts, and fair wages.",
    avatar: "https://images.unsplash.com/photo-1566215383929-aaba502f9cbd?auto=format&fit=crop&q=80&w=200",
    coverImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=1200",
    location: "Varanasi, Uttar Pradesh",
    rating: 4.9,
    verified: true,
    badge: "Master Handloom Weaver",
    joinedDate: "Feb 2025"
  },
  {
    id: "seller_2",
    name: "Karthik Nair",
    email: "karthik.n@example.com",
    shopName: "Munnar Wild Forest Apiary",
    shopDescription: "Truly raw mountain wildflower honey, traditional cardamom plantation pods, and cold-processed coconut oil botanical soaps.",
    story: "Living in the cool tropical ridges of Munnar, Kerala, Karthik maintains ancestral bee boxes scattered inside cardamom and organic tea plantations. Free from high-heat processing or sugar adulteration, his forest honey represents true mountain pollen counts and therapeutic value. Karthik integrates traditional Ayurvedic skin-care practices to craft daily moisturizing bathing bars.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    coverImage: "https://images.unsplash.com/photo-1473081556163-2a17de81fc97?auto=format&fit=crop&q=80&w=1200",
    location: "Munnar, Kerala",
    rating: 4.8,
    verified: true,
    badge: "Heritage Beekeeper",
    joinedDate: "Mar 2025"
  },
  {
    id: "seller_3",
    name: "Pranamya & Ranjit Bengal Co.",
    email: "pranamya@example.com",
    shopName: "Shantiniketan Terracotta & Crafts",
    shopDescription: "Hand-thrown sand-baked terracotta tea cups, traditional hand-printed Kantha-stitch cotton bags, and local heritage clay items.",
    story: "Deeply loyal to Rabindranath Tagore's self-reliance (Swadeshi) teachings, weavers and potters Pranamya and Ranjit set up their humble Shantiniketan cottage space. They bake clay cups using regional mud in smoke kilns, providing that classic, organic earthen scent (Sondhi Khushboo) with every cup of hot chai.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    coverImage: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=1200",
    location: "Shantiniketan, West Bengal",
    rating: 4.9,
    verified: true,
    badge: "Craft Revivalist",
    joinedDate: "Jan 2025"
  },
  {
    id: "seller_4",
    name: "Devaki Amma",
    email: "devaki.cottage@example.com",
    shopName: "Amma's Coastal Karnataka Pickles",
    shopDescription: "Heirloom family oil pickles, traditional sun-cured jackfruit chutneys, and coastal stone-milled spice powders.",
    story: "Now 74, Devaki Amma has been sun-curing pickles at her coastal farm in Udupi since her marriage. She believes that traditional pickling is a cosmic science that needs gentle solar warmth and patience. Hand-cut raw mangoes are marinated in hand-pressed cold sesame oil and organic mustard to preserve their natural flavor and crunch.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
    coverImage: "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&q=80&w=1200",
    location: "Udupi, Karnataka",
    rating: 5.0,
    verified: true,
    badge: "Cottage Preserver",
    joinedDate: "May 2025"
  }
];

let products: Product[] = [
  {
    id: "prod_1",
    name: "Pure Varanasi Hand-Spun Khadi Throw Blanket",
    description: "Pure organic mountain cotton, hand-spun and slowly woven on regional foot-operated wooden looms in Varanasi. Colored using natural tree madder root and wild indigo extracts. Heavyweight, breathable, and beautifully rustic.",
    price: 2450.00,
    category: "Handmade Home",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600",
    stock: 12,
    rating: 4.9,
    reviewsCount: 3,
    sellerId: "seller_1",
    tags: ["khadi", "cotton", "blanket", "natural dye", "handloom"],
    preparedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    packedAt: new Date(Date.now() - 45 * 60 * 60 * 1000).toISOString(),
    storageStartedAt: new Date(Date.now() - 45 * 60 * 60 * 1000).toISOString(),
    shelfLifeHours: 720
  },
  {
    id: "prod_2",
    name: "Mulberry Silk Handwoven Table Runner",
    description: "Exquisite art table runner handwoven in Sarnath using local Mulberry silks and embellished with traditional Varanasi zari margins. Highlights classical intricate diamond motifs.",
    price: 1850.00,
    category: "Handmade Home",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600",
    stock: 5,
    rating: 5.0,
    reviewsCount: 1,
    sellerId: "seller_1",
    tags: ["silk", "table runner", "zari", "luxury", "weaving"],
    preparedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    packedAt: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(),
    storageStartedAt: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(),
    shelfLifeHours: 1440
  },
  {
    id: "prod_3",
    name: "Raw Unfiltered Munnar Forest Honey (400g)",
    description: "Cold-filtered honey harvested from deep Munnar plantation ridges. Loaded with wild cardamom, sweet clover, and forest blossom minerals. High-enzyme honey never pasteurized or thinned.",
    price: 450.00,
    category: "Food & Bakery",
    image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=600",
    stock: 15,
    rating: 4.9,
    reviewsCount: 4,
    sellerId: "seller_2",
    tags: ["honey", "raw", "pure", "ayurvedic", "kerala"],
    preparedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    packedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    storageStartedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    shelfLifeHours: 2160
  },
  {
    id: "prod_4",
    name: "Ayurvedic Neela Turmeric & Neem Bathing Soap",
    description: "Pack of 3 cold-pressed Ayurvedic bathing bars formulated with organic coconut oil, fresh wild turmeric (Kasthuri Manjal), neem extracts, and mountain vetiver root for intense skin healing and aromatic relief.",
    price: 280.00,
    category: "Beauty & Apothecary",
    image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=600",
    stock: 20,
    rating: 4.8,
    reviewsCount: 3,
    sellerId: "seller_2",
    tags: ["soap", "ayurvedic", "turmeric", "neem", "wellness"],
    preparedAt: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    packedAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    storageStartedAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
    shelfLifeHours: 2160
  },
  {
    id: "prod_5",
    name: "Terracotta Traditional Kulhar Tea Cups (Set of 4)",
    description: "Clay kulhars baked in slow-smoldering sawdust pits in Shantiniketan. Molded over traditional wheels, these organic cups emit a sweet, comforting aroma (Sondhi Mitti) when served with hot tea.",
    price: 350.00,
    category: "Handmade Home",
    image: "https://images.unsplash.com/photo-1595039838779-f3780873afdd?auto=format&fit=crop&q=80&w=600",
    stock: 8,
    rating: 4.8,
    reviewsCount: 2,
    sellerId: "seller_3",
    tags: ["terracotta", "clay", "tea", "traditional", "pottery"],
    preparedAt: new Date(Date.now() - 168 * 60 * 60 * 1000).toISOString(),
    packedAt: new Date(Date.now() - 160 * 60 * 60 * 1000).toISOString(),
    storageStartedAt: new Date(Date.now() - 160 * 60 * 60 * 1000).toISOString(),
    shelfLifeHours: 4320
  },
  {
    id: "prod_6",
    name: "Devaki Amma's Sun-Cured Spicy Mango Pickle",
    description: "Unbelievable heirloom oil preserve. Fresh coastal baby mangoes cured under the blazing Udupi sun, saturated in premium cold-pressed sesame oil, organic mustard seeds, and stone-ground local red chiles.",
    price: 320.00,
    category: "Food & Bakery",
    image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&q=80&w=600",
    stock: 18,
    rating: 5.0,
    reviewsCount: 2,
    sellerId: "seller_4",
    tags: ["pickle", "mango", "spicy", "preserves", "grandma"],
    preparedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    packedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    storageStartedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    shelfLifeHours: 720
  },
  {
    id: "prod_8",
    name: "Fresh Baked Local Milk Bread",
    description: "Soft morning bread prepared in a home kitchen, cooled properly, and packed for same-day local pickup. Simple ingredients, no artificial preservatives, and ideal for breakfast or tiffin boxes.",
    price: 40.00,
    category: "Food & Bakery",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
    stock: 22,
    rating: 4.9,
    reviewsCount: 0,
    sellerId: "seller_4",
    tags: ["bread", "fresh", "bakery", "homemade"],
    preparedAt: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
    packedAt: new Date(new Date().setHours(7, 0, 0, 0)).toISOString(),
    storageStartedAt: new Date(new Date().setHours(7, 0, 0, 0)).toISOString(),
    shelfLifeHours: 24
  },
  {
    id: "prod_7",
    name: "Amma's Sweet & Tangy Sun-Dried Jackfruit Chutney",
    description: "Thick, flavor-forward slow chutney prepared using forest-harvested sweet jackfruits, unbleached organic sugar jaggery, local tamarind pods, and crushed bird's eye chilies. Exquisite on handloom rotis.",
    price: 240.00,
    category: "Food & Bakery",
    image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&q=80&w=600",
    stock: 10,
    rating: 4.7,
    reviewsCount: 1,
    sellerId: "seller_4",
    tags: ["chutney", "jackfruit", "coastal", "spicy sweet"],
    preparedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    packedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    storageStartedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    shelfLifeHours: 336
  }
];

let reviews: Review[] = [
  {
    id: "rev_1",
    productId: "prod_1",
    buyerName: "Anjali Mukhopadhyay",
    rating: 5,
    comment: "This khadi throw is extremely soft and pure. You can feel the heartbeat of Indian handlooms in it. The blue dye matches perfectly!",
    date: "2026-05-18"
  },
  {
    id: "rev_2",
    productId: "prod_3",
    buyerName: "Rahul Krishnan",
    rating: 5,
    comment: "Absolutely rich and thick honey. The wild cardamom aroma is very distinct and delightful with morning tea. Pure mountain therapeutic quality.",
    date: "2026-05-25"
  },
  {
    id: "rev_3",
    productId: "prod_6",
    buyerName: "Meenakshi Acharya",
    rating: 5,
    comment: "Tastes exactly like the mango pickles my maternal grandmother used to prepare inside clay jars. Devaki Amma's hands hold pure magic!",
    date: "2026-06-01"
  },
  {
    id: "rev_4",
    productId: "prod_4",
    buyerName: "Siddharth Sen",
    rating: 5,
    comment: "The neela soap is wonderful. It cleared up my dry skin patches within four days. Smells wonderfully clean of deep vetiver roots.",
    date: "2026-05-20"
  },
  {
    id: "rev_5",
    productId: "prod_5",
    buyerName: "Pallavi Joshi",
    rating: 5,
    comment: "The terracotta cups are extremely charming. They hold heat perfectly and look extremely rustic. Drinking early morning ginger tea in them is therapeutic.",
    date: "2026-05-30"
  }
];

let orders: Order[] = [];

function getCurrentDatabase(): MarketplaceDatabase {
  return { sellers, products, reviews, orders };
}

function applyDatabase(database: Partial<MarketplaceDatabase>) {
  sellers = Array.isArray(database.sellers) ? database.sellers : sellers;
  products = Array.isArray(database.products) ? database.products : products;
  reviews = Array.isArray(database.reviews) ? database.reviews : reviews;
  orders = Array.isArray(database.orders) ? database.orders : orders;
}

function loadDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    saveDatabase();
    console.log(`Seeded local marketplace database at ${DATABASE_PATH}`);
    return;
  }

  try {
    const savedDatabase = JSON.parse(fs.readFileSync(DATABASE_PATH, "utf-8")) as Partial<MarketplaceDatabase>;
    applyDatabase(savedDatabase);
    console.log(`Loaded marketplace database from ${DATABASE_PATH}`);
  } catch (error) {
    console.error("Failed to read marketplace database. Using default seed data instead.", error);
  }
}

function saveDatabase() {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(getCurrentDatabase(), null, 2));
}

function persistDatabase(res: Response) {
  try {
    saveDatabase();
    return true;
  } catch (error) {
    console.error("Failed to save marketplace database:", error);
    res.status(500).json({ error: "Could not save marketplace data. Please try again." });
    return false;
  }
}

// Setup Gemini Client Safely
const api_key = process.env.GEMINI_API_KEY;
let ai_client: any = null;
if (api_key && api_key !== "MY_GEMINI_API_KEY" && api_key.trim() !== "") {
  try {
    ai_client = new GoogleGenAI({
      apiKey: api_key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log("Gemini API Client initialized successfully on the backend.");
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
  }
} else {
  console.log("No valid GEMINI_API_KEY. Using rich placeholder mock generators.");
}

async function startServer() {
  loadDatabase();

  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // ----------------------------------------------------
  // MARKETPLACE API ROUTES
  // ----------------------------------------------------

  // 1. Get all sellers
  app.get("/api/sellers", (req, res) => {
    res.json(sellers);
  });

  // 2. Get all products
  app.get("/api/products", (req, res) => {
    res.json(products);
  });

  // 3. Register/Update Seller Store Profile
  app.post("/api/sellers", async (req, res) => {
    const data = req.body;
    let seller = sellers.find(s => s.id === data.id || s.email === data.email);
    
    if (seller) {
      // Update existing
      seller.name = data.name || seller.name;
      seller.shopName = data.shopName || seller.shopName;
      seller.shopDescription = data.shopDescription || seller.shopDescription;
      seller.story = data.story || seller.story;
      seller.location = data.location || seller.location;
      seller.badge = data.badge || seller.badge;
      if (data.avatar) seller.avatar = data.avatar;
      if (data.coverImage) seller.coverImage = data.coverImage;
    } else {
      // Register new
      const newId = `seller_${Date.now()}`;
      seller = {
        id: newId,
        name: data.name || "New Artisan",
        email: data.email || "artisan@example.com",
        shopName: data.shopName || "My Home Shop Workspace",
        shopDescription: data.shopDescription || "Freshly made goods from my home heartland.",
        story: data.story || "We started in our backyard kitchen wanting to build beautiful products with sustainable ingredients.",
        avatar: data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        coverImage: data.coverImage || "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=1200",
        location: data.location || "Local Community",
        rating: 5.0,
        verified: false,
        badge: data.badge || "Local Artisan",
        joinedDate: "Recently"
      };
      sellers.push(seller);
    }
    if (!persistDatabase(res)) return;
    res.json(seller);
  });

  app.delete("/api/sellers/:id", async (req, res) => {
    const id = req.params.id;
    const seller = sellers.find(s => s.id === id);

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    const sellerProductIds = products
      .filter(product => product.sellerId === id)
      .map(product => product.id);

    sellers = sellers.filter(s => s.id !== id);
    products = products.filter(product => product.sellerId !== id);
    reviews = reviews.filter(review => !sellerProductIds.includes(review.productId));

    if (!persistDatabase(res)) return;
    res.json({
      deletedSellerId: id,
      deletedProductIds: sellerProductIds
    });
  });

  // 4. Create/Edit product listing
  app.post("/api/products", async (req, res) => {
    const data = req.body;
    let product;

    if (data.id) {
      product = products.find(p => p.id === data.id);
      if (product) {
        product.name = data.name || product.name;
        product.description = data.description || product.description;
        product.price = Number(data.price) ?? product.price;
        product.category = data.category || product.category;
        product.stock = Number(data.stock) ?? product.stock;
        product.tags = data.tags || product.tags;
        product.freshnessType = data.freshnessType || product.freshnessType;
        product.preparedAt = data.preparedAt ?? product.preparedAt;
        product.packedAt = data.packedAt ?? product.packedAt;
        product.storageStartedAt = data.storageStartedAt ?? product.storageStartedAt;
        product.shelfLifeHours = Number(data.shelfLifeHours) || product.shelfLifeHours;
        if (data.image) product.image = data.image;
      }
    }

    if (!product) {
      const newId = `prod_${Date.now()}`;
      product = {
        id: newId,
        name: data.name || "Handcrafted Special",
        description: data.description || "A gorgeous unique item crafted individually inside our home studio.",
        price: Number(data.price) || 10.00,
        category: data.category || "Handmade Home",
        image: data.image || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600",
        stock: Number(data.stock) || 5,
        rating: 5.0,
        reviewsCount: 0,
        sellerId: data.sellerId || "seller_1",
        tags: data.tags || ["custom", "handmade"],
        freshnessType: data.freshnessType || getDefaultServerFreshnessType(data.category || "Handmade Home"),
        preparedAt: data.preparedAt || new Date().toISOString(),
        packedAt: data.packedAt || new Date().toISOString(),
        storageStartedAt: data.storageStartedAt || data.packedAt || new Date().toISOString(),
        shelfLifeHours: Number(data.shelfLifeHours) || 24
      };
      products.push(product);
    }
    if (!persistDatabase(res)) return;
    res.json(product);
  });

  // 5. Delete a product
  app.delete("/api/products/:id", async (req, res) => {
    const id = req.params.id;
    products = products.filter(p => p.id !== id);
    if (!persistDatabase(res)) return;
    res.json({ success: true, id });
  });

  // 6. Get reviews for a product
  app.get("/api/reviews", (req, res) => {
    const productId = req.query.productId as string;
    if (productId) {
      res.json(reviews.filter(r => r.productId === productId));
    } else {
      res.json(reviews);
    }
  });

  // 7. Post product review
  app.post("/api/reviews", async (req, res) => {
    const data = req.body;
    const newReview: Review = {
      id: `rev_${Date.now()}`,
      productId: data.productId,
      buyerName: data.buyerName || "Kind Neighbor",
      rating: Number(data.rating) || 5,
      comment: data.comment || "Love this homemade specialty!",
      date: new Date().toISOString().split("T")[0]
    };
    reviews.push(newReview);

    // Re-calculate rating
    const prod = products.find(p => p.id === data.productId);
    if (prod) {
      const prodReviews = reviews.filter(r => r.productId === data.productId);
      const totalRating = prodReviews.reduce((sum, r) => sum + r.rating, 0);
      prod.rating = parseFloat((totalRating / prodReviews.length).toFixed(1));
      prod.reviewsCount = prodReviews.length;
    }

    if (!persistDatabase(res)) return;
    res.json(newReview);
  });

  // 8. Put an order
  app.post("/api/orders", async (req, res) => {
    const { buyerName, buyerEmail, buyerPhone, deliveryMethod, address, items, notes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Basket is empty" });
    }

    // Double check stock and update it
    const orderItems: OrderItem[] = [];
    let orderTotal = 0;

    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) {
        return res.status(404).json({ error: `Product '${item.name}' not found` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({ error: `Sorry, only ${prod.stock} left of '${prod.name}'` });
      }
      prod.stock -= item.quantity;
      orderItems.push({
        productId: prod.id,
        name: prod.name,
        quantity: item.quantity,
        price: prod.price,
        sellerId: prod.sellerId
      });
      orderTotal += prod.price * item.quantity;
    }

    const newOrder: Order = {
      id: `ord_${Math.floor(1000 + Math.random() * 9000)}`,
      buyerName: buyerName || "Anonymous Local",
      buyerEmail: buyerEmail || "guest@example.com",
      buyerPhone: buyerPhone || "Unknown",
      deliveryMethod: deliveryMethod || "pickup",
      address: address || "Self Pickup",
      items: orderItems,
      total: orderTotal,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      notes: notes || ""
    };

    orders.push(newOrder);
    if (!persistDatabase(res)) return;
    res.json(newOrder);
  });

  // 9. Get orders
  app.get("/api/orders", (req, res) => {
    res.json(orders);
  });

  // 10. Update order status
  app.post("/api/orders/:id/status", async (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const order = orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      if (!persistDatabase(res)) return;
      res.json(order);
    } else {
      res.status(404).json({ error: "Order not found" });
    }
  });

  // ----------------------------------------------------
  // GEMINI AI WRITING INTELLIGENCE FOR LOCAL ARTISANS
  // ----------------------------------------------------

  // A. Generate heartfelt store storyteller narrative
  app.post("/api/gemini/generate-story", async (req, res) => {
    const { notes, artisanName, specialty } = req.body;
    
    if (!notes) {
      return res.status(400).json({ error: "Please write down some notes to base your story on." });
    }

    const systemInstruction = `You are a warm, supportive copywriter helping marketplace sellers write their "Our Story" bio. Sellers may be artisans, makers, food producers, digital builders, automation experts, designers, consultants, or local service providers.
    Prioritize the seller's raw notes above the existing profile name or shop name. If the notes describe a different business than the existing profile, do not invent unrelated craft, heritage, location, food, or handloom details.
    Write a clear, authentic storefront biography around 90-140 words. Keep it specific to what the seller actually says they do, and use modern service language when the seller describes apps, websites, AI tools, automations, or vibe coding.
    Return your answer in raw clean JSON with two properties: 'story' (string) and 'tags' (array of strings, limit to 3 tags like "AI App Builder", "Automation Specialist", "Local Maker"). Do not add backticks or markdown.`;

    const userPrompt = `Artisan Name: ${artisanName || "Our Family"}. 
Specialty / Shop Name: ${specialty || "Homemade Crafts"}. 
Raw Notes from the Seller: "${notes}". 
Please create our seller biography story. Match the business described in the notes and avoid unrelated details.`;

    if (ai_client) {
      try {
        const response = await ai_client.models.generateContent({
          model: GEMINI_MODEL,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        });

        const textOutput = response.text || "";
        res.setHeader("Content-Type", "application/json");
        res.send(textOutput);
      } catch (err: any) {
        console.error("Gemini Biography error:", err);
        res.json(getSTORY_FALLBACK(artisanName, specialty, notes));
      }
    } else {
      // Simulate beautiful placeholder generation locally when Gemini isn't booted
      setTimeout(() => {
        res.json(getSTORY_FALLBACK(artisanName, specialty, notes));
      }, 700);
    }
  });

  // B. Generate elegant product descriptions and suggestions
  app.post("/api/gemini/generate-description", async (req, res) => {
    const { name, category, keyFeatures, materials } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Product name is required to write descriptions." });
    }

    const systemInstruction = `You are an expert marketplace listing editor helping sellers write clear product or service listings. Sellers may offer handmade goods, food, beauty items, AI apps, websites, automation workflows, digital services, consulting, or custom builds.
    Prioritize the product name, materials, and key features provided by the seller. Do not force handmade, food, rustic, organic, or craft language unless the seller's inputs actually describe that kind of product.
    Write a useful buyer-facing description around 80-130 words. For AI apps, websites, automations, and digital services, explain the outcome, workflow, speed, customization, and practical benefit. For physical products, describe quality, materials, and use.
    Suggest a realistic price as a number in INR for the listed product or service. For custom AI/software/service work, prices can be much higher than physical goods.
    Return clean JSON with three properties: 'description' (string), 'bulletPoints' (array of strings, 3-5 concise points), and 'suggestedPrice' (number). Do not add backticks or markdown.`;

    const userPrompt = `Product Name: ${name}.
Category of product or service: ${category || "General Listing"}.
Materials, tools, stack, or key ingredients: ${materials || "Not specified"}.
Primary features, deliverables, or benefits: ${keyFeatures || "Carefully made"}.`;

    if (ai_client) {
      try {
        const response = await ai_client.models.generateContent({
          model: GEMINI_MODEL,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json"
          }
        });

        const textOutput = response.text || "";
        res.setHeader("Content-Type", "application/json");
        res.send(textOutput);
      } catch (err) {
        console.error("Gemini Product description error:", err);
        res.json(getPRODUCT_FALLBACK(name, category, keyFeatures, materials));
      }
    } else {
      setTimeout(() => {
        res.json(getPRODUCT_FALLBACK(name, category, keyFeatures, materials));
      }, 700);
    }
  });

  // C. 24/7 buyer assistant for store, product, and freshness questions
  app.post("/api/gemini/customer-chat", async (req, res) => {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Please enter a customer question." });
    }

    const marketplaceContext = buildMarketplaceContext();
    const trimmedHistory = Array.isArray(history)
      ? history.slice(-8).map((item: any) => ({
          role: item.role === "assistant" ? "assistant" : "customer",
          content: String(item.content || "").slice(0, 500)
        }))
      : [];

    const systemInstruction = `You are FreshTrack Assistant, a friendly 24/7 customer support chatbot for the FreshNest local marketplace.
    Answer buyer questions only using the marketplace context supplied by the server. Help customers compare stores, find products, understand prices, stock, pickup/delivery flow, seller stories, reviews, and FreshTrack freshness details.
    FreshTrack score is based on storage age versus seller-declared shelf life. Explain it as a helpful freshness signal, not a laboratory guarantee.
    Keep replies concise, practical, and warm. If the customer asks for something not present in the context, say what you can see and suggest a nearby product or seller. Do not invent products, sellers, policies, discounts, or medical claims.`;

    const userPrompt = `Marketplace context:
${marketplaceContext}

Recent chat:
${JSON.stringify(trimmedHistory)}

Customer question: ${message}`;

    if (ai_client) {
      try {
        const response = await ai_client.models.generateContent({
          model: GEMINI_MODEL,
          contents: userPrompt,
          config: {
            systemInstruction
          }
        });

        res.json({ reply: response.text || "I can help with products, sellers, freshness, and orders. What would you like to know?" });
      } catch (err) {
        console.error("Gemini Customer Chat error:", err);
        res.json({ reply: getCUSTOMER_CHAT_FALLBACK(message) });
      }
    } else {
      setTimeout(() => {
        res.json({ reply: getCUSTOMER_CHAT_FALLBACK(message) });
      }, 500);
    }
  });

  // Vite development middleware or static production handler
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://0.0.0.0:${PORT}`);
  });
}

// Fallback Generators to ensure the app continues to feel amazing even if keys are unset
function getSTORY_FALLBACK(name: string, specialty: string, notes: string) {
  const artisanName = name || "Artisan Heart";
  const shopSpecial = specialty || "Handmade Kitchen";
  const contentStory = `Inspired directly by: "${notes}". Founded deep in the heart of our neighborhood, ${shopSpecial} represents our love for traditional methods and slow crafting. Driven by ${artisanName}, we source everything from local, sustainable growers, building on heirloom stories that prioritize chemical-free processes, zero waste, and authentic quality. Every custom-ordered output is loaded with wholesome aromas, rustic details, and hours of personal care, offering high quality straight to your local table.`;
  return {
    story: contentStory,
    tags: ["Cottage Pioneer", "Heritage Crafter", "Zero-Waste Advocate"]
  };
}

function getPRODUCT_FALLBACK(name: string, category: string, features: string, materials: string) {
  const desc = `Individually prepared with immense heart: our ${name} represents true cottage craftsmanship. Formed under small-scale home supervision, this ${category || "specialty"} spotlights premium ingredients including: "${materials || "locally-selected organic raw components"}". Perfect for daily comfort, it features exquisite detail like "${features || "traditional small-batch methods"}". Enjoy healthy authenticity without artificial additions, directly addressing a healthy, cozy, and natural standard of living.`;
  return {
    description: desc,
    bulletPoints: [
      "100% Locally Sourced",
      "Hand-built in Micro Batches",
      "No Chemical Fillers or Additives"
    ],
    suggestedPrice: category && category.toLowerCase().includes("home") ? 35.0 : 9.5
  };
}

function buildMarketplaceContext() {
  const sellerLines = sellers.map(seller => {
    const sellerProducts = products.filter(product => product.sellerId === seller.id);
    return [
      `Store: ${seller.shopName}`,
      `Owner: ${seller.name}`,
      `Location: ${seller.location}`,
      `Badge: ${seller.badge}`,
      `Rating: ${seller.rating}/5`,
      `Story: ${seller.story}`,
      `Products: ${sellerProducts.map(product => product.name).join(", ") || "No active products"}`
    ].join(" | ");
  });

  const productLines = products.map(product => {
    const seller = sellers.find(s => s.id === product.sellerId);
    const freshTrack = getServerFreshTrack(product);
    return [
      `Product: ${product.name}`,
      `Price: INR ${product.price}`,
      `Category: ${product.category}`,
      `Stock: ${product.stock}`,
      `Seller: ${seller?.shopName || "Unknown store"}`,
      `Rating: ${product.rating}/5 from ${product.reviewsCount} reviews`,
      `FreshTrack: ${freshTrack.score}/100 (${freshTrack.status})`,
      `${getServerFreshnessLabel(product)}: ${formatServerDateTime(product.preparedAt)}`,
      `Packed: ${formatServerDateTime(product.packedAt)}`,
      `Storage age: ${freshTrack.storageHours.toFixed(1)} hours`,
      `Shelf life: ${freshTrack.shelfLifeHours} hours`,
      `Tags: ${product.tags.join(", ")}`,
      `Description: ${product.description}`
    ].join(" | ");
  });

  return [
    "Marketplace policy: customers can browse products, inspect FreshTrack before purchase, add to basket, then choose pickup or local delivery at checkout.",
    "Sellers:",
    ...sellerLines,
    "Products:",
    ...productLines
  ].join("\n");
}

function getServerFreshTrack(product: Product) {
  const storageValue = product.storageStartedAt || product.packedAt || product.preparedAt;
  const storageStart = storageValue ? new Date(storageValue).getTime() : Date.now();
  const shelfLifeHours = Math.max(Number(product.shelfLifeHours) || 24, 1);
  const storageHours = Math.max((Date.now() - storageStart) / (1000 * 60 * 60), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - (storageHours / shelfLifeHours) * 100)));
  const status = score >= 85 ? "Excellent" : score >= 65 ? "Good" : score >= 40 ? "Use soon" : "Past peak";
  return { score, status, storageHours, shelfLifeHours };
}

function getDefaultServerFreshnessType(category: string) {
  if (category === "Fruits" || category === "Vegetables") return "harvested";
  if (category === "Dairy") return "collected";
  if (category === "Meat") return "processed";
  return "prepared";
}

function getServerFreshnessLabel(product: Product) {
  const freshnessType = product.freshnessType || getDefaultServerFreshnessType(product.category);
  if (freshnessType === "harvested") return "Harvested";
  if (freshnessType === "collected") return "Collected";
  if (freshnessType === "processed") return "Processed";
  return product.category === "Food & Bakery" ? "Baked / Prepared" : "Prepared";
}

function formatServerDateTime(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getCUSTOMER_CHAT_FALLBACK(message: string) {
  const query = message.toLowerCase();
  const matchingProducts = products
    .map(product => ({ product, freshTrack: getServerFreshTrack(product) }))
    .filter(({ product }) => {
      const haystack = [product.name, product.category, product.description, product.tags.join(" ")].join(" ").toLowerCase();
      return query.split(/\s+/).some(word => word.length > 2 && haystack.includes(word));
    })
    .slice(0, 3);

  if (matchingProducts.length > 0) {
    return matchingProducts.map(({ product, freshTrack }) => {
      const seller = sellers.find(s => s.id === product.sellerId);
      return `${product.name} is ₹${product.price.toLocaleString("en-IN")} from ${seller?.shopName || "a local seller"}. It has ${product.stock} in stock and FreshTrack is ${freshTrack.score}/100 (${freshTrack.status}). ${getServerFreshnessLabel(product)}: ${formatServerDateTime(product.preparedAt)}. Packed: ${formatServerDateTime(product.packedAt)}.`;
    }).join("\n\n");
  }

  const storeMatch = sellers.find(seller => {
    const haystack = [seller.name, seller.shopName, seller.location, seller.badge, seller.story].join(" ").toLowerCase();
    return query.split(/\s+/).some(word => word.length > 2 && haystack.includes(word));
  });

  if (storeMatch) {
    const sellerProducts = products.filter(product => product.sellerId === storeMatch.id);
    return `${storeMatch.shopName} is run by ${storeMatch.name} in ${storeMatch.location}. Their active products are: ${sellerProducts.map(product => product.name).join(", ") || "none right now"}.`;
  }

  return "I can help with stores, products, prices, stock, seller stories, delivery/pickup, and FreshTrack freshness scores. Try asking: Which bread is freshest? Which stores sell food? or Tell me about Devaki Amma's shop.";
}

startServer();
