import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import { LRUCache } from 'lru-cache';

const cacheDir = process.env.CACHE_DIR || path.join(process.env.HOME || '.', '.codeforce');
const filePath = path.join(cacheDir, 'cache.json');
const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

if (!fs.existsSync(cacheDir)) {
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
  } catch (error) {
    console.error(`[Cache] Failed to create cache directory at ${cacheDir}:`, error);
  }
}

interface Entry<T> {
  value: T;
  expires: number;
}

export class Cache {
  private lru = new LRUCache<string, Entry<any>>({ max: 500 });
  private pruningInProgress = false; // Guard for pruning logic to prevent recursive loops

  constructor(private ttlMs: number = 3600_000) {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(filePath)) {
        // console.log(`[Cache] File not found at ${filePath}, starting fresh.`);
        return;
      }
      const text = fs.readFileSync(filePath, 'utf8');
      if (!text) {
        // console.log(`[Cache] File at ${filePath} is empty, starting fresh.`);
        return;
      }
      const data: Record<string, Entry<any>> = JSON.parse(text);
      const now = Date.now();
      let loadedCount = 0;
      let expiredCount = 0;
      for (const [k, v] of Object.entries(data)) {
        if (v.expires > now) {
          this.lru.set(k, v);
          loadedCount++;
        } else {
          expiredCount++;
        }
      }
      // console.log(`[Cache] Loaded: ${loadedCount} active entries, ${expiredCount} expired entries removed.`);
    } catch (error) {
      console.error(`[Cache] Failed to load cache from ${filePath}:`, error);
      // Consider deleting the corrupted file:
      // try { fs.unlinkSync(filePath); console.log('[Cache] Deleted corrupted cache file.'); }
      // catch (e) { console.error(`[Cache] Failed to delete corrupted cache file:`, e); }
    }
  }

  private async save(isPruningSaveAttempt = false) {
    if (this.pruningInProgress && !isPruningSaveAttempt) {
      // console.log('[Cache] Save skipped: pruning already in progress.');
      return;
    }

    const data: Record<string, Entry<any>> = {};
    // LRUCache.forEach iterates from newest to oldest. This is fine for serialization.
    this.lru.forEach((v: Entry<any>, k: string) => (data[k] = v));

    try {
      await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
      // console.log(`[Cache] Saved to ${filePath}. Items: ${this.lru.size}. Pruning attempt: ${isPruningSaveAttempt}`);

      if (isPruningSaveAttempt) { // If this was a save during pruning, don't trigger another prune check
        return;
      }

      // Check cache size and prune if necessary
      const fileStats = await fsPromises.stat(filePath);
      // console.log(`[Cache] File size: ${fileStats.size} bytes.`);

      if (fileStats.size > MAX_CACHE_SIZE_BYTES && !this.pruningInProgress) {
        this.pruningInProgress = true;
        console.warn(`[Cache] File size ${fileStats.size} bytes exceeds MAX_CACHE_SIZE_BYTES (${MAX_CACHE_SIZE_BYTES}). Starting pruning.`);

        const itemsInLRU = this.lru.size;
        const itemsToRemove = Math.ceil(itemsInLRU * 0.20); // Remove oldest 20%

        if (itemsToRemove > 0) {
          // To remove the oldest, we iterate and delete from the tail of LRU's internal list.
          // LRUCache.keys() returns keys from most recently used to least recently used.
          const keys = Array.from(this.lru.keys());
          const oldestKeys = keys.slice(-itemsToRemove); // Get the last N keys (least recently used)

          let removedCount = 0;
          for (const key of oldestKeys) {
            this.lru.delete(key);
            removedCount++;
          }
          console.log(`[Cache] Pruned ${removedCount} oldest items. LRU size now: ${this.lru.size}.`);

          // Save the pruned cache. Pass true to indicate this is a pruning save attempt.
          await this.save(true);
        } else {
          console.warn(`[Cache] Pruning attempted but no items to remove or LRU is empty. LRU size: ${itemsInLRU}`);
        }
        this.pruningInProgress = false;
      }
    } catch (error) {
      console.error(`[Cache] Failed to save cache to ${filePath}:`, error);
      // Ensure pruningInProgress is reset if an error occurs during the pruning save
      if (this.pruningInProgress) { // Could be isPruningSaveAttempt or the main save that triggered pruning
        this.pruningInProgress = false;
      }
    }
  }

  get<T>(key: string): T | undefined {
    const entry = this.lru.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.value;
    }
    // Optional: if (entry) { this.lru.delete(key); /* delete expired item from memory */ }
    return undefined;
  }

  async set<T>(key: string, value: T) { // Made set async
    this.lru.set(key, { value, expires: Date.now() + this.ttlMs });
    await this.save(); // Await the save operation
  }
}
