import { ShoppingBag, Sparkles, MapPin, Search } from "lucide-react";
import appLogoUrl from "../../assets/app-logo.png";

interface NavbarProps {
  currentRole: "buyer" | "seller";
  setRole: (role: "buyer" | "seller") => void;
  basketCount: number;
  openBasket: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export function Navbar({
  currentRole,
  setRole,
  basketCount,
  openBasket,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory
}: NavbarProps) {
  const categories = ["All", "Food & Bakery", "Fruits", "Vegetables", "Dairy", "Meat", "Homemade Food", "Handmade Home", "Beauty & Apothecary"];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); setRole("buyer"); }}>
          <img
            src={appLogoUrl}
            alt="FreshNest logo"
            className="h-12 w-12 rounded-2xl shadow-sm shadow-rose-200/70"
          />
          <div>
            <h1 className="font-sans text-lg font-bold tracking-tight text-stone-900 leading-none">
              FreshNest
            </h1>
            <span className="font-mono text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
              Freshness-First Marketplace
            </span>
          </div>
        </div>

        {/* Search Bar - Only seen in active buyer view */}
        {currentRole === "buyer" && (
          <div className="hidden md:flex relative flex-1 max-w-md mx-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-stone-400" />
            </div>
            <input
              type="text"
              placeholder="Search sourdough, organic washcloths, wildflower honey..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm rounded-xl border border-stone-200 bg-stone-50/50 py-2 pl-9 pr-4 text-stone-900 outline-hidden transition focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}

        {/* Dynamic Controls */}
        <div className="flex items-center gap-3">
          
          {/* Role Changer Pills */}
          <div className="flex items-center rounded-full bg-stone-100 p-1">
            <button
              id="btn-role-buyer"
              onClick={() => setRole("buyer")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition duration-200 ${
                currentRole === "buyer"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Buyer
            </button>
            <button
              id="btn-role-seller"
              onClick={() => setRole("seller")}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition duration-200 ${
                currentRole === "seller"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Seller
            </button>
          </div>

          {/* Cart Icon / Action */}
          {currentRole === "buyer" && (
            <button
              id="btn-cart-nav"
              onClick={openBasket}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 text-stone-700 transition"
            >
              <ShoppingBag className="h-5 w-5" />
              {basketCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white shadow-xs animate-bounce">
                  {basketCount}
                </span>
              )}
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-stone-50 rounded-lg text-stone-600 text-xs font-mono border border-stone-100">
            <MapPin className="h-3 w-3 text-amber-600" />
            <span>Local Market Hub</span>
          </div>

        </div>
      </div>

      {/* Categories sub-bar in Buyer role */}
      {currentRole === "buyer" && (
        <div className="border-t border-stone-50 bg-stone-50/50 py-2 overflow-x-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center gap-2">
            <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider mr-2 shrink-0">Categories:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1 text-xs transition shrink-0 ${
                  selectedCategory === cat
                    ? "bg-stone-950 font-medium text-white"
                    : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
