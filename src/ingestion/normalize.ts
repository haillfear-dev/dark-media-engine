import { createHash } from "node:crypto";
import type { IngestedItem } from "./types.ts";

const TRACKING = new Set(["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid"]);
export function normalizeUrl(value: string) { const url = new URL(value); url.hash = ""; url.hostname = url.hostname.toLowerCase().replace(/^www\./, ""); [...url.searchParams.keys()].forEach(key => { if (TRACKING.has(key.toLowerCase())) url.searchParams.delete(key); }); url.pathname = url.pathname.replace(/\/+$/, "") || "/"; url.searchParams.sort(); return url.toString(); }
export function normalizeText(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
export function contentHash(item: Pick<IngestedItem,"title"|"summary"|"cleanText">) { return createHash("sha256").update(normalizeText(`${item.title}\n${item.summary}\n${item.cleanText}`)).digest("hex"); }
export function canonicalizeItem(item: IngestedItem) { const canonicalUrl = normalizeUrl(item.canonicalUrl || item.sourcePageUrl); return { ...item, canonicalUrl, normalizedUrl: canonicalUrl, normalizedTitle: normalizeText(item.title), contentHash: contentHash(item), summary: item.summary.trim().slice(0,1200), cleanText: item.cleanText.trim().slice(0,4000) }; }

const STOP = new Set("a o as os de da do das dos e em no na nos nas por para com sobre apos após que um uma diz segundo acordo informou portal".split(" "));
export function significantTokens(value: string) { return new Set(normalizeText(value).split(" ").filter(token => token.length > 2 && !STOP.has(token))); }
export function headlineSimilarity(left: string, right: string) { const a=significantTokens(left),b=significantTokens(right);if(!a.size||!b.size)return 0;const common=[...a].filter(token=>b.has(token)).length;const jaccard=common/new Set([...a,...b]).size;const properEntities=(left.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+/gu)??[]).map(normalizeText),rightEntities=new Set((right.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+/gu)??[]).map(normalizeText));const entityOverlap=properEntities.some(entity=>rightEntities.has(entity)) ? .35 : 0;return Math.min(1,jaccard+entityOverlap); }
export function detectDependency(text: string, sources: Array<{id:string;name:string}>) { const normalized=normalizeText(text); return sources.find(source => new RegExp(`(?:segundo|de acordo com|informou (?:o )?portal) ${escapeRegex(normalizeText(source.name))}`).test(normalized))?.id ?? null; }
const escapeRegex=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
