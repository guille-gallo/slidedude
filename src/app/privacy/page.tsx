import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — slidedude",
  description: "Privacy Policy for slidedude.io",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/login"
        className="mb-8 inline-block text-sm text-zinc-500 hover:text-zinc-300"
      >
        &larr; Back to login
      </Link>

      <h1 className="mb-2 font-mono text-3xl font-semibold text-white">
        Privacy Policy
      </h1>
      <p className="mb-10 text-sm text-zinc-500">
        Last updated: June 4, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-zinc-400">
        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            1. Introduction
          </h2>
          <p>
            This Privacy Policy explains how slidedude.io (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
            collects, uses, and protects your personal information when you use
            our Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            2. Information We Collect
          </h2>
          <p className="mb-2">When you create an account, we collect:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Email address</li>
            <li>Name (from your Google or GitHub profile)</li>
            <li>Profile picture URL (from your Google or GitHub profile)</li>
          </ul>
          <p className="mt-3">
            We also collect usage data such as presentations you create and
            store within the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            3. How We Use Your Information
          </h2>
          <p className="mb-2">We use your information to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Provide and maintain the Service</li>
            <li>Authenticate your identity</li>
            <li>Send you magic link emails for passwordless login</li>
            <li>Store and retrieve your presentations</li>
            <li>Improve the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            4. Third-Party Services
          </h2>
          <p className="mb-2">
            We use the following third-party services to provide the Service:
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <strong className="text-zinc-300">Google</strong> — for
              authentication (if you sign in with Google)
            </li>
            <li>
              <strong className="text-zinc-300">GitHub</strong> — for
              authentication (if you sign in with GitHub)
            </li>
            <li>
              <strong className="text-zinc-300">Resend</strong> — for sending
              magic link emails
            </li>
            <li>
              <strong className="text-zinc-300">Upstash</strong> — for session
              storage and rate limiting
            </li>
            <li>
              <strong className="text-zinc-300">Vercel</strong> — for hosting
              and deployment
            </li>
          </ul>
          <p className="mt-3">
            Each of these services has its own privacy policy. We only share
            your information with them as necessary to provide the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            5. Cookies and Session Storage
          </h2>
          <p>
            We use session cookies to keep you logged in. These cookies are
            essential for the Service to function and cannot be disabled. We do
            not use tracking cookies or third-party analytics cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            6. Data Security
          </h2>
          <p>
            We take reasonable measures to protect your information from
            unauthorized access, alteration, or destruction. However, no method
            of transmission over the Internet or electronic storage is 100%
            secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            7. Data Retention
          </h2>
          <p>
            We retain your account information and presentations for as long as
            your account is active. If you wish to delete your account or data,
            please contact us at{" "}
            <a
              href="mailto:hello@slidedude.io"
              className="text-emerald-400 hover:text-emerald-300"
            >
              hello@slidedude.io
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            8. Your Rights
          </h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and data</li>
            <li>Object to or restrict processing of your information</li>
            <li>Data portability (receive your data in a usable format)</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact us at{" "}
            <a
              href="mailto:hello@slidedude.io"
              className="text-emerald-400 hover:text-emerald-300"
            >
              hello@slidedude.io
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            9. Children&apos;s Privacy
          </h2>
          <p>
            The Service is not intended for children under the age of 13. We do
            not knowingly collect personal information from children under 13.
            If we become aware that we have collected such information, we will
            take steps to delete it.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            10. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by posting the new policy on this page.
            Your continued use of the Service after such changes constitutes
            acceptance of the new policy.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-medium text-zinc-200">
            11. Contact Us
          </h2>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us at{" "}
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