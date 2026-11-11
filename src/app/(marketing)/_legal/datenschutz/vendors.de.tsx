import { VendorList } from "../../_components/VendorList";
import type { LegalSection } from "../types";
import type { VendorId } from "../vendors";

const TEXTS: Record<VendorId, string> = {
  vercel:
    "Hosting und Auslieferung der Website und der Anwendung. Bei jedem Aufruf entstehen Server-Protokolle mit IP-Adresse und Anfragedaten. Die Anwendung läuft in der Region Washington, D.C. (USA). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.",
  neon: "Datenbank: speichert Ihr Konto und alle Ihre Inhalte mit Ausnahme der Dateien. Standort: AWS-Region us-east-2 (Ohio, USA). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.",
  cloudflare:
    "Cloudflare R2: nicht öffentlicher Speicher für hochgeladene Dateien und Bilder. Die Dateien sind nur über kurzzeitig gültige, signierte Adressen abrufbar. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.",
  openai:
    "Sprachmodell für die KI-Funktionen, nur nach Ihrem Klick (siehe „KI-Funktionen“). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.",
  stripe:
    "Abwicklung des Pro-Abonnements über die gehostete Bezahlseite von Stripe. Wir geben E-Mail-Adresse und Nutzer-ID weiter; Zahlungsdaten geben Sie bei Stripe ein, wir sehen sie nicht. Stripe verarbeitet Daten teils in unserem Auftrag und teils in eigener Verantwortung, zum Beispiel zur Betrugsprävention. Derzeit Testmodus. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.",
  resend:
    "Versand der E-Mails zur Bestätigung Ihrer Adresse und zum Zurücksetzen des Passworts. Resend erhält die Empfängeradresse und den Inhalt der E-Mail. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.",
  upstash:
    "Redis-Datenbank für die Begrenzung von Anfragen. Upstash erhält nur SHA-256-Hashes von E-Mail-Adressen, IP-Adressen und Nutzer-IDs sowie Zähler. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.",
  github:
    "Anmeldung mit GitHub: GitHub verarbeitet die Anmeldung in eigener Verantwortung nach seinen Datenschutzhinweisen; wir erhalten Ihre GitHub-Kennung (ID), Name, E-Mail-Adresse und die Adresse des Profilbilds. Wenn Sie mit GitHub angemeldet sind und ein Profilbild haben, lädt Ihr Browser es direkt von den Servern von GitHub; dabei erfährt GitHub Ihre IP-Adresse. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO für die Anmeldung, lit. f für das Laden des Bildes.",
};

export const VENDORS_DE: LegalSection[] = [
  {
    id: "vendors",
    heading: "Empfänger, Dienstleister und Übermittlung in die USA",
    body: (
      <>
        <p>
          Wir setzen die folgenden Dienstleister ein. Soweit unten nichts
          anderes steht, verarbeiten sie Daten in unserem Auftrag und nach den
          Auftragsverarbeitungsbedingungen, die der jeweilige Anbieter für seine
          Kunden bereithält (Art. 28 DSGVO). Alle sind US-Unternehmen oder
          gehören zu US-Konzernen. Für die Übermittlung gelten je nach Anbieter
          der Angemessenheitsbeschluss zum EU-US Data Privacy Framework oder
          Standardvertragsklauseln der EU-Kommission (Art. 45 und 46 DSGVO).
          Eine Kopie der Garantien erhalten Sie auf Anfrage.
        </p>
        <VendorList
          texts={TEXTS}
          linkLabel="Datenschutzhinweise des Anbieters"
        />
      </>
    ),
  },
];
