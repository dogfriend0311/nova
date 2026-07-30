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

export default async function handler(request, response) {
  // Resolve the SDK at runtime to avoid ESM/CJS resolution issues.
  // Prefer the direct client bundle export to get `handleUpload`.
  let handleUpload;
  const importedModules = [];

  const assignHandleUpload = (mod) => {
    if (!mod) return false;
    if (typeof mod.handleUpload === 'function') {
      handleUpload = mod.handleUpload;
      return true;
    }
    if (mod.default && typeof mod.default.handleUpload === 'function') {
      handleUpload = mod.default.handleUpload;
      return true;
    }
    if (mod.default && typeof mod.default === 'function') {
      handleUpload = mod.default;
      return true;
    }
    return false;
  };

  try {
    const mod = await import('@vercel/blob/dist/client.js');
    importedModules.push({ source: '@vercel/blob/dist/client.js', mod });
    if (!assignHandleUpload(mod)) {
      throw new Error('handleUpload not found in @vercel/blob/dist/client.js');
    }
  } catch (errDist) {
    try {
      const mod = await import('@vercel/blob/client');
      importedModules.push({ source: '@vercel/blob/client', mod });
      if (!assignHandleUpload(mod)) {
        throw new Error('handleUpload not found in @vercel/blob/client');
      }
    } catch (errClient) {
      try {
        const mod = await import('@vercel/blob');
        importedModules.push({ source: '@vercel/blob', mod });
        if (!assignHandleUpload(mod)) {
          throw new Error('handleUpload not found in @vercel/blob');
        }
      } catch (errTop) {
        console.error('Failed to load @vercel/blob SDK:', {
          errDist,
          errClient,
          errTop,
          importedModules: importedModules.map((entry) => entry.source),
        });
        return response.status(500).json({ error: 'Server misconfiguration: @vercel/blob SDK not found' });
      }
    }
  }
  // If the static read-write token isn't present, don't hard-fail —
  // Vercel may be using OIDC short-lived tokens for connected projects.
  // Log a warning so operators can see the deprecated token is missing,
  // but still attempt to generate a client token via the SDK.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('BLOB_READ_WRITE_TOKEN not present; attempting OIDC short-lived token flow');
  }

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
    // Log more context for server-side failures so we can diagnose
    // FUNCTION_INVOCATION_FAILED and other 500-level issues.
    try {
      console.error('blob-upload token error:', {
        message: error && error.message,
        code: error && error.code,
        stack: error && error.stack,
        method: request?.method,
        url: request?.url,
        headers: {
          origin: request?.headers?.origin,
          host: request?.headers?.host,
          referer: request?.headers?.referer,
        },
      });
    } catch (logErr) {
      console.error('Failed to log error context for blob-upload:', logErr);
    }

    // Return 500 for invocation failures (keep message minimal).
    const clientMessage = (error && (error.message || error.code)) || 'Upload authorization failed';
    return response.status(500).json({ error: clientMessage });
  }
}
