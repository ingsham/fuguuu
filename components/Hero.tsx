import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return <section className="hero-shell relative overflow-hidden">
    <div className="hero-orb hero-orb-one" />
    <div className="hero-orb hero-orb-two" />
    <div className="hero-thread hero-thread-one" />
    <div className="hero-thread hero-thread-two" />
    <div className="container-x relative grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
      <div className="hero-copy">
        <span className="inline-flex rounded-full border border-terracotta/15 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-terracotta shadow-sm backdrop-blur">Made in Ghana</span>
        <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl">Traditional craft, <span className="font-serif italic text-terracotta">made to be worn.</span></h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-black/65">Discover authentic smocks and handwoven pieces from verified Ghanaian makers. Every stitch carries a story.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link className="btn btn-primary" href="/shop">Shop smocks</Link><Link className="btn btn-outline bg-white/80 backdrop-blur" href="/signup/seller">Become a seller</Link></div>
        <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-black/55"><span>✓ Verified makers</span><span>✓ Ghanaian craft</span><span>✓ Secure checkout</span></div>
      </div>
      <div className="hero-logo-stage">
        <div className="hero-ring hero-ring-a" />
        <div className="hero-ring hero-ring-b" />
        <div className="hero-card">
          <div className="woven-panel" />
          <div className="relative z-10 flex h-full items-center justify-center p-10 sm:p-14">
            <Image src="/fuguaa-logo.png" alt="Fuguaa — Three generations of craft" width={560} height={560} priority className="hero-logo" />
          </div>
          <div className="hero-badge"><span className="hero-dot" /> Three generations of craft</div>
        </div>
      </div>
    </div>
  </section>;
}
