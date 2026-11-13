// The words of the root error pages, which render outside every provider and
// cannot know the locale (the cookie is httpOnly): English first, German with
// its own `lang`, like the legal pages (ADR 0024). The literal-string lint
// leaves this file out by name.

interface BilingualErrorTextProps {
  part: "title" | "description" | "retry" | "home" | "reference";
  /** The digest, for the reference line. */
  digest?: string;
  /** The description of the root layout's own failure. */
  whole?: boolean;
}

export function BilingualErrorText({
  part,
  digest,
  whole = false,
}: BilingualErrorTextProps) {
  switch (part) {
    case "title":
      return (
        <>
          Something went wrong{" "}
          <span lang="de" className="block text-lg font-normal">
            Etwas ist schiefgelaufen
          </span>
        </>
      );
    case "description":
      return whole ? (
        <>
          DevStash could not be loaded. Please try again.{" "}
          <span lang="de">
            DevStash konnte nicht geladen werden. Bitte versuch es noch einmal.
          </span>
        </>
      ) : (
        <>
          This page could not be loaded. Please try again.{" "}
          <span lang="de">
            Diese Seite konnte nicht geladen werden. Bitte versuch es noch
            einmal.
          </span>
        </>
      );
    case "retry":
      return (
        <>
          Try again <span lang="de">· Erneut versuchen</span>
        </>
      );
    case "home":
      return (
        <>
          Go to the homepage <span lang="de">· Zur Startseite</span>
        </>
      );
    case "reference":
      return (
        <>
          Reference: <span className="font-mono">{digest}</span>. Quote it if
          the problem continues.{" "}
          <span lang="de">
            Referenz: <span className="font-mono">{digest}</span>. Gib sie an,
            falls das Problem bleibt.
          </span>
        </>
      );
  }
}
