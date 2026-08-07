import type { Metadata } from 'next';
import { Container, Eyebrow, Section, SectionHead, WireNote } from '@/components/wireframe/primitives';
import { getSiteSettings } from '@/sanity/fetch';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Talk to SMASH about a space, a brief, or an idea that is not finished yet.',
};

/**
 * Contact as a destination, not a form at the bottom of a page.
 *
 * WIREFRAME: the form is layout only — no action, no state, no submission. Field
 * names are set so wiring it later (to a route handler, or to a form service) is
 * a small, contained job.
 */
const FIELDS = [
  { name: 'name', label: 'Your name', type: 'text', autoComplete: 'name' },
  { name: 'organisation', label: 'Organisation', type: 'text', autoComplete: 'organization' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'location', label: 'Where is the space?', type: 'text', autoComplete: 'off' },
] as const;

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <Container>
          <Eyebrow>Contact</Eyebrow>
          <h1 className="mt-6 max-w-[14ch] text-[clamp(2.6rem,9vw,7rem)] leading-[0.92] font-medium tracking-[-0.035em] text-ink">
            {settings.ctaText}
          </h1>
          <p className="mt-8 max-w-[52ch] text-[15px] leading-[1.7] text-ink-soft sm:text-base">
            A room, a facade, a festival, a brief that is still half an idea — all of it is worth a
            conversation. Tell us where it is and what you want people to feel when they get there.
          </p>
        </Container>
      </Section>

      {/* --- details ---------------------------------------------------- */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="01" label="Details" />
          <div className="grid gap-10 sm:grid-cols-3">
            <div>
              <Eyebrow>Email</Eyebrow>
              <a
                href={`mailto:${settings.contactEmail}`}
                className="mt-3 block text-[clamp(1.1rem,2.4vw,1.6rem)] tracking-[-0.01em] text-ink underline underline-offset-[6px]"
              >
                {settings.contactEmail}
              </a>
            </div>
            <div>
              <Eyebrow>Phone</Eyebrow>
              <p className="mt-3 text-[clamp(1.1rem,2.4vw,1.6rem)] tracking-[-0.01em] text-ink">
                {settings.contactPhone}
              </p>
            </div>
            <div>
              <Eyebrow>Studio</Eyebrow>
              <address className="mt-3 space-y-1 text-[15px] leading-[1.6] text-ink-soft not-italic">
                {settings.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
          </div>
          <WireNote>
            Wireframe: email, phone and address are placeholders held in Sanity → Site settings.
          </WireNote>
        </Container>
      </Section>

      {/* --- form ------------------------------------------------------- */}
      <Section className="border-t border-line">
        <Container>
          <SectionHead index="02" label="Or write to us here" />
          <form className="grid max-w-[760px] gap-8">
            <div className="grid gap-8 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.name}>
                  <label
                    htmlFor={f.name}
                    className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase"
                  >
                    {f.label}
                  </label>
                  <input
                    id={f.name}
                    name={f.name}
                    type={f.type}
                    autoComplete={f.autoComplete}
                    className="mt-2 w-full border-b border-line bg-transparent py-2 text-[15px] text-ink outline-none focus:border-ink"
                  />
                </div>
              ))}
            </div>

            <div>
              <label
                htmlFor="message"
                className="font-mono text-[10px] tracking-[0.2em] text-muted uppercase"
              >
                What are you making?
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                className="mt-2 w-full resize-y border-b border-line bg-transparent py-2 text-[15px] text-ink outline-none focus:border-ink"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="w-full border border-ink px-6 py-3 font-mono text-[11px] tracking-[0.16em] text-ink uppercase sm:w-auto"
              >
                Send
              </button>
              <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
                Wireframe · not wired up
              </p>
            </div>
          </form>
          <WireNote>
            Wireframe: this form does not submit. The button is a `type=&quot;button&quot;` on purpose
            so nothing appears to work that does not. Wiring it is a later, separate decision
            (route handler, email service, or CRM).
          </WireNote>
        </Container>
      </Section>
    </>
  );
}
