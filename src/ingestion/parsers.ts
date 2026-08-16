import type { IngestedItem } from "./types.ts";

const decode = (value = "") => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (value = "") => decode(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tag = (block: string, names: string[]) => { for (const name of names) { const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i")); if (match) return text(match[1]); } return ""; };
const attr = (block: string, element: string, attribute: string) => block.match(new RegExp(`<${element}[^>]*\\s${attribute}=["']([^"']+)["'][^>]*>`, "i"))?.[1] ?? "";
const iso = (value: string) => { if (!value) return null; const date = new Date(value); return Number.isNaN(date.valueOf()) ? null : date.toISOString(); };

export function parseFeed(xml: string, sourcePageUrl: string, defaults: { category: string; language: string }): IngestedItem[] {
  const blocks = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].map(match => match[1]);
  return blocks.map(block => {
    const link = tag(block, ["link"]) || attr(block, "link", "href") || tag(block, ["guid", "id"]);
    const summary = tag(block, ["description", "summary", "content:encoded", "content"]);
    return { canonicalUrl: link, title: tag(block, ["title"]), subtitle: "", summary: summary.slice(0, 1200), cleanText: summary.slice(0, 4000), author: tag(block, ["author", "dc:creator"]) || null, publishedAt: iso(tag(block, ["pubDate", "published", "dc:date"])), updatedAt: iso(tag(block, ["updated"])), category: tag(block, ["category"]) || defaults.category, tags: [], language: defaults.language, ogImageUrl: attr(block, "media:content", "url") || attr(block, "enclosure", "url") || null, sourcePageUrl, structuredData: {}, ingestionMethod: "RSS_ATOM" };
  }).filter(item => item.title && item.canonicalUrl);
}

export function parseSitemap(xml: string, defaults: { category: string; language: string }): IngestedItem[] {
  return [...xml.matchAll(/<url(?:\s[^>]*)?>([\s\S]*?)<\/url>/gi)].map(match => match[1]).map(block => ({ canonicalUrl: tag(block, ["loc"]), title: tag(block, ["news:title"]), subtitle: "", summary: "", cleanText: "", author: null, publishedAt: iso(tag(block, ["news:publication_date"])), updatedAt: iso(tag(block, ["lastmod"])), category: defaults.category, tags: [], language: defaults.language, ogImageUrl: tag(block, ["image:loc"]) || null, sourcePageUrl: tag(block, ["loc"]), structuredData: {}, ingestionMethod: "SITEMAP" })).filter(item => item.canonicalUrl && item.title);
}

export function parseArticleHtml(html: string, pageUrl: string, defaults: { category: string; language: string }): IngestedItem | null {
  const metas = new Map([...html.matchAll(/<meta\s+[^>]*(?:property|name)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)].map(match => [match[1].toLowerCase(), decode(match[2])]));
  const reverseMetas = [...html.matchAll(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']([^"']+)["'][^>]*>/gi)]; reverseMetas.forEach(match => metas.set(match[2].toLowerCase(), decode(match[1])));
  const canonical = attr(html, "link", "href") && /<link[^>]+rel=["']canonical["']/i.test(html) ? attr(html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] ?? "", "link", "href") : pageUrl;
  const jsonLd = extractNewsJsonLd(html);
  const title = String(jsonLd?.headline ?? metas.get("og:title") ?? text(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]));
  if (!title) return null;
  const description = String(jsonLd?.description ?? metas.get("og:description") ?? metas.get("description") ?? "");
  const articleBody = text(String(jsonLd?.articleBody ?? "")).slice(0, 4000);
  return { canonicalUrl: canonical || pageUrl, title, subtitle: String(jsonLd?.alternativeHeadline ?? ""), summary: description.slice(0, 1200), cleanText: articleBody || description.slice(0, 4000), author: authorName(jsonLd?.author), publishedAt: iso(String(jsonLd?.datePublished ?? metas.get("article:published_time") ?? "")), updatedAt: iso(String(jsonLd?.dateModified ?? metas.get("article:modified_time") ?? "")), category: String(jsonLd?.articleSection ?? defaults.category), tags: keywords(jsonLd?.keywords), language: String(jsonLd?.inLanguage ?? defaults.language), ogImageUrl: imageUrl(jsonLd?.image) ?? metas.get("og:image") ?? null, sourcePageUrl: pageUrl, structuredData: jsonLd ?? {}, ingestionMethod: jsonLd ? "JSON_LD" : "OPEN_GRAPH" };
}

export function extractNewsJsonLd(html: string): Record<string, unknown> | null {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) try { const value = JSON.parse(match[1]); const nodes = Array.isArray(value) ? value : value?.["@graph"] ?? [value]; const article = nodes.find((node: Record<string, unknown>) => ["NewsArticle","Article","ReportageNewsArticle"].includes(String(node?.["@type"]))); if (article) return article; } catch { continue; }
  return null;
}
const authorName = (author: unknown) => { const value = Array.isArray(author) ? author[0] : author; return value && typeof value === "object" && "name" in value ? String(value.name) : typeof value === "string" ? value : null; };
const keywords = (value: unknown) => Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",").map(item => item.trim()).filter(Boolean) : [];
const imageUrl = (value: unknown): string | null => typeof value === "string" ? value : Array.isArray(value) ? imageUrl(value[0]) : value && typeof value === "object" && "url" in value ? String(value.url) : null;
