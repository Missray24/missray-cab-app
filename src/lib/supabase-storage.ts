import { supabase } from './supabase'

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return publicUrl
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

// Create storage buckets if they don't exist
export async function initializeStorage() {
  const buckets = [
    { name: 'service-tiers', public: true },
    { name: 'chauffeurs', public: false },
    { name: 'documents', public: false }
  ]

  for (const bucket of buckets) {
    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/*', 'application/pdf']
    })

    // Ignore error if bucket already exists
    if (error && !error.message.includes('already exists')) {
      console.error(`Error creating bucket ${bucket.name}:`, error)
    }
  }
}