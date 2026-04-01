# Smash Studio Website

## What this is
The public website for Smash Studio (www.smash.studio). A creative studio in Sweden specializing in 3D, Animation, Projection Mapping, Unreal Engine, and Game Experiences. Three equal partners: Ash (Creative Director), Veronica (Producer), Emile (Creative Technologist).

This is NOT Smash OS (the internal tool). This is the client-facing showcase — portfolio, identity, contact. It should feel like opening the door to a studio that knows exactly what it's doing.

## The brief
The website has one job: make people want to work with Smash Studio. Not through sales copy — through the work itself. Dense, confident, zero fluff. Every pixel earns its space. The portfolio does the talking. The aesthetic says "we build things that matter."

## The aesthetic
Dark, dense, professional. The same energy as the internal tools but tuned for a public audience. Not a tech startup landing page. Not a Squarespace template. A creative studio that builds immersive experiences — the website should feel like one.

### Typography
- **Headlines**: GT Walsheim Condensed Bold (custom font, `.woff2` file needed — licensed, copy from smash-os repo)
- **Body**: DM Mono (Google Fonts, weights 300/400/500) — monospace gives it that technical-creative edge
- **Accents**: Syne (Google Fonts, weights 700/800) — for special moments, not everywhere

### Colors (dark mode primary)
| Role | Hex | Notes |
|------|-----|-------|
| Primary accent | `#00E5FF` | Cyan. The brand color. CTAs, highlights, focus states |
| Page background | `#0A0A0F` | Near black |
| Surface | `#0D0D14` | Cards, sections |
| Card fill | `#13131F` | Deeper card interiors |
| Border | `#1A1A2E` | Subtle structure |
| Text primary | `#E2E8F0` | Headlines, key content |
| Text body | `#A0AEC0` | Body copy |
| Text muted | `#636E7B` | Captions, metadata |

**Project type accent colors** (use on portfolio cards/filters):
- 3D: `#00E5FF` (Cyan)
- Animation: `#FF6B6B` (Red)
- Unreal Engine: `#9B59B6` (Purple)
- Projection Mapping: `#F39C12` (Orange)
- Game Experience: `#2ECC71` (Green)

### Design principles
- **Information density** — pack relevant content, no hero images with 3 words on them
- **No dead UI** — every element earns its space
- **Sharp, not rounded** — 8-10px border radius max. No bubbly SaaS energy
- **Monospace for data** — DM Mono for numbers, dates, project codes, metadata
- **Motion with purpose** — animate to communicate, not to decorate

## Portfolio data
The portfolio is powered by Smash OS's Codex system. There's a **public API endpoint** already built:

```
GET https://smash-os.vercel.app/api/codex
GET https://smash-os.vercel.app/api/codex?status=Published
GET https://smash-os.vercel.app/api/codex?status=Published&section=Project&featured=true
GET https://smash-os.vercel.app/api/codex?tag=3D
```

Returns:
```json
{
  "entries": [
    {
      "id": "rec...",
      "Title": "Project Name",
      "Headline": "One-liner for cards",
      "Body": "Full case study narrative",
      "Section": "Project",
      "Client": "Client Name",
      "Year": 2025,
      "Hero Image": "https://...",
      "Medium Tags": ["3D", "Animation"],
      "Purpose Tags": ["Brand Experience", "Live Event"],
      "Featured": true,
      "Credits": "Team credits",
      "Outcome": "Impact, awards, reach",
      "Tech Stack": "Unreal 5, TouchDesigner",
      "Media": "https://vimeo.com/..."
    }
  ],
  "count": 12
}
```

### Portfolio taxonomy
**Medium Tags** (what we made): 3D, Animation, Projection Mapping, Unreal Engine, Game Experience, Motion Design, Film/Video

**Purpose Tags** (why we made it): Brand Experience, Live Event, Digital Installation, Interactive, Consultation, Festival, Personal

**Sections**: Projects (portfolio case studies), Processes (how we work), Tools (what we use)

## Suggested site structure

### Homepage
- Hero statement — who Smash is, what they do, in 10 words or less
- Featured projects — pull from Codex API (`?featured=true&section=Project`)
- Reel or showreel embed
- The team (brief)
- Contact CTA

### Work / Portfolio
- Filterable grid by Medium and Purpose tags
- Project cards: hero image, title, client, year, medium tags
- Click through to full case study (Body field = the narrative)
- Case study page: hero, narrative, credits, tech stack, outcome, media embeds

### About
- Studio story
- Team bios (Ash, Veronica, Emile)
- What Smash believes in

### Contact
- hello@smash.studio
- Simple form or just the email. No friction

## Stack suggestion
Keep it simple. This is a portfolio site, not a web app:
- **Astro** or **Next.js** (static generation + API routes if needed)
- **Vercel** for hosting (same as Smash OS — familiar deploy flow)
- Pull portfolio data at build time from the Codex API, or fetch client-side
- CSS custom properties for theming (same pattern as Smash OS)

## The team
**Ash** is the founder and creative director. Not a developer. Describe what you did simply. Build it, push it. Don't ask permission for small improvements — just make things better.

**Veronica** is the producer. She'll care about how clients perceive the site and whether the contact flow works.

**Emile** is the creative technologist. He'll care about the technical craft and whether it feels genuinely good.

## What NOT to do
- Don't make it look like every other studio website (full-screen video, white text, "we create experiences")
- Don't use stock photography
- Don't hide the work behind animations
- Don't make it slow
- Don't use a CMS unless you need to — the Codex API is the CMS

## After every change
```
git add -A && git commit -m "what changed" && git push
```
