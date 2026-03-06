const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

/**
 * Public asset URLs in data use "/assets/...".
 * In packaged Electron (file://), absolute-root URLs break, so normalize to relative.
 */
export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (ABSOLUTE_URL_PATTERN.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return url.startsWith("/") ? `./${url.slice(1)}` : url;
  }

  return url;
}
