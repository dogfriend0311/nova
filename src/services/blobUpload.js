// src/services/blobUpload.js
//
// Uploads a file straight from the browser to Vercel Blob storage. The
// bytes go directly from the browser to Blob (not through our serverless
// functions, which have a small body-size limit) — authorized by a
// short-lived token that /api/blob-upload issues per-upload.
//
// Replaces the old Supabase Storage "member-media" bucket uploads used
// for member avatars/banners, profile backgrounds/audio, and article
// photos.
import { upload } from '@vercel/blob/client';

// path: the full destination path, e.g. `image/username-12345-ab12cd.png`
// (same folder/filename convention the old Supabase uploads used).
export async function uploadToBlob(file, path) {
  const blob = await upload(path, file, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    contentType: file.type || undefined,
  });
  return blob.url;
}
