import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<{ meta?: { last_row_id?: number; changes?: number } }>;
};

export type TokenusageD1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(
    statements: D1PreparedStatement[]
  ): Promise<Array<{ meta?: { last_row_id?: number; changes?: number } }>>;
};

export type TokenusageR2Bucket = {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string | null,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<{
    body: ReadableStream | null;
    arrayBuffer(): Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
  } | null>;
  delete(key: string): Promise<void>;
};

type AssetsBinding = {
  fetch(request: Request | string | URL): Promise<Response>;
};

type TokenusageCloudflareEnv = CloudflareEnv & {
  TOKENUSAGE_DB?: TokenusageD1Database;
  TOKENUSAGE_SHARES?: TokenusageR2Bucket;
  ASSETS?: AssetsBinding;
};

export async function getTokenusageCloudflareEnv(): Promise<TokenusageCloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as TokenusageCloudflareEnv;
}

export async function getTokenusageD1(): Promise<TokenusageD1Database> {
  const env = await getTokenusageCloudflareEnv();
  if (!env.TOKENUSAGE_DB) {
    throw new Error("missing Cloudflare D1 binding TOKENUSAGE_DB");
  }
  return env.TOKENUSAGE_DB;
}

export async function getTokenusageAssets(): Promise<AssetsBinding> {
  const env = await getTokenusageCloudflareEnv();
  if (!env.ASSETS) {
    throw new Error("missing Cloudflare ASSETS binding");
  }
  return env.ASSETS;
}

export async function getTokenusageR2(): Promise<TokenusageR2Bucket> {
  const env = await getTokenusageCloudflareEnv();
  if (!env.TOKENUSAGE_SHARES) {
    throw new Error("missing Cloudflare R2 binding TOKENUSAGE_SHARES");
  }
  return env.TOKENUSAGE_SHARES;
}
