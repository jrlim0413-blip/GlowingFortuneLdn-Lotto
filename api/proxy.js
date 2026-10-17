export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
  const authBearer = process.env.VITE_AUTHORIZATION || '';

  const supaHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const { action, type, from, to, drawId, id, token, username } = req.query || {};

  if (action === 'boot') {
    try {
      const [matrixRes, commRes, usersRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config?id=eq.matrix_config&select=config`, { headers: supaHeaders }),
        fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config?id=eq.commissions_config&select=config`, { headers: supaHeaders }),
        fetch(`${SUPABASE_URL}/rest/v1/rbac_users?select=*&order=created_at.desc`, { headers: supaHeaders }),
      ]);
      const matrixData = await matrixRes.json();
      const commData = await commRes.json();
      const usersData = await usersRes.json();

      let matrixConfig = matrixData?.[0]?.config || null;
      let commConfig = commData?.[0]?.config || null;

      if (!matrixConfig || !commConfig) {
        if (Array.isArray(usersData)) {
          const sysMatrix = usersData.find((u) => u.id === '__sys_matrix_config__');
          if (!matrixConfig && sysMatrix?.email) {
            try { matrixConfig = JSON.parse(sysMatrix.email); } catch {}
          }
          const sysComm = usersData.find((u) => u.id === '__sys_commissions_config__');
          if (!commConfig && sysComm?.email) {
            try { commConfig = JSON.parse(sysComm.email); } catch {}
          }
        }
      }

      let sessionUser = null;
      if (token) {
        const sesRes = await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config?id=eq.active_sessions&select=config`, { headers: supaHeaders });
        const sesData = await sesRes.json();
        if (sesData?.[0]?.config?.[token]) {
          sessionUser = sesData[0].config[token];
        }
      }

      return res.status(200).json({
        success: true,
        matrix: matrixConfig,
        commissions: commConfig,
        users: Array.isArray(usersData) ? usersData : [],
        sessionUser,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'get_matrix') {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config?id=eq.matrix_config&select=config`, { headers: supaHeaders });
      const data = await r.json();
      let config = data?.[0]?.config || null;
      if (!config) {
        const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/rbac_users?id=eq.__sys_matrix_config__&select=email`, { headers: supaHeaders });
        const fallbackData = await fallbackRes.json();
        if (fallbackData?.[0]?.email) {
          try { config = JSON.parse(fallbackData[0].email); } catch {}
        }
      }
      return res.status(200).json({ success: true, config });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'get_commissions') {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config?id=eq.commissions_config&select=config`, { headers: supaHeaders });
      const data = await r.json();
      let settings = data?.[0]?.config || null;
      if (!settings) {
        const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/rbac_users?id=eq.__sys_commissions_config__&select=email`, { headers: supaHeaders });
        const fallbackData = await fallbackRes.json();
        if (fallbackData?.[0]?.email) {
          try { settings = JSON.parse(fallbackData[0].email); } catch {}
        }
      }
      return res.status(200).json({ success: true, settings });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'get_users') {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rbac_users?select=*&order=created_at.desc`, { headers: supaHeaders });
      const data = await r.json();
      return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'save_matrix') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config`, {
        method: 'POST',
        headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'matrix_config',
          config: body,
          updated_at: new Date().toISOString(),
        }),
      });
      return res.status(r.status).json({ success: r.ok });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'save_commissions') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config`, {
        method: 'POST',
        headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'commissions_config',
          config: body,
          updated_at: new Date().toISOString(),
        }),
      });
      return res.status(r.status).json({ success: r.ok });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'save_user') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rbac_users`, {
        method: 'POST',
        headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(r.status).json({ success: r.ok, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'delete_user') {
    try {
      const targetId = id || req.query.id;
      const targetUsername = username || req.query.username;
      let queryParam = '';
      if (targetId && targetUsername) {
        queryParam = `or=(id.eq.${targetId},username.eq.${targetUsername})`;
      } else if (targetId) {
        queryParam = `id=eq.${targetId}`;
      } else if (targetUsername) {
        queryParam = `username=eq.${targetUsername}`;
      }
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rbac_users?${queryParam}`, {
        method: 'DELETE',
        headers: supaHeaders,
      });
      return res.status(r.status).json({ success: r.ok });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'create_session') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const sesRes = await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config?id=eq.active_sessions&select=config`, { headers: supaHeaders });
      const sesData = await sesRes.json();
      const current = sesData?.[0]?.config || {};
      current[body.token] = body;

      await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config`, {
        method: 'POST',
        headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id: 'active_sessions',
          config: current,
          updated_at: new Date().toISOString(),
        }),
      });
      return res.status(200).json({ success: true, session: body });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'revoke_session') {
    try {
      const targetToken = token || (typeof req.body === 'object' ? req.body?.token : null);
      if (targetToken) {
        const sesRes = await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config?id=eq.active_sessions&select=config`, { headers: supaHeaders });
        const sesData = await sesRes.json();
        const current = sesData?.[0]?.config || {};
        delete current[targetToken];

        await fetch(`${SUPABASE_URL}/rest/v1/rbac_matrix_config`, {
          method: 'POST',
          headers: { ...supaHeaders, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({
            id: 'active_sessions',
            config: current,
            updated_at: new Date().toISOString(),
          }),
        });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'login') {
    try {
      const loginBase = process.env.VITE_LOGIN_API_URL || (process.env.VITE_API_URL ? new URL('/api/accountant/login', process.env.VITE_API_URL).toString() : '');
      if (!loginBase) {
        return res.status(400).json({ success: false, error: 'Login API endpoint is not configured in Vercel environment variables.' });
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const r = await fetch(loginBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  let targetUrl = '';
  if (type === 'overall') {
    if (process.env.VITE_OVERALL_API_URL) {
      const u = new URL(process.env.VITE_OVERALL_API_URL);
      if (from) u.searchParams.set('from', from);
      if (to) u.searchParams.set('to', to);
      if (id) u.searchParams.set('id', id);
      targetUrl = u.toString();
    }
  } else if (type === 'draw') {
    if (process.env.VITE_DRAW_API_URL) {
      const u = new URL(process.env.VITE_DRAW_API_URL);
      if (drawId) u.searchParams.set('drawId', drawId);
      if (from) u.searchParams.set('from', from);
      if (to) u.searchParams.set('to', to);
      if (id) u.searchParams.set('id', id);
      targetUrl = u.toString();
    }
  } else if (type === 'supervisor') {
    if (process.env.VITE_SUPERVISOR_API_URL) {
      const u = new URL(process.env.VITE_SUPERVISOR_API_URL);
      if (from) u.searchParams.set('from', from);
      if (to) u.searchParams.set('to', to);
      if (drawId) u.searchParams.set('drawId', drawId);
      if (id) u.searchParams.set('id', id);
      targetUrl = u.toString();
    }
  } else if (type === 'teller') {
    if (process.env.VITE_API_URL) {
      const u = new URL(process.env.VITE_API_URL);
      if (from) u.searchParams.set('from', from);
      if (to) u.searchParams.set('to', to);
      if (id) u.searchParams.set('id', id);
      targetUrl = u.toString();
    }
  }

  if (targetUrl) {
    try {
      const apiRes = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${authBearer}`,
          Accept: 'application/json',
        },
      });
      const data = await apiRes.json();
      return res.status(apiRes.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Serverless proxy request failed' });
    }
  }

  return res.status(400).json({ error: 'Invalid or missing proxy request type/action' });
}
