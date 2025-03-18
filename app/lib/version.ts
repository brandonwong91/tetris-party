// Version management for cache updates
export const APP_VERSION = "0.1.0";

export async function checkForUpdates(): Promise<boolean> {
  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.ready;
    const currentCache = await caches.open("tetris-party-v1");
    const cachedVersion = await currentCache.match("/version");
    if (!cachedVersion) return true;

    const cachedVersionText = await cachedVersion.text();
    return cachedVersionText !== APP_VERSION;
  }
  return false;
}

export async function clearCache(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    window.location.reload();
  }
}
