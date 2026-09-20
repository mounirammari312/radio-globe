import { Metadata } from "next";
import Link from "next/link";
import { Globe2, ArrowLeft, Radio, Map, Heart, Code } from "lucide-react";

export const metadata: Metadata = {
  title: "About — Radio Globe",
  description:
    "Radio Globe is a free, open-source web app to explore the world's live radio stations on a 3D globe.",
};

export default function About() {
  return (
    <main className="min-h-screen bg-[#040810] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Radio Globe
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Globe2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">About Radio Globe</h1>
            <p className="text-white/60 text-sm mt-1">
              Explore the world&apos;s radio — one spin at a time
            </p>
          </div>
        </div>

        <article className="space-y-8 text-white/80 leading-relaxed">
          <section>
            <p className="text-lg">
              <strong className="text-white">Radio Globe</strong> is a free,
              open-source web application that lets you explore thousands of
              live radio stations from around the world on an interactive 3D
              globe. Just spin, click any green dot, and listen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              What we offer
            </h2>
            <ul className="space-y-2 ml-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>
                  <strong className="text-white">8,000+ live stations</strong>{" "}
                  across 240+ countries, organized by city.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>
                  <strong className="text-white">3D interactive globe</strong>{" "}
                  built with MapLibre GL JS — the same library used by Radio
                  Garden.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>
                  <strong className="text-white">HLS streaming</strong> with
                  automatic fallback for streams with CORS restrictions.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>
                  <strong className="text-white">Mobile-friendly</strong> with
                  lock screen controls via the MediaSession API.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>
                  <strong className="text-white">No tracking, no account</strong> —
                  your favorites and history stay in your browser.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Map className="w-5 h-5 text-emerald-400" />
              Data sources
            </h2>
            <p>
              Our radio station database is sourced from the{" "}
              <a
                href="https://www.radio-browser.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Radio Browser API
              </a>{" "}
              — a free, open-source community project that aggregates
              internet radio stations worldwide. The map tiles come from{" "}
              <a
                href="https://www.openstreetmap.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                OpenStreetMap
              </a>{" "}
              contributors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Code className="w-5 h-5 text-emerald-400" />
              Technology
            </h2>
            <p>
              Radio Globe is built with{" "}
              <strong className="text-white">Next.js 16</strong> and{" "}
              <strong className="text-white">TypeScript</strong>, styled with{" "}
              <strong className="text-white">Tailwind CSS</strong> and{" "}
              <strong className="text-white">shadcn/ui</strong>. The 3D globe
              uses{" "}
              <strong className="text-white">MapLibre GL JS</strong> with globe
              projection, and audio streaming is handled by{" "}
              <strong className="text-white">HLS.js</strong>. The state is
              managed by{" "}
              <strong className="text-white">Zustand</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-400" />
              Inspired by Radio Garden
            </h2>
            <p>
              Radio Globe is an educational tribute to{" "}
              <a
                href="https://radio.garden/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Radio Garden
              </a>
              , built to demonstrate modern web development techniques. We use
              the same underlying globe library (MapLibre GL JS) and HLS.js
              for streaming. The original Radio Garden is a registered
              trademark of its owners; we are not affiliated with them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              Reporting a problem
            </h2>
            <p>
              If a station is broken, offensive, or incorrectly labeled,
              please{" "}
              <Link href="/contact" className="text-emerald-400 hover:underline">
                contact us
              </Link>{" "}
              and we&apos;ll do our best to address it. For broader data
              issues, you can also report them directly to the{" "}
              <a
                href="https://www.radio-browser.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Radio Browser community
              </a>
              .
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-white/40 flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/privacy-policy" className="text-emerald-400 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-emerald-400 hover:underline">
            Terms of Use
          </Link>
          <Link href="/contact" className="text-emerald-400 hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </main>
  );
}
