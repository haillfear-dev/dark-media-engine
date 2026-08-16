export type IngestionStrategy = "RSS" | "ATOM" | "SITEMAP" | "HTML_LISTING";
export type SourceConfig = {
  id: string; name: string; url: string; baseUrl: string; category: string; language: string; country: string;
  priority: number; reliability: number; strategy: IngestionStrategy; etag: string | null; lastModified: string | null;
};
export type IngestedItem = {
  canonicalUrl: string; title: string; subtitle: string; summary: string; cleanText: string; author: string | null;
  publishedAt: string | null; updatedAt: string | null; category: string; tags: string[]; language: string;
  ogImageUrl: string | null; sourcePageUrl: string; structuredData: Record<string, unknown>; ingestionMethod: string;
};
export type IngestionResult = { items: IngestedItem[]; httpStatus: number; etag: string | null; lastModified: string | null; notModified: boolean };
export interface SourceIngestionProvider { collect(source: SourceConfig): Promise<IngestionResult>; }
