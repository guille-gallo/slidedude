import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — slidedude",
  description: "Terms of Service for slidedude.io",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/login"
        className="mb-8 inline-block text-sm text-zinc-500 hover:text-zinc-300"
      >
        &larr; Back to login
      </Link>

      <h1 className="mb-2 font-mono text-3xl font-semibold text-white">
        Terms of Service
      </h1>
      <p className="mb-10 text-sm text-zinc-500">
        Last updated: June 4, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-zinc-400">
        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using slidedude.io (&quot;the Service&quot;), you agree to be
            bound by these Terms of Service. If you do not agree to these terms,
            do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            2. Description of Service
          </h2>
          <p>
            slidedude is a tool for creating and presenting animated code
            presentations. The Service is provided free of charge for personal
            and commercial use.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            3. User Accounts
          </h2>
          <p className="mb-2">
            You may sign in using a third-party authentication provider (Google,
            GitHub) or via a magic link sent to your email address. You are
            responsible for maintaining the security of your account and
            authentication credentials.
          </p>
          <p>
            You must not use the Service for any illegal purpose or in violation
            of any applicable laws or regulations.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            4. User Content
          </h2>
          <p className="mb-2">
            You retain all ownership of the content you create using the
            Service, including code presentations and slides.
          </p>
          <p>
            By using the Service, you grant us a limited license to store and
            display your content solely for the purpose of providing the Service
            to you. We do not claim ownership of your content.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            5. Acceptable Use
          </h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Use the Service to distribute malware or malicious code</li>
            <li>Attempt to gain unauthorized access to other users&apos; accounts</li>
            <li>Use the Service to send spam or unsolicited messages</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Scrape or collect data from the Service without permission</li>
            <li>Use the Service in any way that violates our Privacy Policy</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            6. Disclaimer of Warranties
          </h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind,
            either express or implied. We do not guarantee that the Service will
            be uninterrupted, error-free, or secure. We do not guarantee the
            accuracy or completeness of any information provided through the
            Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            7. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, slidedude and its operators
            shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to
            loss of data, profits, or business opportunities, arising out of or
            in connection with your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            8. Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate your access to the
            Service at any time, with or without cause, and with or without
            notice. You may stop using the Service at any time.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            9. Changes to Terms
          </h2>
          <p>
            We may update these Terms of Service from time to time. We will
            notify you of any material changes by posting the new terms on this
            page. Your continued use of the Service after such changes
            constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            10. Contact
          </h2>
          <p>
            If you have any questions about these Terms of Service, please
            contact us at{" "}
            <a
              href="mailto:hello@slidedude.io"
              className="text-emerald-400 hover:text-emerald-300"
            >
              hello@slidedude.io
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}