export type AssetKind = "IMAGE" | "VIDEO";

export type AssetRequest = {
  query: string;
  preferredKind: AssetKind;
};

export type ResolvedAsset = {
  provider: string;
  url: string;
  type: AssetKind;
  attribution: string | null;
  licenseMetadata: Record<string, unknown>;
};

export interface AssetProvider {
  readonly available: boolean;
  readonly name: string;
  resolve(request: AssetRequest): Promise<ResolvedAsset | null>;
}

export class AssetProviderError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AssetProviderError";
  }
}

export class DisabledAssetProvider implements AssetProvider {
  readonly available = false;
  readonly name = "MÍDIA NÃO CONFIGURADA";
  async resolve(): Promise<ResolvedAsset | null> {
    throw new AssetProviderError("ASSET_PROVIDER_NOT_CONFIGURED", this.name);
  }
}

type PexelsVideo = {
  id: number;
  url: string;
  user?: { name?: string; url?: string };
  video_files?: Array<{ link?: string; file_type?: string; width?: number; height?: number }>;
};
type PexelsPhoto = {
  id: number;
  url: string;
  photographer?: string;
  photographer_url?: string;
  src?: { portrait?: string; large?: string };
};

/** Resolves production-safe HTTPS media through the official Pexels API. */
export class PexelsAssetProvider implements AssetProvider {
  readonly available = true;
  readonly name = "PEXELS";
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  constructor(apiKey: string, fetcher: typeof fetch = fetch) { this.apiKey = apiKey; this.fetcher = fetcher; }

  async resolve(request: AssetRequest): Promise<ResolvedAsset | null> {
    const query = request.query.trim();
    if (!query) return null;
    return request.preferredKind === "VIDEO" ? this.resolveVideo(query) : this.resolvePhoto(query);
  }

  private async resolveVideo(query: string): Promise<ResolvedAsset | null> {
    const response = await this.request(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=portrait`);
    const body = await response.json() as { videos?: PexelsVideo[] };
    const video = body.videos?.[0];
    const file = video?.video_files?.filter(item => item.file_type === "video/mp4" && item.link?.startsWith("https://")).sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
    if (!video || !file?.link) return null;
    return { provider: this.name, url: file.link, type: "VIDEO", attribution: video.user?.name ?? null, licenseMetadata: { sourceUrl: video.url, creatorUrl: video.user?.url ?? null, license: "Pexels License", providerAssetId: video.id } };
  }

  private async resolvePhoto(query: string): Promise<ResolvedAsset | null> {
    const response = await this.request(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`);
    const body = await response.json() as { photos?: PexelsPhoto[] };
    const photo = body.photos?.[0];
    const url = photo?.src?.portrait ?? photo?.src?.large;
    if (!photo || !url?.startsWith("https://")) return null;
    return { provider: this.name, url, type: "IMAGE", attribution: photo.photographer ?? null, licenseMetadata: { sourceUrl: photo.url, creatorUrl: photo.photographer_url ?? null, license: "Pexels License", providerAssetId: photo.id } };
  }

  private async request(url: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.ASSET_PROVIDER_TIMEOUT_MS || 8000));
    try {
      const response = await this.fetcher(url, { headers: { Authorization: this.apiKey }, signal: controller.signal });
      if (!response.ok) throw new AssetProviderError("ASSET_PROVIDER_REQUEST_FAILED", `Pexels indisponível (${response.status})`);
      return response;
    } catch (error) {
      if (error instanceof AssetProviderError) throw error;
      if ((error as Error).name === "AbortError") throw new AssetProviderError("ASSET_PROVIDER_TIMEOUT", "Tempo limite do provider de mídia excedido");
      throw new AssetProviderError("ASSET_PROVIDER_NETWORK_ERROR", "Falha de comunicação com o provider de mídia");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getAssetProvider(): AssetProvider {
  return process.env.ASSET_PROVIDER === "pexels" && process.env.PEXELS_API_KEY
    ? new PexelsAssetProvider(process.env.PEXELS_API_KEY)
    : new DisabledAssetProvider();
}
