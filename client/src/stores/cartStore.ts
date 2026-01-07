import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@shared/schema";

/**
 * Cart Item representing a product in the shopping cart
 * Stores quantity, unit price, and optional batch/offer information
 */
export interface CartItem {
  product_id: string;
  product: Product;
  quantity: number;
  unit_price: number; // Price at time of adding to cart (for invoice accuracy)
  batch_id?: string; // For batch/lot tracking
  discount_percent?: number; // Item-level discount
  notes?: string; // Special notes (e.g., "Fresh stock", "Expiring soon")
}

/**
 * Cart State and Actions
 * Manages shopping cart items and calculations
 */
export interface CartState {
  items: CartItem[];
  created_at: number;
  last_updated: number;

  // Item Management
  addItem: (product: Product, quantity: number, batchId?: string) => void;
  removeItem: (product_id: string) => void;
  updateQuantity: (product_id: string, quantity: number) => void;
  updateDiscount: (product_id: string, discount_percent: number) => void;
  clearCart: () => void;

  // Calculations
  getSubtotal: () => number;
  getTaxAmount: (taxRate?: number) => number;
  getDiscountAmount: () => number;
  getTotal: (taxRate?: number) => number;
  getItemCount: () => number;

  // State Info
  isEmpty: () => boolean;
  hasItems: () => boolean;
}

/**
 * Create cart store with Zustand + persistence
 * - Persists cart to localStorage automatically
 * - Provides single source of truth for cart state
 * - Version 1 allows for migrations in future
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      created_at: Date.now(),
      last_updated: Date.now(),

      /**
       * Add product to cart or increment quantity if already exists
       */
      addItem: (product: Product, quantity: number, batchId?: string) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) =>
              item.product_id === product.id && item.batch_id === batchId
          );

          if (existingItem) {
            // Update quantity if item already in cart
            return {
              items: state.items.map((item) =>
                item.product_id === product.id && item.batch_id === batchId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
              last_updated: Date.now(),
            };
          }

          // Add new item to cart
          const newItem: CartItem = {
            product_id: product.id,
            product,
            quantity: Math.max(1, quantity),
            unit_price: Number(product.mrp) || 0,
            batch_id: batchId,
            discount_percent: 0,
          };

          return {
            items: [...state.items, newItem],
            last_updated: Date.now(),
          };
        });
      },

      /**
       * Remove product from cart
       */
      removeItem: (product_id: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.product_id !== product_id),
          last_updated: Date.now(),
        }));
      },

      /**
       * Update quantity for cart item
       */
      updateQuantity: (product_id: string, quantity: number) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === product_id
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
          last_updated: Date.now(),
        }));
      },

      /**
       * Apply item-level discount
       */
      updateDiscount: (product_id: string, discount_percent: number) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === product_id
              ? {
                  ...item,
                  discount_percent: Math.max(
                    0,
                    Math.min(100, discount_percent)
                  ),
                }
              : item
          ),
          last_updated: Date.now(),
        }));
      },

      /**
       * Clear entire cart
       */
      clearCart: () => {
        set({
          items: [],
          created_at: Date.now(),
          last_updated: Date.now(),
        });
      },

      /**
       * Calculate subtotal (before tax and discount)
       */
      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const itemTotal = item.unit_price * item.quantity;
          const discount = (itemTotal * (item.discount_percent || 0)) / 100;
          return sum + (itemTotal - discount);
        }, 0);
      },

      /**
       * Calculate tax amount
       * Default 5% IGST (Indian GST) - adjustable per org
       */
      getTaxAmount: (taxRate: number = 5) => {
        const subtotal = get().getSubtotal();
        return (subtotal * taxRate) / 100;
      },

      /**
       * Calculate total discount across all items
       */
      getDiscountAmount: () => {
        return get().items.reduce((sum, item) => {
          const itemTotal = item.unit_price * item.quantity;
          const discount = (itemTotal * (item.discount_percent || 0)) / 100;
          return sum + discount;
        }, 0);
      },

      /**
       * Calculate total (subtotal + tax - discount)
       */
      getTotal: (taxRate: number = 5) => {
        const subtotal = get().getSubtotal();
        const tax = get().getTaxAmount(taxRate);
        return subtotal + tax;
      },

      /**
       * Get total number of items (sum of quantities)
       */
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      /**
       * Check if cart is empty
       */
      isEmpty: () => {
        return get().items.length === 0;
      },

      /**
       * Check if cart has items
       */
      hasItems: () => {
        return get().items.length > 0;
      },
    }),
    {
      name: "pantrypal-cart", // localStorage key
      version: 1, // For future migrations
      partialize: (state) => ({
        items: state.items,
        created_at: state.created_at,
        last_updated: state.last_updated,
      }),
    }
  )
);

/**
 * Export a hook for convenience (optional, not required with Zustand)
 * Usage: const { items, addItem } = useCartStore()
 */
export const useCart = useCartStore;
