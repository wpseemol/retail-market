import type { ReactNode } from "react";

export function PageEnter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  delay?: number;
}) {
  return <div className={className}>{children}</div>;
}
