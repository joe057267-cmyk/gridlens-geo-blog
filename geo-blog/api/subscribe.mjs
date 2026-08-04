// GridLens GEO blog — newsletter subscribe endpoint (Vercel serverless, Node).
// Keeps the Resend API key server-side (env RESEND_API_KEY). The blog's
// restricted send-only key can email a welcome message; if a full-access key
// + RESEND_AUDIENCE_ID is provided it also adds the contact to a Resend
// Audience (persistent subscriber list).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }
  if (req.method !== 'POST') {
    res.statusCode = 405; res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' })); return
  }
  let email
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    email = String(body.email || '').trim().toLowerCase()
  } catch {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Invalid request body' })); return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.statusCode = 400; res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Please enter a valid email address' })); return
  }
  const key = process.env.RESEND_API_KEY
  if (!key) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Newsletter is not configured (missing RESEND_API_KEY)' })); return
  }
  const audience = process.env.RESEND_AUDIENCE_ID
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'
  const subject = process.env.RESEND_WELCOME_SUBJECT || 'Welcome to GridLens GEO updates'
  const html = process.env.RESEND_WELCOME_HTML ||
    '<p>Thanks for subscribing to GridLens GEO updates.</p>'
  try {
    // Optional: persist to a Resend Audience if a full-access key + audience id exist.
    if (audience) {
      try {
        await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, unsubscribed: false }),
        })
      } catch (_) { /* non-fatal: audience may be read-only */ }
    }
    // Send the welcome email (works with a send-only restricted key).
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject, html }),
    })
    const txt = await r.text()
    if (!r.ok) {
      res.statusCode = 502; res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Email delivery failed', detail: txt.slice(0, 300) })); return
    }
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, message: 'Subscribed — check your inbox for a confirmation email.' }))
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: String(e && e.message || e) }))
  }
}
