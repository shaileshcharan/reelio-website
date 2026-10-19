# REELIO website

The website for REELIO, a cinematic social media agency from Hyderabad.

- Live: https://reelio-agency.vercel.app
- Hosting: Vercel. Every commit to `main` deploys automatically.

## What's here

- `index.html` is the whole site: HTML, CSS and JS in one file. Three.js, GSAP and Lenis load from CDNs.
- `r01.jpg` to `r16.jpg` are the reel stills used in the 3D hero and the cards.
- The other `.jpg`/`.png` files are photos used across the sections (`logo-card.jpg` is the About card, `edit-desk.jpg` is the video editing preview).
- `favicon.svg`, `apple-touch-icon.png` and `og.jpg` are the icons and the link-preview image.
- `paper-planes.mp3` is the background music. It plays at 40% volume, loops, and the sound button next to Free week mutes it. To change the track, upload a new MP3 with the same name.

## Editing

To swap a photo, upload a new file with the same name (Add file → Upload files) and commit. To change text, open `index.html`, click the pencil icon, edit and commit. Vercel redeploys in about 20 seconds.
