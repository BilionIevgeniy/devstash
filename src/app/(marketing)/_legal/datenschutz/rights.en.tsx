import type { LegalSection } from "../types";

export const RIGHTS_EN: LegalSection[] = [
  {
    id: "retention",
    heading: "Retention",
    body: (
      <p>
        We keep your account and content until you delete them or delete your
        account (Settings, &ldquo;Delete account&rdquo;). When you delete the
        account we remove your data from the database, delete your files and
        delete the Stripe customer. Counters for abuse protection expire after
        minutes, and after 24 hours at most. The hosting provider deletes server
        logs after its own period.
      </p>
    ),
  },
  {
    id: "after-deletion",
    heading: "What remains after deletion",
    body: (
      <p>
        We cannot delete everything ourselves: Resend may keep sent emails for
        its own period, Stripe keeps records as far as the law requires it
        (currently test mode), and the authorization of DevStash in your GitHub
        account stays until you revoke it in GitHub settings under
        &ldquo;Applications&rdquo;.
      </p>
    ),
  },
  {
    id: "rights",
    heading: "Your rights",
    body: (
      <>
        <p>
          You have the right of access (Art. 15 GDPR), rectification (Art. 16),
          erasure (Art. 17), restriction of processing (Art. 18) and data
          portability (Art. 20). You can change your password and delete your
          account yourself in the application; to correct your name or email
          address, and for anything else, send us an email.
        </p>
        <p>
          You can object at any time, on grounds relating to your particular
          situation, to processing that we base on legitimate interests (Art. 21
          GDPR).
        </p>
      </>
    ),
  },
  {
    id: "complaint",
    heading: "Right to lodge a complaint",
    body: (
      <p>
        You can lodge a complaint with a data protection supervisory authority
        (Art. 77 GDPR), for example in the member state of your habitual
        residence, your place of work or the place of the alleged infringement.
      </p>
    ),
  },
  {
    id: "required",
    heading: "Required data, automated decisions",
    body: (
      <p>
        For an account we need your email address and a password or a sign-in
        with GitHub; without them we cannot provide the service. No automated
        decision-making, including profiling, under Art. 22 GDPR takes place.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes",
    body: (
      <p>
        As of November 2026. If we change service providers or functions, we
        update this notice.
      </p>
    ),
  },
];
