import { useEffect, useMemo, useRef, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import isoCountries from "i18n-iso-countries";
import worldUrl from "world-atlas/countries-110m.json?url";
import type { CountryRow } from "@/lib/overview";
import { cn } from "@/lib/utils";

const WIDTH = 960;
const HEIGHT = 470;
const ANTARCTICA = "010";

type CountryFeature = Feature<Geometry, { name?: string }> & { id?: string | number };

let worldPromise: Promise<CountryFeature[]> | null = null;

function loadWorld() {
  worldPromise ??= fetch(worldUrl)
    .then((r) => r.json() as Promise<Topology<{ countries: GeometryCollection<{ name?: string }> }>>)
    .then((topo) => {
      const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name?: string }>;
      return (fc.features as CountryFeature[]).filter((f) => String(f.id) !== ANTARCTICA);
    })
    .catch((err) => {
      worldPromise = null;
      throw err;
    });
  return worldPromise;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function displayName(alpha2: string | undefined, fallback?: string) {
  if (!alpha2) return fallback ?? "Unknown";
  try {
    return regionNames.of(alpha2) ?? fallback ?? alpha2;
  } catch {
    return fallback ?? alpha2;
  }
}

type Hover = { alpha2?: string; name: string; visits: number; percent: number; flag?: string; x: number; y: number };

/** Choropleth of visits per country (ISO alpha-2 from the API → world-atlas numeric ids). */
export function WorldMap({ countries, className }: { countries: CountryRow[]; className?: string }) {
  const [features, setFeatures] = useState<CountryFeature[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadWorld()
      .then((f) => !cancelled && setFeatures(f))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const byNumeric = useMemo(() => {
    const map = new Map<string, CountryRow>();
    for (const row of countries) {
      const numeric = isoCountries.alpha2ToNumeric(row.country);
      if (numeric) map.set(numeric, row);
    }
    return map;
  }, [countries]);

  const max = useMemo(() => Math.max(1, ...[...byNumeric.values()].map((r) => r.visits)), [byNumeric]);

  const paths = useMemo(() => {
    if (!features) return [];
    const projection = geoEqualEarth().fitSize([WIDTH, HEIGHT], {
      type: "FeatureCollection",
      features,
    } as FeatureCollection);
    const path = geoPath(projection);
    return features.map((f) => {
      const id = String(f.id ?? "").padStart(3, "0");
      return { id, d: path(f) ?? "", name: f.properties?.name };
    });
  }, [features]);

  function fillFor(id: string) {
    const row = byNumeric.get(id);
    if (!row) return "var(--map-empty)";
    const strength = 20 + Math.round(Math.sqrt(row.visits / max) * 80);
    return `color-mix(in oklab, var(--chart-1) ${strength}%, var(--map-empty))`;
  }

  function onMove(e: React.MouseEvent, id: string, name?: string) {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const row = byNumeric.get(id);
    const alpha2 = row?.country ?? isoCountries.numericToAlpha2(id);
    setHover({
      alpha2,
      name: row?.country_name && row.country_name !== row.country ? row.country_name : displayName(alpha2, name),
      visits: row?.visits ?? 0,
      percent: row?.percent ?? 0,
      flag: row?.flag,
      x: e.clientX - box.left,
      y: e.clientY - box.top,
    });
  }

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground", className)}>
        Could not load the world map.
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={cn("relative", className)} onMouseLeave={() => setHover(null)}>
      {!features ? (
        <div className="aspect-[960/470] w-full animate-pulse rounded-xl bg-muted/50" />
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="World map of visitors by country">
          {paths.map((p) => (
            <path
              key={p.id + p.d.length}
              d={p.d}
              fill={fillFor(p.id)}
              stroke="var(--background)"
              strokeWidth={0.5}
              className="cursor-pointer transition-[filter] hover:brightness-110 hover:[stroke:var(--foreground)] hover:[stroke-width:0.8]"
              onMouseMove={(e) => onMove(e, p.id, p.name)}
            />
          ))}
        </svg>
      )}

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-xl"
          style={{ left: hover.x, top: hover.y }}
        >
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            {hover.flag ? <span aria-hidden>{hover.flag}</span> : null}
            {hover.name}
          </p>
          <p className="mt-0.5 tabular-nums text-muted-foreground">
            {hover.visits > 0 ? `${hover.visits.toLocaleString()} visits · ${hover.percent}%` : "No visits yet"}
          </p>
        </div>
      ) : null}

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Fewer</span>
        <span
          className="h-2 w-28 rounded-full"
          style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--chart-1) 20%, var(--map-empty)), var(--chart-1))" }}
          aria-hidden
        />
        <span>More visits</span>
      </div>
    </div>
  );
}

export default WorldMap;
