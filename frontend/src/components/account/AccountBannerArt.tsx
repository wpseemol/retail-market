/**
 * Clean account banner background — soft mint wash (light) / deep green (dark).
 * One subtle user watermark only; no busy circle layers.
 */

type Props = { className?: string };

export function AccountBannerArt({ className }: Props) {
  return (
    <div className={className} aria-hidden>
      {/* Clean base wash */}
      <div className="absolute inset-0 bg-[#EAF7EF] dark:bg-[#0F2A16]" />
      <div className="absolute inset-0 bg-linear-to-br from-[#F4FBF6] via-[#E4F5EA] to-[#D4EDDC] dark:from-[#0F2A16] dark:via-[#14361c] dark:to-[#1B4A26]" />
      {/* Soft right accent — very subtle */}
      <div className="absolute -right-8 top-1/2 size-[220px] -translate-y-1/2 rounded-full bg-[#00B207]/10 blur-2xl dark:bg-[#00B207]/15" />
      {/* Quiet watermark */}
      <svg
        viewBox="0 0 160 160"
        className="absolute right-4 top-1/2 hidden size-[140px] -translate-y-[55%] text-[#2E7D32] opacity-[0.12] sm:block lg:right-8 lg:size-[160px] dark:text-[#7ED992] dark:opacity-[0.14]"
      >
        <circle cx="80" cy="80" r="76" fill="currentColor" opacity="0.2" />
        <circle cx="80" cy="58" r="26" fill="currentColor" />
        <path
          d="M30 138c6-28 26-44 50-44s44 16 50 44"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
