import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredFile = { location: string; byteSize: number; mimeType: string; originalFilename: string };
export interface AssetStorage {
  saveVideo(file: File, assetId: string): Promise<StoredFile>;
  read(location: string): Promise<Buffer>;
  remove(location: string): Promise<void>;
}

const MP4_BRANDS = new Set(["isom", "iso2", "mp41", "mp42", "avc1", "M4V ", "qt  "]);
export function validateMp4Header(bytes: Uint8Array) {
  if (bytes.length < 12) return false;
  const box = String.fromCharCode(...bytes.slice(4, 8));
  const brand = String.fromCharCode(...bytes.slice(8, 12));
  return box === "ftyp" && MP4_BRANDS.has(brand);
}

export class LocalAssetStorage implements AssetStorage {
  private readonly root = path.resolve(process.env.ASSET_STORAGE_PATH ?? "./storage");
  async saveVideo(file: File, assetId: string): Promise<StoredFile> {
    const maxBytes = 500 * 1024 * 1024;
    if (file.size <= 0 || file.size > maxBytes) throw new Error("INVALID_VIDEO_SIZE");
    const data = new Uint8Array(await file.arrayBuffer());
    if (file.type !== "video/mp4" || !validateMp4Header(data)) throw new Error("INVALID_VIDEO");
    await mkdir(this.root, { recursive: true });
    const finalPath = path.join(this.root, `${assetId}.mp4`);
    const temporaryPath = `${finalPath}.uploading`;
    await writeFile(temporaryPath, data, { flag: "wx" });
    await rename(temporaryPath, finalPath);
    return { location: path.relative(process.cwd(), finalPath), byteSize: file.size, mimeType: file.type, originalFilename: path.basename(file.name) };
  }
  async read(location: string) {
    const absolute = path.resolve(location);
    if (!absolute.startsWith(`${this.root}${path.sep}`)) throw new Error("INVALID_STORAGE_LOCATION");
    return readFile(absolute);
  }
  async remove(location: string) { await unlink(path.resolve(location)); }
}

export function getAssetStorage(): AssetStorage { return new LocalAssetStorage(); }
