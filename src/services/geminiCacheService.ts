import { GoogleGenAI } from "@google/genai";

let currentCacheName: string | null = null;
let currentCacheContextHash: string | null = null;

// Keep a map of previously created caches by hash so we can attempt to reuse them even if model changes slightly 
// Note: caches in Gemini are usually bound to the specific model used during creation.
const cacheMap: Record<string, string> = {};

/**
 * Simple hash function for generating a unique key based on the massive context string.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = Math.trunc(hash); // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Ensures a context cache exists for the given system instruction and model.
 * Note: the `@google/genai` library's cache APIs are still evolving. 
 * Often the model prefix `models/` is required when creating cached content.
 */
export async function getOrCreateCache(
  ai: GoogleGenAI, 
  modelName: string, 
  systemInstructionText: string, 
  tools: any[] | undefined
): Promise<string> {
  // Model normalization - Cache API usually requires 'models/' prefix
  const cacheModel = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
  const stringifiedTools = tools ? JSON.stringify(tools) : "";
  
  // Create a unique hash for the context + model + tools
  const hashKey = `${cacheModel}_${hashString(systemInstructionText + stringifiedTools)}`;
  
  if (currentCacheName && currentCacheContextHash === hashKey) {
    try {
      // Ping API to ensure it hasn't expired
      const cacheInfo = await ai.caches.get({ name: currentCacheName });
      if (cacheInfo) {
        console.log(`[CacheService] Cache HIT: ${currentCacheName} (Model: ${cacheModel})`);
        return currentCacheName;
      }
    } catch (e) {
      console.warn(`[CacheService] Cache expired or missing on server. Re-creating...`);
      currentCacheName = null;
    }
  }

  // Check if we already created a cache for this exact setup earlier in this session
  if (cacheMap[hashKey]) {
    try {
      const cacheInfo = await ai.caches.get({ name: cacheMap[hashKey] });
      if (cacheInfo) {
        console.log(`[CacheService] Session Cache HIT: ${cacheMap[hashKey]} (Model: ${cacheModel})`);
        currentCacheName = cacheMap[hashKey];
        currentCacheContextHash = hashKey;
        return currentCacheName;
      }
    } catch (e) {
      console.warn(`[CacheService] Stored session cache expired. Re-creating...`);
      delete cacheMap[hashKey];
    }
  }

  // Create new cache
  try {
    console.log(`[CacheService] Creating new cache for Model: ${cacheModel}...`);
    
    // Convert tools to format accepted by cache creation
    const cacheConfig: any = {
      model: cacheModel,
      systemInstruction: systemInstructionText,
      ttl: "86400s", // 24 hours
    };

    if (tools && tools.length > 0) {
      cacheConfig.tools = tools;
    }

    const cacheDetails = await ai.caches.create(cacheConfig);
    
    currentCacheName = cacheDetails.name ?? null;
    currentCacheContextHash = hashKey;
    
    if (currentCacheName) {
      cacheMap[hashKey] = currentCacheName;
    }
    
    console.log(`[CacheService] Formatted cache successfully: ${currentCacheName} for Model ${cacheModel}`);
    return currentCacheName as string;
  } catch (error) {
    console.error(`[CacheService] Failed to create cache:`, error);
    // If caching fails (e.g. model not supported), let the caller fallback to standard generation
    throw error;
  }
}

/**
 * Resets the active cache tracking, forcing a new cache generation on next request.
 * Useful if the user triggers a major content overwrite manually.
 */
export function invalidateCache() {
  currentCacheName = null;
  currentCacheContextHash = null;
  console.log(`[CacheService] Cache state manually invalidated.`);
}
