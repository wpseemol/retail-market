"use client";

export function PrintButton({ label }: { label: string }) {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20 print:hidden"
        >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
                <path d="M6 14h12v7H6z" />
            </svg>
            {label}
        </button>
    );
}
