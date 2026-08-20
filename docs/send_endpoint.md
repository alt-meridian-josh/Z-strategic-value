# Auto-send: wiring `OUTPUT_ENDPOINT`

By default the tool needs no infrastructure. **Send completed analysis** saves the
`.json` and opens a prefilled mail draft; the user attaches the file and sends.
That works offline, and a copy handed to anyone else keeps working.

Setting `OUTPUT_ENDPOINT` in `index.html` switches to real auto-send: the tool
POSTs the analysis to a service you host, and that service mails it out with no
user action.

## Read this before you turn it on

**Never put an API key in `index.html`.** The file ships to everyone you send it
to; a key in it is readable with View Source and can send mail as you until it is
revoked. The key belongs in the endpoint, which you control.

**Hardcode the recipient in the endpoint.** Never mail an address taken from the
request body. If you do, anyone who has the file has an open mail relay: they can
make your service mail anyone, from your domain. With the recipient fixed the
worst case is someone spamming you, which is contained and revocable.

**Understand what you give up.** Once an endpoint is set, every copy of the file
depends on that service being up, and it no longer works offline. The tool falls
back to a mail draft if the POST fails, so a dead endpoint never loses an
analysis — but it stops being silent.

## Payload

```jsonc
POST <OUTPUT_ENDPOINT>
Content-Type: application/json

{
  "summary": {                 // headline figures, for the mail body
    "customer": "Acme Distribution",
    "seller": "Joshua Willis",
    "date": "2026-08-20",
    "nrv": 3670436, "paybackMo": 2.4, "mirr": 1.265, "capex": 112511,
    "leverCount": 4, "levers": ["Equipment Rental Reduction", "..."]
  },
  "engagement": { /* full lossless envelope — the same JSON Save produces */ }
}
```

Note there is no recipient field. That is deliberate — see above.

## Cloudflare Worker (Resend)

Set `RESEND_KEY` as an encrypted secret (`wrangler secret put RESEND_KEY`), never
in the script body.

```js
const TO = 'joshua.willis@zebra.com';        // fixed recipient — do NOT read from the request
const ALLOW = 'https://your-host.example';   // or '*' if the file is opened from disk

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    if (req.method !== 'POST') return cors(new Response('POST only', { status: 405 }));

    let body;
    try { body = await req.json(); } catch { return cors(new Response('bad json', { status: 400 })); }
    const s = body?.summary;
    if (!s?.customer) return cors(new Response('bad payload', { status: 400 }));

    const text = [
      `Customer: ${s.customer}`, `Prepared by: ${s.seller}`, `Date: ${s.date}`, '',
      `NRV: ${s.nrv}`, `Payback (months): ${s.paybackMo}`, `Capex: ${s.capex}`, '',
      `Levers (${s.leverCount}):`, ...(s.levers || []).map(n => `  - ${n}`),
    ].join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'value-tool@your-domain.example',
        to: TO,                                    // fixed, never from the request
        subject: `Value analysis — ${s.customer} — ${s.date}`,
        text,
        attachments: [{
          filename: `${s.customer.replace(/[^\w.-]+/g, '_')}.json`,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(body.engagement, null, 2)))),
        }],
      }),
    });
    return cors(new Response(res.ok ? 'sent' : 'send failed', { status: res.ok ? 200 : 502 }));
  },
};

function cors(r) {
  r.headers.set('Access-Control-Allow-Origin', ALLOW);
  r.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  r.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return r;
}
```

Then in `index.html`:

```js
let OUTPUT_ENDPOINT = 'https://value-tool.<you>.workers.dev';
```

## Power Automate

Likely the most IT-sanctioned route inside a corporate tenant, and it needs no
key management: create a flow triggered by **When an HTTP request is received**,
paste the payload above as the sample schema to generate it, then add **Send an
email (V2)** with the To field typed literally as your address — not bound to
anything from the request. Copy the generated URL into `OUTPUT_ENDPOINT`.

The generated URL contains its own signature, so treat it as semi-secret: anyone
with the file can call it. Because the recipient is fixed in the flow, the blast
radius is spam to you, and regenerating the URL revokes it.

## CORS and `file://`

If the tool is opened from disk rather than a web host, the browser sends
`Origin: null`. Either set `ALLOW` to `'*'` (fine when the recipient is fixed and
the endpoint holds no secrets beyond its own URL) or host the HTML and lock the
origin down. Without this the POST is blocked and the tool falls back to a draft.

## Verifying

`test/phase23_verify.js` covers both paths — draft when `OUTPUT_ENDPOINT` is
empty, POST when it is set, no recipient in the payload, and fallback to a draft
when the endpoint is down. Run `npm test` after changing any of this.
