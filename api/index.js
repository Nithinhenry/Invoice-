// api/index.js — Vercel Serverless Cloud Sync & Authentication API
// Automatically handles /api and /api/sync routes on Vercel

const memoryStore = {};

function hashPassword(str) {
  if (!str) return '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

async function fetchFromCloudKV(username) {
  try {
    const res = await fetch(`https://api.restful-api.dev/objects?name=inv_usr_${username}`);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        return list[0].data;
      }
    }
  } catch (e) {
    console.warn('KV fetch notice:', e);
  }
  return memoryStore[username] || null;
}

async function saveToCloudKV(username, record) {
  memoryStore[username] = record;
  try {
    const checkRes = await fetch(`https://api.restful-api.dev/objects?name=inv_usr_${username}`);
    if (checkRes.ok) {
      const list = await checkRes.json();
      if (Array.isArray(list) && list.length > 0) {
        const existingId = list[0].id;
        await fetch(`https://api.restful-api.dev/objects/${existingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `inv_usr_${username}`, data: record })
        });
        return;
      }
    }
    await fetch('https://api.restful-api.dev/objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `inv_usr_${username}`, data: record })
    });
  } catch (e) {
    console.warn('KV save notice:', e);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};
    const query = req.query || {};

    const username = (body.username || query.username || '').trim().toLowerCase();
    const password = body.password || query.password || '';
    const action = body.action || query.action || (req.method === 'GET' ? 'signin' : 'push');

    if (!username) {
      return res.status(200).json({ status: 'ok', message: 'Invoice Sync API Online' });
    }

    const userId = 'usr_' + username.replace(/[^a-z0-9]/g, '_');
    const inputHash = password ? hashPassword(password) : '';

    if (action === 'signin') {
      const cloudRecord = await fetchFromCloudKV(username);
      if (!cloudRecord) {
        return res.status(404).json({ error: 'Account not found. Please click Sign Up to create an account.' });
      }

      if (cloudRecord.user && cloudRecord.user.passwordHash && inputHash) {
        if (cloudRecord.user.passwordHash !== inputHash) {
          return res.status(401).json({ error: 'Invalid credentials. Password does not match.' });
        }
      } else if (password && cloudRecord.user) {
        cloudRecord.user.passwordHash = inputHash;
        await saveToCloudKV(username, cloudRecord);
      }

      return res.status(200).json({
        success: true,
        found: true,
        user: cloudRecord.user || { id: userId, username, name: username },
        settings: cloudRecord.settings || {},
        invoices: cloudRecord.invoices || []
      });
    }

    if (action === 'signup') {
      const existing = await fetchFromCloudKV(username);
      if (existing && existing.user && existing.user.passwordHash) {
        if (inputHash && existing.user.passwordHash !== inputHash) {
          return res.status(400).json({ error: 'Username is already taken. Please sign in or choose another username.' });
        }
      }

      const name = body.name || query.name || username;
      const record = {
        user: { id: userId, username, passwordHash: inputHash, name },
        settings: body.settings || existing?.settings || {},
        invoices: Array.isArray(body.invoices) ? body.invoices : (existing?.invoices || []),
        updatedAt: new Date().toISOString()
      };

      await saveToCloudKV(username, record);

      return res.status(200).json({
        success: true,
        message: 'Account created successfully',
        user: record.user,
        settings: record.settings,
        invoices: record.invoices
      });
    }

    if (action === 'push' || req.method === 'POST' || req.method === 'PUT') {
      const existing = (await fetchFromCloudKV(username)) || {};
      const newSettings = body.settings || existing.settings || {};
      const newInvoices = Array.isArray(body.invoices) ? body.invoices : (existing.invoices || []);
      const displayName = body.name || existing.user?.name || username;
      const pwdHash = inputHash || existing.user?.passwordHash || '';

      const record = {
        user: { id: userId, username, passwordHash: pwdHash, name: displayName },
        settings: newSettings,
        invoices: newInvoices,
        updatedAt: new Date().toISOString()
      };

      await saveToCloudKV(username, record);

      return res.status(200).json({
        success: true,
        message: 'Account data synced to cloud',
        data: record
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
