# Custom domain setup — betterpelicans.com

The site currently lives at:
<https://betterpelicans.github.io/>

To serve it at `betterpelicans.com` (registered at Cloudflare), the owner
must add DNS records and enable the custom domain on the repository. These
are the exact records GitHub Pages requires; do not invent alternatives.

## 1. DNS records (add in Cloudflare DNS)

| Type | Name | Value |
|------|------|-------|
| A    | `@` (apex) | `185.199.108.153` |
| A    | `@` (apex) | `185.199.109.153` |
| A    | `@` (apex) | `185.199.110.153` |
| A    | `@` (apex) | `185.199.111.153` |
| CNAME | `www`    | `betterpelicans.github.io` |

Notes:

- The four A records are GitHub Pages' published apex IPs
  (docs.github.com). Use all four.
- Alternatively, Cloudflare CNAME flattening works for the apex, but the
  four A records are the documented, no-guess option.
- The `www` CNAME is optional but recommended; GitHub Pages will handle TLS
  for both once the domain is added.

## 2. Enable the custom domain

Once DNS is in place (and only then):

```bash
gh repo edit BetterPelicans/BetterPelicans.github.io --homepage https://betterpelicans.com
gh api -X PUT repos/BetterPelicans/BetterPelicans.github.io/pages \
  -f cname='betterpelicans.com'
```

GitHub verifies the DNS record and provisions a certificate automatically
(this can take a few minutes).

## 3. Verify

- `curl -sI https://betterpelicans.com | head -5` should return HTTP 200.
- The Pages settings page for the repository will show
  `betterpelicans.com` as the custom domain with HTTPS enforced.

## Ownership note

The repository owner controls the Cloudflare account; the agent cannot
change DNS. If the owner prefers the agent to complete step 2, tell it once
DNS is live.
