type JsonLdProps = {
    data: Record<string, unknown> | Record<string, unknown>[];
    id?: string;
};

/** Server-rendered `application/ld+json`. `<` is escaped so content can't close the script tag. */
export function JsonLd({ data, id }: JsonLdProps) {
    const json = JSON.stringify(data).replace(/</g, "\\u003c");
    return (
        <script
            id={id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
        />
    );
}
