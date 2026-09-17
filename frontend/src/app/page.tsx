const groups = [
  {
    title: "Background",
    tokens: [
      { label: "bg-base", className: "bg-bg-base" },
      { label: "bg-surface", className: "bg-bg-surface" },
      { label: "bg-subtle", className: "bg-bg-subtle" },
    ],
  },
  {
    title: "Text",
    tokens: [
      { label: "text-primary", className: "bg-text-primary" },
      { label: "text-secondary", className: "bg-text-secondary" },
      { label: "border-default", className: "bg-border-default" },
    ],
  },
  {
    title: "Brand",
    tokens: [
      { label: "brand-primary", className: "bg-brand-primary" },
      { label: "brand-hover", className: "bg-brand-hover" },
      { label: "brand-deep", className: "bg-brand-deep" },
      { label: "brand-tint", className: "bg-brand-tint" },
    ],
  },
  {
    title: "Status",
    tokens: [
      { label: "warning", className: "bg-warning" },
      { label: "error", className: "bg-error" },
      { label: "info", className: "bg-info" },
      { label: "overlay-scrim", className: "bg-overlay-scrim" },
    ],
  },
];

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-16 w-full rounded-xl border border-border-default ${className}`} />
      <span className="font-mono text-xs text-text-secondary">{label}</span>
    </div>
  );
}

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col gap-12 py-14">
      <header className="flex flex-col gap-3">
        <span className="w-fit rounded-full bg-brand-tint px-3 py-1 text-sm font-medium text-brand-deep">
          Retail Market · Design System
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-text-primary">
          Semantic color tokens
        </h1>
        <p className="max-w-2xl text-lg text-text-secondary">
          Light and dark modes are driven by CSS variables and exposed to Tailwind CSS v4 through
          the native <code className="rounded bg-bg-subtle px-1.5 py-0.5 font-mono text-sm">@theme</code>{" "}
          directive.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-text-primary">{group.title}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {group.tokens.map((token) => (
              <Swatch key={token.label} {...token} />
            ))}
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-text-primary">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-full bg-brand-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-hover">
            Add to cart
          </button>
          <button className="rounded-full border border-border-default bg-bg-surface px-5 py-2.5 font-medium text-text-primary transition-colors hover:bg-bg-subtle">
            Secondary
          </button>
          <button className="rounded-full bg-brand-deep px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90">
            Deep
          </button>
        </div>
      </section>

      <footer className="border-t border-border-default pt-6 text-sm text-text-secondary">
        Toggle dark mode by adding the <code className="rounded bg-bg-subtle px-1.5 py-0.5 font-mono">dark</code>{" "}
        class to the <code className="rounded bg-bg-subtle px-1.5 py-0.5 font-mono">&lt;html&gt;</code> element.
      </footer>
    </main>
  );
}
