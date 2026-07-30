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
// Requires the BLOB_READ_WRITE_TOKEN env var. Note: this is true even if
// your project has been "Upgraded to OIDC" for other Blob operations —
// handleUpload() (used here to mint client tokens for browser uploads)
// always needs the static read-write token; OIDC is not accepted for it.
// For local dev, copy the token into .env.local (see .env.example).

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
  // handleUpload() always needs the static read-write token to sign client
  // tokens — OIDC (VERCEL_OIDC_TOKEN) is not accepted for this call, even on
  // stores upgraded to OIDC. Fail fast with an actionable message instead of
  // letting the SDK throw its generic "no read-write token found" error.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      'blob-upload misconfigured: BLOB_READ_WRITE_TOKEN is not set. ' +
      'Go to Vercel dashboard -> Storage -> your Blob store -> Settings/Tokens, ' +
      'copy the read-write token, and add it as BLOB_READ_WRITE_TOKEN in ' +
      'Project Settings -> Environment Variables (Production and Preview), then redeploy.'
    );
    return response.status(500).json({
      error: 'Server misconfiguration: BLOB_READ_WRITE_TOKEN env var is not set for this project.',
    });
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
