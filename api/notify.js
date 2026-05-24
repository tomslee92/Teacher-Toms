// WAYVE Push Notification API — Vercel Serverless Function
// Place this file at: api/notify.js
//
// Uses Firebase Cloud Messaging HTTP V1 API with service account auth.
// The legacy server key is deprecated — V1 uses short-lived OAuth tokens
// generated from the service account JSON stored in FIREBASE_SERVICE_ACCOUNT.

// Minimal JWT + OAuth implementation — no external dependencies needed.
// Signs a JWT with the service account private key to get an access token.
async function getFCMAccessToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  // Build JWT header + claim
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const unsignedToken = `${encode(header)}.${encode(claim)}`;

  // Sign with RSA-SHA256 using the service account private key
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${unsignedToken}.${signature}`;

  // Exchange JWT for OAuth access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret, title, body } = req.body || {};
  if (secret !== process.env.NOTIFY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT not configured in Vercel env vars' });
  }

  try {
    const accessToken = await getFCMAccessToken();

    const message = {
      message: {
        topic: 'wayve-qod',
        notification: {
          title: title || '🎙 WAYVE — 오늘의 질문',
          body: body || '오늘의 질문이 올라왔어요! Tap to answer.',
        },
        webpush: {
          notification: {
            icon: '/logo192.png',
            tag: 'wayve-qod',
            requireInteraction: false,
          },
          fcm_options: {
            link: '/',
          },
        },
      },
    };

    const response = await fetch(
      'https://fcm.googleapis.com/v1/projects/wayve-44fe7/messages:send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('FCM V1 error:', data);
      return res.status(500).json({ error: 'FCM send failed', detail: data });
    }

    return res.status(200).json({ success: true, messageId: data.name });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: err.message });
  }
}
