import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  distance?: number;
};

export function RevealOnScroll({ children, className }: RevealProps) {
  return <div className={className}>{children}</div>;
}

type RevealItemProps = {
  children: ReactNode;
  index?: number;
  className?: string;
};

export function RevealItem({ children, className }: RevealItemProps) {
  return <div className={className}>{children}</div>;
}
