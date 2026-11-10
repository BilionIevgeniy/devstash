import type { LegalSection } from "../types";

export const RIGHTS_DE: LegalSection[] = [
  {
    id: "retention",
    heading: "Speicherdauer",
    body: (
      <p>
        Konto und Inhalte speichern wir, bis Sie sie löschen oder Ihr Konto
        löschen (Einstellungen, „Delete account“). Beim Löschen des Kontos
        entfernen wir Ihre Daten aus der Datenbank, löschen Ihre Dateien und das
        Stripe-Kundenkonto. Zähler zum Missbrauchsschutz verfallen nach Minuten,
        höchstens nach 24 Stunden. Server-Protokolle löscht der Hosting-Anbieter
        nach seiner eigenen Frist.
      </p>
    ),
  },
  {
    id: "after-deletion",
    heading: "Was nach dem Löschen bleibt",
    body: (
      <p>
        Wir können nicht alles selbst löschen: Resend kann versendete E-Mails
        nach eigener Frist speichern, Stripe bewahrt Unterlagen auf, soweit es
        das Gesetz verlangt (derzeit Testmodus), und die Freigabe von DevStash
        in Ihrem GitHub-Konto bleibt bestehen, bis Sie sie in den
        GitHub-Einstellungen unter „Applications“ widerrufen.
      </p>
    ),
  },
  {
    id: "rights",
    heading: "Ihre Rechte",
    body: (
      <>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art.
          16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und
          Datenübertragbarkeit (Art. 20). Ihr Passwort ändern und Ihr Konto
          löschen können Sie selbst in der Anwendung; für die Berichtigung von
          Name oder E-Mail-Adresse und für alles andere schreiben Sie uns eine
          E-Mail.
        </p>
        <p>
          Sie können der Verarbeitung, die wir auf berechtigte Interessen
          stützen, jederzeit aus Gründen widersprechen, die sich aus Ihrer
          besonderen Situation ergeben (Art. 21 DSGVO).
        </p>
      </>
    ),
  },
  {
    id: "complaint",
    heading: "Beschwerderecht",
    body: (
      <p>
        Sie können sich bei einer Datenschutzaufsichtsbehörde beschweren (Art.
        77 DSGVO), zum Beispiel in dem Mitgliedstaat Ihres gewöhnlichen
        Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen
        Verstoßes.
      </p>
    ),
  },
  {
    id: "required",
    heading: "Erforderliche Angaben, automatisierte Entscheidungen",
    body: (
      <p>
        Für ein Konto brauchen wir Ihre E-Mail-Adresse und ein Passwort oder die
        Anmeldung mit GitHub; ohne sie können wir den Dienst nicht erbringen.
        Eine automatisierte Entscheidungsfindung einschließlich Profiling nach
        Art. 22 DSGVO findet nicht statt.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Änderungen",
    body: (
      <p>
        Stand: November 2026. Wenn wir Dienstleister oder Funktionen ändern,
        passen wir diese Erklärung an.
      </p>
    ),
  },
];
