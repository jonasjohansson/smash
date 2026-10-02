# SMASH

The website of SMASH, an immersive experience studio in Stockholm:
[smash.jonasjohansson.se](https://smash.jonasjohansson.se).

- `web/`: the site (Eleventy). `npm install`, then `npm run dev` in `web/`. A push to `main`
  builds and deploys it with GitHub Pages (`.github/workflows/pages.yml`).
- `.pages.yml`: the projects, offerings, team and clients, editable in the browser with
  [Pages CMS](https://app.pagescms.org). Each save is a commit to `main`, so it deploys.
- `web/src/identity/`: the identity page, at `/identity/`.
- `identity/`: its marks exported as SVGs for Illustrator.
