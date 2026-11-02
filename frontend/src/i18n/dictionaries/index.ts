import type { Locale } from "../config";
import en, { type Dictionary } from "./en";
import bn from "./bn";

export type { Dictionary };

export const dictionaries: Record<Locale, Dictionary> = { en, bn };
