"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function OrdersPage() {
  return (
    <main className="flex-1 bg-bg-base">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-3xl rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8"
        >
          <h1 className="relative inline-block text-xl sm:text-2xl font-semibold text-text-primary pb-2">
            My orders
            <span className="absolute bottom-0 left-0 w-7 h-0.5 bg-brand-primary" />
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Track purchases and reorder items from your order history.
          </p>

          <div className="mt-8 rounded-xl border border-dashed border-border-default bg-bg-subtle/40 px-5 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">
              No orders yet
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              When you check out, your orders will show up here.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex h-10 items-center rounded-md bg-brand-primary px-5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
            >
              Start shopping
            </Link>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
