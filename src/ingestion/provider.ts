import { parseArticleHtml, parseFeed, parseSitemap } from "./parsers.ts";
import type { IngestionResult, SourceConfig, SourceIngestionProvider } from "./types.ts";

export class IngestionError extends Error { readonly code: string; readonly httpStatus?: number; constructor(code: string, message: string, httpStatus?: number) { super(message); this.code=code; this.httpStatus=httpStatus; this.name = "IngestionError"; } }
export class HttpSourceIngestionProvider implements SourceIngestionProvider {
  private readonly fetcher: typeof fetch; private readonly timeoutMs: number;
  constructor(fetcher: typeof fetch = fetch, timeoutMs = Number(process.env.INGEST_TIMEOUT_MS || 12000)) { this.fetcher=fetcher; this.timeoutMs=timeoutMs; }
  async collect(source: SourceConfig): Promise<IngestionResult> {
    const response = await this.request(source.url, source, 0);
    const headers = { etag: response.headers.get("etag"), lastModified: response.headers.get("last-modified") };
    if (response.status === 304) return { items: [], httpStatus: 304, ...headers, notModified: true };
    const body = await response.text(), defaults = { category: source.category, language: source.language };
    let items = source.strategy === "SITEMAP" ? parseSitemap(body, defaults) : source.strategy === "HTML_LISTING" ? await this.parseListing(body, source, defaults) : parseFeed(body, source.url, defaults);
    const limit = Number(process.env.INGEST_MAX_ITEMS_PER_SOURCE || 10);
    items = items.slice(0, limit);
    return { items, httpStatus: response.status, ...headers, notModified: false };
  }
  private async parseListing(html: string, source: SourceConfig, defaults: { category: string; language: string }) {
    const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)].map(match => new URL(match[1], source.baseUrl).toString()).filter((url, index, all) => all.indexOf(url) === index).slice(0, Number(process.env.INGEST_MAX_ITEMS_PER_SOURCE || 10));
    const items = []; for (const url of links) { try { const response = await this.request(url, { ...source, etag: null, lastModified: null }, 0); const item = parseArticleHtml(await response.text(), url, defaults); if (item) items.push(item); } catch { continue; } } return items;
  }
  private async request(url: string, source: SourceConfig, attempt: number): Promise<Response> {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string,string> = { "User-Agent": process.env.INGEST_USER_AGENT || "DarkMediaEngine/1.0 (+editorial-ingestion)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/html;q=0.8" };
      if (source.etag) headers["If-None-Match"] = source.etag; if (source.lastModified) headers["If-Modified-Since"] = source.lastModified;
      const response = await this.fetcher(url, { headers, signal: controller.signal, redirect: "follow" });
      if ([401,403,429].includes(response.status)) throw new IngestionError(response.status === 429 ? "RATE_LIMITED" : "SOURCE_BLOCKED", `Fonte indisponível (${response.status})`, response.status);
      if (response.status >= 500 && attempt < 1) { await new Promise(resolve => setTimeout(resolve, 100)); return this.request(url, source, attempt + 1); }
      if (!response.ok && response.status !== 304) throw new IngestionError("HTTP_ERROR", `HTTP ${response.status}`, response.status);
      return response;
    } catch (error) { if ((error as Error).name === "AbortError") throw new IngestionError("TIMEOUT", "Tempo limite da fonte excedido"); throw error; } finally { clearTimeout(timeout); }
  }
}
