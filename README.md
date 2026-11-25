# REELIO website

The website for REELIO, a cinematic social media agency from Hyderabad.

- Live: https://www.reelio.agency
- Hosting: Vercel. Every commit to `main` deploys automatically.

## What's here

- `index.html` holds the content and styles. `enter.js` runs the enter screen and music, `app.js` runs everything else (3D hero, animations, form). Three.js, GSAP and Lenis load from jsDelivr with integrity hashes.
- `vercel.json` sets the security headers (Content-Security-Policy and others). See `SECURITY.md` before adding any new outside script, font or embed, and never put code in inline `<script>` tags or `onclick` attributes: the browser will block them.
- `r01.jpg` to `r16.jpg` are the reel stills used in the 3D hero and the cards.
- The other `.jpg`/`.png` files are photos used across the sections (`logo-card.jpg` is the About card, `edit-desk.jpg` is the video editing preview).
- `favicon.svg`, `apple-touch-icon.png` and `og.jpg` are the icons and the link-preview image.
- `paper-planes.mp3` is the background music. It plays at 40% volume and loops. Browsers only allow sound after a tap, so the 3-2-1 countdown ends on an Enter button and that tap starts the song (if the browser already allows sound, it just starts). The speaker button next to Get started mutes and unmutes it. To change the track, upload a new MP3 with the same name.

## Editing

To swap a photo, upload a new file with the same name (Add file → Upload files) and commit. To change text, open `index.html`, click the pencil icon, edit and commit. Vercel redeploys in about 20 seconds.
