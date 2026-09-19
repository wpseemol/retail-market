export default function OrDivider() {
    return (
        <div className="flex items-center gap-3 my-5" aria-hidden="true">
            <span className="h-px flex-1 bg-border-default" />
            <span className="text-xs font-medium tracking-wide text-text-secondary uppercase">
                OR
            </span>
            <span className="h-px flex-1 bg-border-default" />
        </div>
    );
}
