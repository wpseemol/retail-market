/** Cart line as returned by the backend (`/api/customer/cart`, `/api/cart/resolve`). */
export type CartLine = {
  product_id: string;
  variant_id: string | null;
  name: string;
  slug: string;
  image: string | null;
  alt: string;
  unit_price: number;
  compare_at_price: number | null;
  stock_qty: number;
  available: boolean;
  quantity: number;
  selected: boolean;
  line_total: number;
};

export type CartDto = {
  items: CartLine[];
  count: number;
  selected_count: number;
  selected_subtotal: number;
};

/** Minimal line kept in the guest cookie; everything else is re-priced from the database. */
export type CartLineRef = {
  product_id: string;
  quantity: number;
  selected: boolean;
};

export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 99;

export const EMPTY_CART: CartDto = {
  items: [],
  count: 0,
  selected_count: 0,
  selected_subtotal: 0,
};
