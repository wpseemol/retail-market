import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

/**
 * Always black modules on a white pad so authenticator apps can scan in
 * light and dark dashboard themes.
 */
export function TotpQrCode({
  value,
  size = 160,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-border bg-white p-3 shadow-sm",
        className,
      )}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={false}
        bgColor="#ffffff"
        fgColor="#0a0a0a"
      />
    </div>
  );
}
