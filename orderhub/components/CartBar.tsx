"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartProvider";
import { zl } from "@/lib/format";

export function CartBar() {
  const { itemCount, subtotal } = useCart();
  if (itemCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <Link
        href="/checkout"
        className="mx-auto flex max-w-3xl items-center justify-between rounded-2xl bg-[#5C6B3C] px-5 py-4 text-white shadow-[0_10px_24px_rgba(21,128,61,0.35)]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-extrabold text-[#5C6B3C]">
            {itemCount}
          </span>
          <span className="text-base font-bold">{zl(subtotal)}</span>
        </span>
        <span className="text-sm font-bold">Przejdź do koszyka →</span>
      </Link>
    </div>
  );
}
