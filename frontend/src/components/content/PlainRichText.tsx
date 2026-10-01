import { cn } from "@/lib/utils";

type Block = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

/** Blank line = new paragraph; lines starting with `- ` = bullet list. Text only, never HTML. */
export function parsePlainRichText(source: string): Block[] {
    const blocks: Block[] = [];
    for (const chunk of source.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
        const lines = chunk.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
        if (!lines.length) continue;
        let para: string[] = [];
        let list: string[] = [];
        const flushPara = () => {
            if (para.length) blocks.push({ kind: "p", text: para.join("\n") });
            para = [];
        };
        const flushList = () => {
            if (list.length) blocks.push({ kind: "ul", items: list });
            list = [];
        };
        for (const line of lines) {
            const bullet = line.match(/^\s*[-•]\s+(.*)$/);
            if (bullet) {
                flushPara();
                list.push(bullet[1]);
            } else {
                flushList();
                para.push(line.trim());
            }
        }
        flushPara();
        flushList();
    }
    return blocks;
}

export function PlainRichText({ text, className }: { text: string; className?: string }) {
    return (
        <div className={cn("space-y-3", className)}>
            {parsePlainRichText(text).map((block, i) =>
                block.kind === "p" ? (
                    <p key={i} className="whitespace-pre-line">
                        {block.text}
                    </p>
                ) : (
                    <ul key={i} className="space-y-1.5 pl-1">
                        {block.items.map((item, j) => (
                            <li key={j} className="flex gap-2.5">
                                <span aria-hidden="true" className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-brand-primary" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                ),
            )}
        </div>
    );
}
