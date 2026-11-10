import { OperatorContact } from "../../_components/OperatorContact";
import type { LegalSection } from "../types";

export const GENERAL_EN: LegalSection[] = [
  {
    id: "controller",
    heading: "Controller",
    body: (
      <>
        <p>
          The controller responsible for processing personal data on this
          website is:
        </p>
        <OperatorContact lang="en" />
        <p>
          We have not appointed a data protection officer. This notice informs
          you under Art. 13 GDPR which data we process, for what purpose and who
          receives it. This English text is a courtesy translation; the German
          text above is the binding one.
        </p>
      </>
    ),
  },
  {
    id: "about",
    heading: "About this service",
    body: (
      <p>
        DevStash is a demonstration project. Payments through Stripe run in test
        mode: no real payments are processed and no real payment data is
        collected. We still process the data you enter as described on this
        page.
      </p>
    ),
  },
  {
    id: "data",
    heading: "Which data we process and why",
    body: (
      <ul>
        <li>
          <strong>Account and sign-in:</strong> email address, name and password
          (stored only as a bcrypt hash); when you sign in with GitHub, your
          GitHub account id, name, email address and the address of your profile
          picture. Purpose: to create your account and sign you in. Legal basis:
          Art. 6 (1) b GDPR (contract).
        </li>
        <li>
          <strong>Your content:</strong> items (snippets, prompts, notes,
          commands, links), collections, tags, editor settings and uploaded
          files and images. Purpose: the service itself. Legal basis: Art. 6 (1)
          b GDPR.
        </li>
        <li>
          <strong>Emails:</strong> we email you to confirm your address or to
          reset your password. Legal basis: Art. 6 (1) b GDPR.
        </li>
        <li>
          <strong>Billing:</strong> Stripe customer data (email address, user
          id) and the status of your subscription. You enter payment details
          directly at Stripe. Currently test mode. Legal basis: Art. 6 (1) b
          GDPR.
        </li>
        <li>
          <strong>Security and abuse protection:</strong> we limit sign-ins,
          registrations, emails and AI requests. For this we keep counters
          against SHA-256 hashes of your email address, IP address and user id,
          only for the length of the time window (24 hours at most). The hashes
          are pseudonymised, not anonymous. Legal basis: Art. 6 (1) f GDPR
          (legitimate interest in protection against abuse).
        </li>
        <li>
          <strong>Providing the website:</strong> when you visit, our hosting
          provider processes technically necessary data in server logs: IP
          address, time, requested address and browser identification. Legal
          basis: Art. 6 (1) f GDPR (legitimate interest in secure, stable
          operation).
        </li>
      </ul>
    ),
  },
  {
    id: "ai",
    heading: "AI functions",
    body: (
      <>
        <p>
          When you click an AI button (&ldquo;Generate with AI&rdquo;,
          &ldquo;Explain&rdquo;, &ldquo;Optimize&rdquo;), we send the title and
          the content of that item, shortened if needed, to OpenAI. A language
          model produces tags, a summary, an explanation or an improvement from
          it. Nothing is sent without your click. A hash of your user id is sent
          along to detect abuse. We instruct OpenAI not to store the request;
          OpenAI may keep API data for a short time under its own terms to
          detect abuse.
        </p>
        <p>
          Only you see the result, and it is saved only if you accept it. No
          automated decision with legal effect is made. Legal basis: Art. 6 (1)
          b GDPR, because you asked for the function.
        </p>
        <p>
          Do not put passwords, API keys or other secrets into items you send to
          the AI. The results come from an AI model and can be wrong.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies",
    body: (
      <>
        <p>
          We set only cookies that the service technically needs or that you
          trigger yourself with a setting (§ 25 (2) no. 2 TDDDG). That is why we
          do not ask for consent. We do not set analytics, advertising or
          tracking cookies.
        </p>
        <ul>
          <li>
            <code>authjs.session-token</code>: your signed-in session (encrypted
            and signed), 30 days since your last activity.
          </li>
          <li>
            <code>authjs.csrf-token</code> and <code>authjs.callback-url</code>:
            protect the sign-in forms and return you to the page you wanted
            after signing in; until the browser session ends. They are set as
            soon as the website checks whether you are signed in, so on your
            first visit.
          </li>
          <li>
            <code>authjs.pkce.code_verifier</code>: only while signing in with
            GitHub, 15 minutes.
          </li>
          <li>
            <code>sidebar-open</code>: remembers whether the sidebar is open.
            Set only when you open or close it; 1 year.
          </li>
        </ul>
        <p>
          On the website the sign-in cookies also carry the prefix{" "}
          <code>__Secure-</code> or <code>__Host-</code>.
        </p>
      </>
    ),
  },
];
