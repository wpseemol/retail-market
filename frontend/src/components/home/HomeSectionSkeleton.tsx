export function HomeSectionSkeleton({
  className = "h-48",
}: {
  className?: string;
}) {
  return (
    <section
      aria-hidden
      className="w-full py-6 bg-bg-base"
    >
      <div className="container mx-auto">
        <div
          className={`animate-pulse rounded-2xl bg-bg-surface border border-border-default ${className}`}
        />
      </div>
    </section>
  );
}
