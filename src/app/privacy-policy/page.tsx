import { Metadata } from "next";
import Link from "next/link";
import { Globe2, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Radio Globe",
  description:
    "Radio Globe privacy policy. We don't track you, don't store personal data, and use only first-party cookies.",
};

export default function PrivacyPolicy() {
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
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
        </div>

        <p className="text-white/60 text-sm mb-10">
          Last updated: {new Date().getFullYear()}
        </p>

        <article className="prose prose-invert prose-emerald max-w-none space-y-6 text-white/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Overview
            </h2>
            <p>
              Radio Globe (&quot;we&quot;, &quot;us&quot;, &quot;the service&quot;)
              is a free, open-source web application that lets users explore a 3D
              globe of thousands of live radio stations from around the world.
              We are committed to protecting your privacy. This policy explains
              what data we collect, how we use it, and what choices you have.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Data We Do Not Collect
            </h2>
            <p>We do <strong>not</strong> collect or store:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your name, email, or any personally identifiable information</li>
              <li>Your precise geographic location</li>
              <li>Your listening history (this is stored only in your browser&apos;s local storage)</li>
              <li>Your IP address (we don&apos;t log it server-side)</li>
              <li>Tracking identifiers or device fingerprints</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Local Storage Data
            </h2>
            <p>
              Radio Globe uses your browser&apos;s local storage to remember:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                Your favorite stations (so you can return to them without
                re-adding them)
              </li>
              <li>Your listening history (last 30 stations played)</li>
              <li>Your volume preference</li>
            </ul>
            <p>
              This data never leaves your device. You can clear it at any time
              by clearing your browser&apos;s site data or by clicking
              &quot;Reset&quot; in the settings menu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Third-Party Services
            </h2>
            <p>
              Radio Globe relies on the following third-party services to
              function:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <strong>Radio Browser API</strong> (api.radio-browser.info) —
                the open-source database that provides the list of radio
                stations, their locations, and stream URLs. We fetch this data
                once during our build process; we do not send any user data to
                this API.
              </li>
              <li>
                <strong>OpenStreetMap</strong> (tile.openstreetmap.org) —
                provides the raster map tiles used for the earth&apos;s
                surface. Your browser fetches these tiles directly from
                OpenStreetMap&apos;s servers, which may log your IP address
                according to{" "}
                <a
                  href="https://wiki.osmfoundation.org/wiki/Privacy_Policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  OSM&apos;s privacy policy
                </a>
                .
              </li>
              <li>
                <strong>Radio stream providers</strong> — when you click a
                station, your browser connects directly to that station&apos;s
                streaming server. We have no control over what those servers
                log.
              </li>
              <li>
                <strong>Google AdSense</strong> (if ads are shown) — see
                section 6 below for details.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. Cookies
            </h2>
            <p>
              Radio Globe does not use any first-party cookies for tracking.
              We use only browser <code>localStorage</code> for user preferences.
              If you visit us through a search engine or ad, those providers
              may set cookies according to their own policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Google AdSense (Advertising)
            </h2>
            <p>
              This website uses Google AdSense, a service provided by Google
              LLC, to display ads. AdSense uses cookies (a DoubleClick DART
              cookie) to serve ads based on your prior visits to this and other
              websites.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                Google&apos;s use of advertising cookies enables it and its
                partners to serve ads to users based on their visit to our
                site and/or other sites on the Internet.
              </li>
              <li>
                Users may opt out of personalized advertising by visiting{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  Google Ads Settings
                </a>
                .
              </li>
              <li>
                For more information about how Google uses data, see{" "}
                <a
                  href="https://policies.google.com/technologies/partner-sites"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  Google&apos;s privacy &amp; terms
                </a>
                .
              </li>
            </ul>
            <p>
              Third-party vendors, including Google, use cookies to serve ads
              based on a user&apos;s previous visits to our website or other
              websites. Google&apos;s use of advertising cookies enables it and
              its partners to serve ads to our users based on their visit to
              our site and other sites on the Internet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. GDPR / CCPA Rights
            </h2>
            <p>
              If you are a resident of the European Economic Area (EEA) or
              California, you have certain rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Access</strong> — request a copy of the data we hold
                about you (we hold none)
              </li>
              <li>
                <strong>Erasure</strong> — request deletion of your data (clear
                your browser&apos;s local storage)
              </li>
              <li>
                <strong>Opt-out</strong> — opt out of personalized ads via
                Google&apos;s settings
              </li>
              <li>
                <strong>Do Not Track</strong> — we honor Do Not Track signals by
                not tracking you
              </li>
            </ul>
            <p>
              Since we do not collect or store any personal data, you do not
              need to make any requests to exercise these rights. To remove
              your favorites and listening history, simply clear your
              browser&apos;s site data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Children&apos;s Privacy
            </h2>
            <p>
              Radio Globe is suitable for all ages and does not knowingly
              collect any personal information from children under 13. If you
              believe a child has provided us with personal information,
              please contact us and we will delete it immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes
              will be posted on this page with an updated revision date. We
              encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please{" "}
              <Link
                href="/contact"
                className="text-emerald-400 hover:underline"
              >
                contact us
              </Link>
              .
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-white/40">
          <p>
            Radio Globe is an open-source project. View the{" "}
            <Link href="/terms" className="text-emerald-400 hover:underline">
              Terms of Use
            </Link>{" "}
            or{" "}
            <Link href="/about" className="text-emerald-400 hover:underline">
              About page
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
