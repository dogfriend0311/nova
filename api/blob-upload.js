// api/blob-upload.js
//
// Member banners/avatars and background video/audio can be up to 40 MB.
// Vercel serverless functions only accept small request bodies (a few MB),
// so those files can't be routed through a normal API call. Instead the
// browser uploads directly to Vercel Blob storage, and this function's only
// job is to hand out a short-lived, scoped upload token so the browser is
// allowed to do that (the real BLOB_READ_WRITE_TOKEN never reaches the
// browser). This is @vercel/blob's standard "client upload" pattern.
//
// Requires the BLOB_READ_WRITE_TOKEN env var, which Vercel sets
// automatically once a Blob store is connected to this project. For local
// dev, copy it into .env.local (see .env.example).

import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  const body = request.body;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Only ever called for uploads our own client code initiates, but
        // keep this scoped anyway: images/videos/audio only, capped at 40MB
        // (the largest file type we accept, background videos).
        return {
          allowedContentTypes: ['image/*', 'video/*', 'audio/*'],
          addRandomSuffix: false, // our client already builds a unique path
          maximumSizeInBytes: 40 * 1024 * 1024,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Nothing to persist server-side — the client saves blob.url
        // directly onto the member profile / article record itself.
        // Note: this callback is a webhook Vercel calls back on a public
        // URL, so it silently won't fire when testing on localhost.
        console.log('blob upload completed:', blob.url);
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error('blob-upload token error:', error);
    return response.status(400).json({ error: error.message || 'Upload authorization failed' });
  }
}
