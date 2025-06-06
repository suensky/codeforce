import fs from 'fs';
import path from 'path';
import LRU from 'lru-cache';

const cacheDir = process.env.CACHE_DIR || path.join(process.env.HOME || '.', '.codeforce');
const filePath = path.join(cacheDir, 'cache.json');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

interface Entry<T> {
  value: T;
  expires: number;
}

export class Cache {
  private lru = new LRU<string, Entry<any>>({ max: 500 });

  constructor(private ttlMs: number = 3600_000) {
    this.load();
  }

  private load() {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const data: Record<string, Entry<any>> = JSON.parse(text);
      const now = Date.now();
      for (const [k, v] of Object.entries(data)) {
        if (v.expires > now) {
          this.lru.set(k, v);
        }
      }
    } catch {
      // ignore
    }
  }

  private async save() {
    const data: Record<string, Entry<any>> = {};
    this.lru.forEach((v, k) => (data[k] = v));
    await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  get<T>(key: string): T | undefined {
    const entry = this.lru.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.value;
    }
  }

  set<T>(key: string, value: T) {
    this.lru.set(key, { value, expires: Date.now() + this.ttlMs });
    this.save();
  }
}
