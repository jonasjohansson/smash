import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted uppercase">404</p>
      <h1 className="max-w-[16ch] text-[clamp(1.8rem,6vw,3.5rem)] leading-[1] font-medium tracking-[-0.03em] text-ink">
        Nothing here.
      </h1>
      <Link
        href="/"
        className="border-b border-ink pb-0.5 font-mono text-[11px] tracking-[0.16em] text-ink uppercase"
      >
        Back to the studio
      </Link>
    </div>
  );
}
