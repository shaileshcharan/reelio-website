# REELIO website: security report

Audit and hardening done on 25 November 2026 for https://www.reelio.agency.

## 1. What the site is (and what that means for security)

- A **static site**: `index.html` (content and styles), `app.js` and `enter.js` (interactions), plus images, video and audio. Libraries (Three.js 0.160.0, GSAP 3.12.5, Lenis 1.1.13) load from the jsDelivr CDN; fonts from Google Fonts.
- Hosted on **Vercel**, deployed automatically from the `main` branch of the public GitHub repo `shaileshcharan/reelio-website`.
- There is **no server code, no database, no login, no API, no file upload and no stored user data**. The contact form never sends data to a server; it builds a WhatsApp message in the visitor's browser and opens `wa.me`.

Because of that, these attack types have nothing to attack on this site: SQL injection, CSRF, session abuse, RCE, SSRF, broken access control, authentication bypass, brute force, credential stuffing, directory traversal, file-upload attacks, API abuse. There are no passwords to hash, no sessions or cookies to secure and no admin dashboard to protect. Nothing was added for them, because adding a login or database just to "secure" it would create the risk it claims to remove.

The real attack surface is: (1) what the browser is allowed to load and run, (2) the third-party scripts, (3) the accounts that can change the site (GitHub, Vercel, domain registrar).

## 2. Initial assessment (before)

External header scan (securityheaders.com) grade: **D**. Only `Strict-Transport-Security` was present (Vercel default).

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | No Content-Security-Policy: any injected or compromised script could run freely | High | Fixed |
| 2 | Third-party scripts (Three.js, GSAP, Lenis) loaded with no integrity check: a compromised CDN file would run on the site | High | Fixed |
| 3 | Canonical URL and link-preview tags (`og:url`, `og:image`) pointed to `reelio.social`, a domain owned by another company ("Reelio Social Consortium"). Search engines were told the page belongs to their domain, and the preview image returned 404 | High (brand / SEO integrity) | Fixed |
| 4 | No clickjacking protection: the site could be framed inside another page | Medium | Fixed |
| 5 | No `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | Medium | Fixed |
| 6 | `main` branch has no protection; anyone with access to the GitHub account can push straight to the live site | Medium | Needs owner action (section 6) |
| 7 | `Access-Control-Allow-Origin: *` on every file (Vercel default) | Low | Narrowed to own domain |
| 8 | Contact form fields had no length limits | Low | Fixed |
| 9 | Library versions: `npm audit` on three@0.160.0, gsap@3.12.5, lenis@1.1.13 | Info | 0 known vulnerabilities |
| 10 | Secrets in code or git history (API keys, tokens, passwords) | Info | None found in any commit |
| 11 | Form output handling (XSS) | Info | Already safe: uses `textContent` and `encodeURIComponent` |

## 3. Changes made

| File | Change |
|------|--------|
| `vercel.json` | Security headers on every response: Content-Security-Policy, HSTS (2 years, includeSubDomains), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera, mic, location, payment etc. off), Cross-Origin-Opener-Policy same-origin, CORS limited to `https://www.reelio.agency`. Added caching for `.mp4`/`.mp3`. |
| `index.html` | The two inline `<script>` blocks moved out to `enter.js` and `app.js` so the CSP can forbid inline scripts. GSAP moved from cdnjs to jsDelivr (same version) so one CDN serves all libraries. Every CDN script now has a SHA-384 `integrity` hash and `crossorigin="anonymous"`. Canonical and `og:` tags now point to `https://www.reelio.agency/`. `maxlength` on the contact form fields. |
| `app.js`, `enter.js` | New files. Same code as before, unchanged. |
| `README.md` | Editing notes updated for the new files. |

The Content-Security-Policy in force:

```
default-src 'self'; script-src 'self' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'none';
object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
manifest-src 'self'; upgrade-insecure-requests
```

`'unsafe-inline'` is kept for **styles only**, because the design uses inline `<style>` blocks and a few `style=""` attributes. Scripts have no unsafe-inline and no unsafe-eval.

