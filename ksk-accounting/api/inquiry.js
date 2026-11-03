// Website inquiry handler: emails form submissions through Resend.
// Vercel environment variables:
//   RESEND_API_KEY   required. A Resend API key for a domain verified in Resend.
//   INQUIRY_TO       optional. Comma-separated inboxes that receive inquiries (default below).
//   INQUIRY_FROM     optional. Sender, on the Resend-verified domain (default below).
//   INQUIRY_CONFIRM  optional. Set to "false" to stop sending the visitor a confirmation email.

const SITE = {
  "name": "KSK Tax & Accounting Solutions",
  "domain": "kskaccounting.com",
  "hosts": [
    "kskaccounting.com",
    "www.kskaccounting.com"
  ],
  "to": "info@kskaccounting.com",
  "from": "KSK Tax & Accounting <forms@kskaccounting.com>",
  "accent": "#0041c3",
  "confirm": {
    "subject": "We received your consultation request | KSK Tax & Accounting",
    "body": "Thanks for reaching out to KSK Tax & Accounting Solutions. We received your consultation request and will be in touch to set up a time to talk. If you think of anything else, just reply to this email."
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMIT = { fields: 40, label: 120, value: 2000 };

function clean(s, n) {
  return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
}
function oneLine(s, n) { return clean(s, n).replace(/\s+/g, ' '); }
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function send(key, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Resend responded ${r.status}: ${t.slice(0, 300)}`);
  }
  return r.json();
}

function rowsHtml(rows) {
  return rows.map((f) =>
    `<tr><td style="padding:10px 14px 10px 0;border-bottom:1px solid #e5e5e5;color:#666;font-size:14px;vertical-align:top;width:38%">${esc(f.label)}</td>` +
    `<td style="padding:10px 0;border-bottom:1px solid #e5e5e5;color:#111;font-size:15px;vertical-align:top;white-space:pre-wrap">${esc(f.value)}</td></tr>`
  ).join('');
}
function shell(inner) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">` +
    `<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border-top:6px solid ${SITE.accent}">` +
    `<tr><td style="padding:28px 28px 24px">${inner}</td></tr></table></body></html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const origin = req.headers.origin;
  if (origin) {
    let host = '';
    try { host = new URL(origin).hostname; } catch (e) { /* ignore */ }
    const allowed = SITE.hosts.includes(host) || host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1';
    if (!allowed) return res.status(403).json({ ok: false, error: 'origin_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, error: 'invalid_body' });

  // Spam traps: a filled honeypot or an instant submission gets a quiet success and no email.
  if (body.hp || !(Number(body.elapsed) >= 2500)) return res.status(200).json({ ok: true });

  const contact = body.contact && typeof body.contact === 'object' ? body.contact : {};
  const name = oneLine(contact.name, 120);
  const email = oneLine(contact.email, 200);
  const phone = oneLine(contact.phone, 40);
  if (!name) return res.status(400).json({ ok: false, error: 'name_required' });
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'email_invalid' });
  if (!email && !phone) return res.status(400).json({ ok: false, error: 'contact_required' });

  const fields = (Array.isArray(body.fields) ? body.fields : [])
    .slice(0, LIMIT.fields)
    .map((f) => ({ label: oneLine(f && f.label, LIMIT.label), value: clean(f && f.value, LIMIT.value) }))
    .filter((f) => f.label && f.value);
  const summary = oneLine(body.summary, 140);
  const priority = oneLine(body.priority, 40);

  const key = process.env.RESEND_API_KEY;
  const to = (process.env.INQUIRY_TO || SITE.to || '').split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.INQUIRY_FROM || SITE.from;
  if (!key || !to.length) {
    console.error('Inquiry form is not configured: set RESEND_API_KEY' + (to.length ? '' : ' and INQUIRY_TO'));
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const contactRows = [{ label: 'Name', value: name }];
  if (email) contactRows.push({ label: 'Email', value: email });
  if (phone) contactRows.push({ label: 'Phone', value: phone });

  const subject = `${priority ? `[${priority}] ` : ''}New inquiry: ${summary || 'Website form'} (${name})`.slice(0, 200);
  const html = shell(
    (priority ? `<p style="margin:0 0 10px"><span style="display:inline-block;background:#b42318;color:#fff;font-weight:700;font-size:13px;padding:4px 10px;border-radius:99px">${esc(priority)}</span></p>` : '') +
    `<h1 style="margin:0 0 6px;font-size:22px;color:#111">New inquiry from ${esc(name)}</h1>` +
    `<p style="margin:0 0 18px;color:#666;font-size:14px">${esc(summary || 'Submitted on the website')}</p>` +
    `<table role="presentation" width="100%" style="border-collapse:collapse">${rowsHtml(contactRows.concat(fields))}</table>` +
    `<p style="margin:20px 0 0;color:#666;font-size:13px">Sent from the ${esc(SITE.domain)} inquiry form.${email ? ` Reply to this email to answer ${esc(name.split(' ')[0])} directly.` : ''}</p>`
  );
  const text = [`New inquiry from ${name}`, summary, '', ...contactRows.concat(fields).map((f) => `${f.label}: ${f.value}`), '', `Sent from the ${SITE.domain} inquiry form.`].join('\n');

  try {
    await send(key, { from, to, subject, html, text, reply_to: email || undefined, tags: [{ name: 'source', value: 'website_inquiry' }] });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }

  if (email && process.env.INQUIRY_CONFIRM !== 'false') {
    const first = name.split(' ')[0];
    try {
      await send(key, {
        from,
        to: [email],
        reply_to: to[0],
        subject: SITE.confirm.subject,
        html: shell(
          `<h1 style="margin:0 0 12px;font-size:22px;color:#111">Thanks, ${esc(first)}.</h1>` +
          `<p style="margin:0 0 18px;color:#222;font-size:16px;line-height:1.55">${esc(SITE.confirm.body)}</p>` +
          (fields.length ? `<p style="margin:0 0 6px;color:#666;font-size:14px">Here's what you sent:</p><table role="presentation" width="100%" style="border-collapse:collapse">${rowsHtml(fields)}</table>` : '') +
          `<p style="margin:22px 0 0;color:#222;font-size:15px">${esc(SITE.name)}<br><a href="https://${esc(SITE.domain)}" style="color:#111">${esc(SITE.domain)}</a></p>`
        ),
        text: [`Thanks, ${first}.`, '', SITE.confirm.body, '', ...fields.map((f) => `${f.label}: ${f.value}`), '', SITE.name, `https://${SITE.domain}`].join('\n'),
      });
    } catch (err) {
      console.error('Confirmation email failed', err);
    }
  }

  return res.status(200).json({ ok: true });
};
