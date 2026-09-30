// The typography round's candidates and how to set each one, shared by the
// round's own page (typography.js) and the type tester on the project pages
// (tester.js): candidates.json ranked as the round shows them, the Google
// Fonts stylesheet for any of them, which library faces are here, and the CSS
// for a candidate from the library or as its Google alternative.

export const ROLES = ['heading', 'body'];

// Best rated first; a round 2 addition just under round 1's top rating, one not rated at the end.
const rank = (c) => (c.r1 ?? (c.round === 2 ? 3.5 : 0));

/** candidates.json with each role ranked: { data, byId }. */
export async function candidates() {
  const data = await fetch(new URL('candidates.json', import.meta.url)).then((r) => r.json());
  for (const role of ROLES) data[role].sort((a, b) => rank(b) - rank(a));
  const byId = Object.fromEntries(ROLES.map((role) => [role, Object.fromEntries(data[role].map((c) => [c.id, c]))]));
  return { data, byId };
}

/** The address of one Google Fonts stylesheet with these candidates' alternatives. */
export const googleHref = (list) => `https://fonts.googleapis.com/css2?${[...new Set(list.map((c) => c.google.css2))].map((s) => `family=${s}`).join('&')}&display=swap`;

/** Which of these candidates' library faces load ({ id: true | false }); fonts/library.css has to be in first. */
export async function libraryHere(list) {
  const ids = [...new Set(list.filter((c) => c.library).map((c) => c.id))];
  const here = {};
  await Promise.all(ids.map(async (id) => {
    try { here[id] = (await document.fonts.load(`20px "L ${id}"`)).length > 0; } catch { here[id] = false; }
  }));
  return here;
}

/**
 * The face for candidate c from `from` ('library' or 'google'), as `role`:
 * its CSS (family, weight, any axis; quoted with single quotes, so it can go
 * in a style attribute) and the same in parts, its name, where it came from,
 * and whether it stands in for a library font that is not here (`here`, from
 * libraryHere).
 */
export function face(c, from, role, here = {}) {
  const weight = role === 'heading' ? (c.weight ?? 400) : 400;
  const set = (family, name, src, extra = '') => ({ family, weight, extra, name, from: src, css: `font-family:${family};font-weight:${weight};${extra}` });
  const google = () => set(`'${c.google.family}',sans-serif`, c.google.family, 'google', c.google.css ? `${c.google.css.replace(/;\s*$/, '')};` : '');
  if (from === 'google' || c.googleOnly) return google();
  if (c.local) return set(`'${c.local}',sans-serif`, c.name, 'library');
  if (here[c.id]) return set(`'L ${c.id}',sans-serif`, c.name, 'library');
  return { ...google(), standIn: true };
}