Design, animations, content, music, form and SEO are unchanged.

## 4. Tests run

Local tests ran in Chromium with the exact production headers enforced, at desktop (1440 px) and phone (390 px) sizes:

- All libraries loaded through their integrity checks; the 3D hero, GSAP animations, smooth scroll, Juniors' Bake video and On set clips worked; **0 CSP violations, 0 console errors**.
- XSS attempt typed into the form (`<img src=x onerror=alert(1)>`): rendered as plain text, no element created, correctly encoded in the WhatsApp link.
- Tampered CDN file (simulated): **blocked** by the integrity check.
- Script injected into the page at runtime, inline and from an outside domain: **blocked** by the CSP.
- Framing the site: **blocked**.
- Live header scan after deployment (securityheaders.com, 25 Nov 2026): **A+**, no missing headers, no warnings.
- Live site rendered in a cloud browser after deployment: Three.js created the 3D hero canvas (`three.js r160`), and `app.js` ran (form preview and IST clock filled in). The libraries passed their integrity checks and the CSP in production.

## 5. Things deliberately not done

- **Minifying or obfuscating the code.** Everything a browser runs can always be read, and this site contains no secrets or private logic to hide. Obfuscation would only make it harder for you to edit through GitHub, without any real security gain.
- **Blocking scraping.** The content is public marketing material. Vercel already absorbs DDoS traffic at the network level.
- **HSTS `preload`.** It is very hard to undo once submitted. It can be added later once the domain setup is final.

## 6. Remaining risks and owner actions (account level)

The biggest remaining risk is **account takeover**: whoever controls these accounts controls the site.

1. **GitHub**: turn on two-factor authentication (Settings → Password and authentication). Review Settings → Applications for apps you no longer use.
2. **Vercel**: turn on two-factor authentication. Keep "Vercel Authentication" on for preview deployments. Optionally enable Attack Challenge Mode under Firewall if the site is ever flooded.
3. **Domain registrar for reelio.agency**: turn on two-factor authentication and Registrar Lock (transfer lock).
4. **Branch protection on `main`** (GitHub → Settings → Branches) is optional for a one-person repo, but it blocks force-pushes and deletion of the live branch.
5. **Vercel project domains**: remove `reelio.social` from the project if it is still listed there. That domain belongs to someone else.
6. **Third-party CDN**: jsDelivr availability. If jsDelivr goes down, the integrity checks make the scripts fail safely (the site shows its non-animated fallback) rather than running modified code.

## 7. Rating

Based on the tests above, the site is now in good shape for a static brochure site. **No website is unhackable**, and the main remaining exposure is the accounts in section 6.

- Header scan before: **D**.
- Header scan after deployment: **A+** (securityheaders.com).

## 8. Rollback

Any of these restores the pre-hardening version (the hardening itself is commit `cb4545a`):

- **Fastest:** Vercel dashboard → project → Deployments → pick the deployment of commit `01e52d8` → "Instant Rollback".
- **Git:** `git revert <hardening commit>` and push to `main`.
- **Backup branch:** `backup-pre-security` holds the exact pre-hardening code.

If only the headers cause a problem, delete the first block in `vercel.json` (the `"source": "/(.*)"` entry) and commit.

## 9. Maintenance

- **When upgrading Three.js, GSAP or Lenis:** change the version in the URL and update the `integrity` hash. Get the hash from `https://www.jsdelivr.com/package/npm/<name>` (copy SRI), or with `openssl dgst -sha384 -binary file | openssl base64 -A`. A wrong hash makes that library silently not load.
- **When adding any new outside resource** (an embedded video, an analytics script, a font host): add its domain to the matching CSP directive in `vercel.json`, or the browser will block it.
- **Never add inline `<script>` blocks or `onclick="..."` attributes.** Put code in `app.js`.
- **Every few months:** re-run the header scan at securityheaders.com and run `npm audit` against the library versions.
