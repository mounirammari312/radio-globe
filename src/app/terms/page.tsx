import { Metadata } from "next";
import Link from "next/link";
import { Globe2, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Use — Radio Globe",
  description:
    "Terms of use for Radio Globe. By using this service, you agree to these terms.",
};

export default function Terms() {
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
          <h1 className="text-3xl sm:text-4xl font-bold">Terms of Use</h1>
        </div>

        <p className="text-white/60 text-sm mb-10">
          Last updated: {new Date().getFullYear()}
        </p>

        <article className="space-y-6 text-white/80 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Radio Globe (the &quot;Service&quot;), you
              agree to be bound by these Terms of Use (the &quot;Terms&quot;).
              If you do not agree with any part of these Terms, please do not
              use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. Description of Service
            </h2>
            <p>
              Radio Globe is a free, web-based directory and player for live
              internet radio stations. It aggregates publicly-available station
              data from the open-source{" "}
              <a
                href="https://www.radio-browser.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Radio Browser API
              </a>{" "}
              and lets users browse and listen to stations on a 3D globe
              interface. We do not host any radio streams ourselves — the
              audio is streamed directly from the stations&apos; servers to
              your browser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. Acceptable Use
            </h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                Use the Service for any illegal purpose or in violation of any
                local, state, national, or international law
              </li>
              <li>
                Attempt to disrupt, hack, or reverse-engineer the Service
              </li>
              <li>
                Scrape or automatically extract data from the Service for
                commercial purposes without permission
              </li>
              <li>
                Use the Service to broadcast, transmit, or redistribute any
                copyrighted material without the rights to do so
              </li>
              <li>
                Display or cause to be displayed any radio station&apos;s
                stream on a public website without the station&apos;s
                permission
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. Intellectual Property
            </h2>
            <p>
              The Radio Globe application code is open-source. The radio
              station logos, names, audio streams, and other content belong to
              their respective owners. Radio Globe does not claim any
              ownership over the radio station content. All trademarks are
              the property of their respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. No Warranty
            </h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as
              available&quot; without any warranties of any kind, express or
              implied. We do not guarantee that:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>The Service will be uninterrupted, secure, or error-free</li>
              <li>Any particular radio station will remain available</li>
              <li>The audio stream will be of a specific quality</li>
            </ul>
            <p>
              We are not responsible for the content broadcast by third-party
              radio stations or any opinions, language, or material they may
              transmit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Radio Globe shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, or any loss of profits or revenues, arising
              from your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. Third-Party Content
            </h2>
            <p>
              The Service links to and plays audio streams hosted by
              third-party radio stations. We have no control over the content,
              quality, or availability of these streams. We do not endorse,
              verify, or take responsibility for any third-party content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. Advertising
            </h2>
            <p>
              The Service may display advertisements provided by Google
              AdSense or other advertising networks. We are not responsible
              for the content of these ads or for any products or services they
              advertise. Your interaction with advertisements is governed by
              the advertiser&apos;s terms and the ad network&apos;s policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              9. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. Any
              changes will be posted on this page with an updated revision
              date. Your continued use of the Service after changes are posted
              constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              10. Termination
            </h2>
            <p>
              You may stop using the Service at any time. We may terminate or
              restrict access to the Service at any time, without notice, for
              any reason.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              11. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of your jurisdiction of
              residence. Any disputes shall be resolved in the appropriate
              courts of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              12. Contact
            </h2>
            <p>
              Questions about these Terms?{" "}
              <Link href="/contact" className="text-emerald-400 hover:underline">
                Get in touch
              </Link>
              .
            </p>
          </section>
        </article>

        <div className="mt-12 pt-8 border-t border-white/10 text-sm text-white/40">
          <p>
            See also the{" "}
            <Link href="/privacy-policy" className="text-emerald-400 hover:underline">
              Privacy Policy
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
