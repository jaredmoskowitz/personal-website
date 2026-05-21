import fs from 'fs';
import path from 'path';

// Local dev + activity sync use data/*.json. Redis is for production (Vercel) only.
const USE_REDIS =
  process.env.NODE_ENV === 'production' &&
  Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);

// ── File-system helpers (dev / no Redis) ─────────────────────────────────────

function dataPath(key: string) {
  return path.join(process.cwd(), 'data', `${key}.json`);
}

function fsGet<T>(key: string): T[] {
  try {
    return JSON.parse(fs.readFileSync(dataPath(key), 'utf-8')) as T[];
  } catch {
    return [];
  }
}

function fsSet<T>(key: string, items: T[]): void {
  const p = dataPath(key);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(items, null, 2));
}

// ── Redis helpers (prod) ──────────────────────────────────────────────────────

async function redisGet<T>(key: string): Promise<T[]> {
  const { Redis } = await import('@upstash/redis');
  const redis = Redis.fromEnv();
  const data = await redis.get<T[]>(key);
  return data ?? [];
}

async function redisSet<T>(key: string, items: T[]): Promise<void> {
  const { Redis } = await import('@upstash/redis');
  const redis = Redis.fromEnv();
  await redis.set(key, items);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getData<T>(key: string): Promise<T[]> {
  if (USE_REDIS) return redisGet<T>(key);
  return fsGet<T>(key);
}

export async function setData<T>(key: string, items: T[]): Promise<void> {
  if (USE_REDIS) return redisSet<T>(key, items);
  fsSet<T>(key, items);
}
