import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Cache bucket URL map fetched from edge function
let cachedBucketUrls: Record<string, string> | null = null;
let initPromise: Promise<void> | null = null;

async function fetchBucketUrls(): Promise<Record<string, string>> {
  if (cachedBucketUrls) return cachedBucketUrls;
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/r2-storage?action=bucket-urls`,
    );
    if (response.ok) {
      cachedBucketUrls = await response.json();
      return cachedBucketUrls!;
    }
  } catch {
    // Fallback
  }
  return {};
}

function getBucketUrlSync(bucket: string): string {
  return cachedBucketUrls?.[bucket] || '';
}

// Prefetch bucket URLs when user is authenticated
export function initR2Storage(): Promise<void> {
  if (!initPromise) {
    initPromise = fetchBucketUrls().then(() => {}).catch(() => {});
  }
  return initPromise;
}

/**
 * R2 Storage helper - drop-in replacement for supabase.storage.from(bucket)
 * Uses Edge Function proxy for upload/delete, direct R2 public URL for reads
 */
export const r2Storage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: File | Blob, options?: { upsert?: boolean; contentType?: string }) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            return { data: null, error: { message: 'Not authenticated' } };
          }

          const contentType = options?.contentType || (file instanceof File ? file.type : 'application/octet-stream');
          const upsert = options?.upsert ? 'true' : 'false';

          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/r2-storage?action=upload&bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}&upsert=${upsert}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': contentType,
              },
              body: file,
            }
          );

          const result = await response.json();
          if (!response.ok) {
            return { data: null, error: { message: result.error || 'Upload failed' } };
          }

          return { data: result.data, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message || 'Upload failed' } };
        }
      },

      async remove(paths: string[]) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            return { data: null, error: { message: 'Not authenticated' } };
          }

          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/r2-storage?action=delete`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ bucket, paths }),
            }
          );

          const result = await response.json();
          if (!response.ok) {
            return { data: null, error: { message: result.error || 'Delete failed' } };
          }

          return { data: result.data, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message || 'Delete failed' } };
        }
      },

      getPublicUrl(path: string) {
        const base = getBucketUrlSync(bucket);
        if (base) {
          return { data: { publicUrl: `${base}/${path}` } };
        }
        // Fallback to Supabase storage URL (for old files)
        return supabase.storage.from(bucket).getPublicUrl(path);
      },

      async download(path: string) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            return { data: null, error: { message: 'Not authenticated' } };
          }

          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/r2-storage?action=download&bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );

          if (!response.ok) {
            return { data: null, error: { message: 'Download failed' } };
          }

          const blob = await response.blob();
          return { data: blob, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message || 'Download failed' } };
        }
      },

      async list(prefix?: string, options?: { limit?: number }) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            return { data: null, error: { message: 'Not authenticated' } };
          }

          const params = new URLSearchParams({
            action: 'list',
            bucket: bucket,
          });
          if (prefix) params.set('prefix', prefix);
          if (options?.limit) params.set('max-keys', String(options.limit));

          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/r2-storage?${params}`,
            {
              headers: { 'Authorization': `Bearer ${session.access_token}` },
            }
          );

          if (!response.ok) {
            return { data: null, error: { message: 'List failed' } };
          }

          const files = await response.json();
          return { data: files, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message || 'List failed' } };
        }
      },
    };
  },
};

/**
 * Get public URL for a file - works with both old Supabase URLs and new R2 URLs
 */
export function getR2FilePublicUrl(bucket: string, path: string): string {
  const base = getBucketUrlSync(bucket);
  if (base) {
    return `${base}/${path}`;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * All known R2 bucket names
 */
const ALL_BUCKETS = [
  'avatars', 'task-submissions', 'appeal-attachments', 'task-note-attachments',
  'group-images', 'project-resources', 'system-assets', 'profile-achievements',
];

/**
 * Normalize any storage URL (old Supabase or new R2) to the correct R2 public URL.
 * If bucket URLs are not yet cached, returns the original URL as-is.
 */
export function normalizeStorageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Already an R2 public URL — check if it matches any cached bucket URL base
  if (cachedBucketUrls) {
    for (const base of Object.values(cachedBucketUrls)) {
      if (base && url.startsWith(base)) return url; // Already correct R2 URL
    }
  }

  // Check if this is a Supabase storage URL and convert it
  const supabasePattern = /https?:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)/;
  const match = url.match(supabasePattern);
  if (match) {
    const [, bucket, path] = match;
    if (ALL_BUCKETS.includes(bucket)) {
      const base = getBucketUrlSync(bucket);
      if (base) {
        return `${base}/${path}`;
      }
    }
  }

  return url;
}

/**
 * Extract the file path from a storage URL (R2 or Supabase) for a given bucket.
 * Returns the path portion after the bucket prefix, or null if not parseable.
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  if (!url) return null;

  // Try R2 public URL format
  if (cachedBucketUrls) {
    const base = cachedBucketUrls[bucket];
    if (base && url.startsWith(base + '/')) {
      return url.substring(base.length + 1);
    }
  }

  // Try Supabase storage URL format
  const supabasePattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)`);
  const match = url.match(supabasePattern);
  if (match) return match[1];

  // Try pathname-based extraction (generic)
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split(`/${bucket}/`);
    if (parts.length > 1) return parts[1];
  } catch {
    // Not a valid URL
  }

  return null;
}
