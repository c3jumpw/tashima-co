# tashima-co

Four static sites, one folder per domain, each deployed by its own Vercel project. Pushing to `main` redeploys all three. No build step and no third-party font requests; fonts are self-hosted in `assets/fonts/`.

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

- Freeman Heating & Air: the header and footer use a placeholder mark and text wordmark. Add the official logo at `freeman-hvac/assets/logo.png` and swap it in where the HTML comment in the header says.

**2. Email addresses** (placeholders on the new domains; search and replace in each `index.html`)
- `hello@tashimafreeman.com`
- `info@kskaccounting.com`
- `hello@enterelitecircle.com`
- `service@freemanhvacus.com`

**3. Contact forms**
Each form has `data-endpoint=""`. Left empty, submitting opens the visitor's email app with the message pre-filled. To receive submissions directly, create a free form at a service like Formspree and paste its URL into `data-endpoint`, e.g. `data-endpoint="https://formspree.io/f/abcd1234"`.

**4. Facts to confirm with Tashima**
- Phone numbers: KSK (404) 781-7638 from a 2020 interview; Elite Circle (404) 500-9775 from a 2023 proposal.
- Social handles: Instagram, Facebook and LinkedIn are linked as `tashimafreeman`. A YouTube channel ("It's Tashima") was mentioned in 2022 but has no confirmed URL, so it isn't linked.
- Dates: accounting career since 2013; KSK founded 2020; coaching since 2021; Elite Circle Enterprises LLC formed 2022. (The brief said "nearly a decade" running the firm; sources put the firm's start in 2020.)
- Credentials: BA in Accounting and MBA in Management are listed. No license or designation (CPA, EA) is claimed; add one only if she holds it.
- Elite Circle's "Brands we've built" describes past clients by industry only, without names.
