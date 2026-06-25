export interface StoredImage {
  readonly key: string;
  readonly url: string;
}

/** Persists a generated image and returns a URL the client can fetch. */
export interface ImageStore {
  save(key: string, data: Buffer, contentType: string): Promise<StoredImage>;
}
