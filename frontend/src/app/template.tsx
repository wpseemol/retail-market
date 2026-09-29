import { PageEnter } from "@/components/motion/PageEnter";

export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageEnter className="flex min-h-0 flex-1 flex-col">{children}</PageEnter>;
}
