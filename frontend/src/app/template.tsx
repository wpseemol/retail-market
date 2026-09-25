import { PageEnter } from "@/components/motion/PageEnter";

/**
 * Remounts on every route change (unlike layout) so each page plays
 * the bottom → top enter animation. Header/footer stay in layout.
 */
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageEnter className="flex min-h-0 flex-1 flex-col">{children}</PageEnter>;
}
