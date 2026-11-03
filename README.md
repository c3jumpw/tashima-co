# tashima-co

Four static sites, one folder per domain, each deployed by its own Vercel project. Pushing to `main` redeploys all four. Each folder also has an `api/inquiry.js` serverless function for its forms. No build step and no third-party font requests; fonts are self-hosted in `assets/fonts/`.

| Folder | Domain | Vercel project (Root Directory = folder) |
| --- | --- | --- |
| `tashima-freeman/` | tashimafreeman.com | tashima-co-tashima-freeman |
| `ksk-accounting/` | kskaccounting.com | tashima-co-ksk-accounting |
| `elite-circle/` | enterelitecircle.com | tashima-co-elite-circle |
| `freeman-hvac/` | freemanhvacus.com | tashima-co-freeman-hvac |

## Before going live

**1. Photos of Tashima (optional, recommended)**
- Personal site: add `tashima-freeman/assets/portrait.jpg` (portrait crop, about 4:5). The TF monogram shows until it exists.
- KSK site: add `ksk-accounting/assets/founder.jpg` (square). The KSK monogram shows until it exists.

**2. Form email (Resend)**
Every form posts to `api/inquiry.js` in its folder, which emails the submission through Resend and sends the visitor a short confirmation. In each Vercel project, add these environment variables (Production and Preview), then redeploy:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | The Resend API key for that site's domain (required) |
| `INQUIRY_TO` | Inbox that receives inquiries. Optional for the first three; **required for freeman-hvac** |
| `INQUIRY_FROM` | Optional sender override, e.g. `KSK Tax & Accounting <forms@kskaccounting.com>` |
| `INQUIRY_CONFIRM` | Optional; set to `false` to stop visitor confirmation emails |

Default inboxes: contact@tashimafreeman.com, info@kskaccounting.com, contact@enterelitecircle.com. Default senders are `forms@<domain>`, so each domain must be verified in Resend. Replies go straight to the visitor (reply-to is set).

**3. Multi-step inquiry forms**
KSK, Elite Circle and Freeman HVAC use `assets/inquiry.js` + `assets/inquiry.css`. The questions live in the `<script type="application/json" id="inquiry-config">` block inside each `index.html`; edit the JSON to change questions or options. Answers appear as a table in the notification email, and key answers go in the subject line (e.g. `[Urgent]` for HVAC no-heat/no-cooling requests).

**4. Facts to confirm with Tashima**
- Phone numbers: Elite Circle (404) 500-9775 is from a 2023 proposal. KSK intentionally shows no phone number.
- Social handles: Instagram, Facebook and LinkedIn are linked as `tashimafreeman`. A YouTube channel ("It's Tashima") was mentioned in 2022 but has no confirmed URL, so it isn't linked.
- Dates: accounting career since 2013; KSK founded 2020; coaching since 2021; Elite Circle Enterprises LLC formed 2022. (The brief said "nearly a decade" running the firm; sources put the firm's start in 2020.)
- Credentials: BA in Accounting and MBA in Management are listed. No license or designation (CPA, EA) is claimed; add one only if she holds it.
- Elite Circle's "Brands we've built" describes past clients by industry only, without names.
