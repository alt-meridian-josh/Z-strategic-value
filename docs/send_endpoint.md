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

## Power Automate / Logic Apps

Usually the most IT-sanctioned route inside a corporate tenant, and it needs no
API key at all — the flow URL carries its own signature. Two constraints decide
whether it works for you, and both are real.

### It needs a Premium licence

**When an HTTP request is received** is a premium trigger. The flow *owner* needs
Power Automate Premium (or a per-flow plan). Because an HTTP-triggered flow is an
automated flow, the people whose browsers call the URL do **not** need a licence —
they are not Power Automate users, they are just POSTing. So one licence, yours,
covers everyone you hand the file to. Check this before building anything.

### It returns no CORS headers — set `OUTPUT_ENDPOINT_MODE = 'opaque'`

Power Automate does not send `Access-Control-Allow-Origin`. That has two
consequences, and getting either wrong breaks the feature:

- A normal JSON POST triggers a CORS **preflight**, which the flow cannot answer,
  so the browser never sends the real request and **the flow never runs**. This is
  why the tool sends `Content-Type: text/plain` with `mode: 'no-cors'` in this
  mode — that is a CORS "simple request", there is no preflight, and the flow runs.
- The response is **opaque**: `res.ok` is always `false` even on success. Anything
  that checks it would treat every successful send as a failure and open a mail
  draft too, so you would be delivered twice. The `'opaque'` mode does not check.

The trade-off you accept: **delivery cannot be confirmed from the browser.** If a
mail does not arrive, check the flow's run history. If you want confirmed
delivery, put a Worker or Azure Function in front (`'cors'` mode) instead.

### Build it

1. New flow → **When an HTTP request is received**.
2. Paste the payload above into **Use sample payload to generate schema**.
3. Add **Send an email (V2)**. Type your address into **To** literally — do not
   bind it to anything from the request body, or you have built an open relay.
4. Map the body from `summary`; attach `engagement` as a `.json` if you want the
   full file.
5. Save, copy the generated URL, and set both values in `index.html`:

```js
let OUTPUT_ENDPOINT = 'https://prod-00.westus.logic.azure.com/workflows/...';
let OUTPUT_ENDPOINT_MODE = 'opaque';
```

The URL contains its own signature, so treat it as semi-secret: anyone with the
file can call it. Because the recipient is fixed inside the flow, the blast radius
is spam to you, and regenerating the URL revokes every copy at once.

## CORS and `file://`

In `'cors'` mode, a tool opened from disk sends `Origin: null`. Either set the
Worker's `ALLOW` to `'*'` (fine when the recipient is fixed and the endpoint holds
no secret beyond its own URL) or host the HTML and lock the origin down. Without
this the POST is blocked and the tool falls back to a draft.

In `'opaque'` mode this does not apply — there is no preflight to fail.

## Verifying

`test/phase23_verify.js` covers all three paths — draft when `OUTPUT_ENDPOINT` is
empty, a confirmed JSON POST in `'cors'` mode, and a no-cors `text/plain` POST in
`'opaque'` mode that does *not* also open a draft. It also asserts no recipient in
the payload, no API key in `index.html`, and a draft fallback when the endpoint is
unreachable. Run `npm test` after changing any of this.
