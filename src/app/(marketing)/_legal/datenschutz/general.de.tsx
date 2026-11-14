import { OperatorContact } from "../../_components/OperatorContact";
import type { LegalSection } from "../types";

export const GENERAL_DE: LegalSection[] = [
  {
    id: "controller",
    heading: "Verantwortlicher",
    body: (
      <>
        <p>
          Verantwortlich für die Verarbeitung personenbezogener Daten auf dieser
          Website ist:
        </p>
        <OperatorContact lang="de" />
        <p>
          Wir haben keinen Datenschutzbeauftragten benannt. Diese Erklärung
          informiert Sie nach Art. 13 DSGVO darüber, welche Daten wir
          verarbeiten, wozu und an wen sie gehen.
        </p>
      </>
    ),
  },
  {
    id: "about",
    heading: "Über dieses Angebot",
    body: (
      <p>
        DevStash ist ein Demonstrationsprojekt. Die Zahlungsabwicklung über
        Stripe läuft im Testmodus: Es werden keine echten Zahlungen verarbeitet
        und keine echten Zahlungsdaten erhoben. Die Daten, die Sie eingeben,
        verarbeiten wir dennoch so, wie es auf dieser Seite steht.
      </p>
    ),
  },
  {
    id: "data",
    heading: "Welche Daten wir verarbeiten und warum",
    body: (
      <ul>
        <li>
          <strong>Konto und Anmeldung:</strong> E-Mail-Adresse, Name und
          Passwort (nur als bcrypt-Hash); bei der Anmeldung mit GitHub Ihre
          GitHub-Kennung (ID), Name, E-Mail-Adresse und die Adresse Ihres
          Profilbilds. Zweck: Ihr Konto anlegen und Sie anmelden.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertrag).
        </li>
        <li>
          <strong>Ihre Inhalte:</strong> Einträge (Snippets, Prompts, Notizen,
          Befehle, Links), Sammlungen, Tags, Editor-Einstellungen sowie
          hochgeladene Dateien und Bilder. Zweck: der Dienst selbst.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
        </li>
        <li>
          <strong>E-Mails:</strong> Wir senden Ihnen eine E-Mail, um Ihre
          Adresse zu bestätigen oder Ihr Passwort zurückzusetzen.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
        </li>
        <li>
          <strong>Abrechnung:</strong> Stripe-Kundendaten (E-Mail-Adresse,
          Nutzer-ID) und der Status Ihres Abonnements. Zahlungsdaten geben Sie
          direkt bei Stripe ein. Derzeit Testmodus. Rechtsgrundlage: Art. 6 Abs.
          1 lit. b DSGVO.
        </li>
        <li>
          <strong>Sicherheit und Missbrauchsschutz:</strong> Wir begrenzen
          Anmeldungen, Registrierungen, E-Mails und KI-Anfragen. Dafür speichern
          wir Zähler zu SHA-256-Hashes Ihrer E-Mail-Adresse, IP-Adresse und
          Nutzer-ID, nur für die Dauer des jeweiligen Zeitfensters (höchstens 24
          Stunden). Die Hashes sind pseudonymisiert, nicht anonym.
          Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am
          Schutz vor Missbrauch).
        </li>
        <li>
          <strong>Bereitstellung der Website:</strong> Beim Aufruf verarbeitet
          unser Hosting-Anbieter technisch notwendige Daten in
          Server-Protokollen: IP-Adresse, Zeitpunkt, aufgerufene Adresse und
          Browserkennung. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an einem sicheren, stabilen Betrieb).
        </li>
        <li>
          <strong>Fehlerüberwachung:</strong> Wenn in der Anwendung etwas
          fehlschlägt, werden technische Angaben zum Fehler (keine Inhalte von
          Ihnen) an unseren Dienstleister Sentry übermittelt, siehe „Empfänger“
          unten. Zweck: Fehler erkennen und beheben. Rechtsgrundlage: Art. 6
          Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem stabilen
          Betrieb).
        </li>
      </ul>
    ),
  },
  {
    id: "ai",
    heading: "KI-Funktionen",
    body: (
      <>
        <p>
          Wenn Sie auf eine KI-Schaltfläche klicken („Generate with AI“,
          „Explain“, „Optimize“), senden wir den Titel und den Inhalt des
          betreffenden Eintrags, bei Bedarf gekürzt, an OpenAI. Ein Sprachmodell
          erzeugt daraus Tags, eine Zusammenfassung, eine Erklärung oder eine
          Verbesserung. Ohne Ihren Klick wird nichts gesendet. Mitgesendet wird
          ein Hash Ihrer Nutzer-ID zur Missbrauchserkennung. Wir weisen OpenAI
          an, die Anfrage nicht zu speichern; OpenAI kann API-Daten nach seinen
          eigenen Bedingungen kurzzeitig zur Missbrauchserkennung aufbewahren.
        </p>
        <p>
          Das Ergebnis sehen nur Sie, und es wird nur gespeichert, wenn Sie es
          übernehmen. Es findet keine automatisierte Entscheidung mit
          rechtlicher Wirkung statt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b
          DSGVO, denn Sie haben die Funktion angefordert.
        </p>
        <p>
          Tragen Sie keine Passwörter, API-Schlüssel oder andere Geheimnisse in
          Einträge ein, die Sie an die KI senden. Die Ergebnisse stammen von
          einem KI-Modell und können fehlerhaft sein.
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
          Wir setzen nur Cookies, die für den Dienst technisch erforderlich sind
          oder die Sie selbst durch eine Einstellung auslösen (§ 25 Abs. 2 Nr. 2
          TDDDG). Deshalb fragen wir nicht nach einer Einwilligung. Wir setzen
          keine Analyse-, Werbe- oder Tracking-Cookies. Die Fehlerüberwachung
          (siehe „Empfänger“) setzt keine Cookies und speichert nichts in Ihrem
          Browser.
        </p>
        <ul>
          <li>
            <code>authjs.session-token</code>: Ihre angemeldete Sitzung
            (verschlüsselt und signiert), 30 Tage ab Ihrer letzten Aktivität.
          </li>
          <li>
            <code>authjs.csrf-token</code> und <code>authjs.callback-url</code>:
            schützen die Anmeldeformulare und führen Sie nach der Anmeldung
            zurück zur gewünschten Seite; bis zum Ende der Browsersitzung. Sie
            werden gesetzt, sobald die Website prüft, ob Sie angemeldet sind,
            also schon beim ersten Besuch.
          </li>
          <li>
            <code>authjs.pkce.code_verifier</code>: nur während der Anmeldung
            mit GitHub, 15 Minuten.
          </li>
          <li>
            <code>sidebar-open</code>: merkt sich, ob die Seitenleiste geöffnet
            ist. Wird nur gesetzt, wenn Sie sie ein- oder ausklappen; 1 Jahr.
          </li>
          <li>
            <code>devstash-locale</code>: die Sprache, die Sie für die App
            gewählt haben (Deutsch oder Englisch). Wird nur gesetzt, wenn Sie im
            Nutzermenü oder über den Sprachlink der Website eine Sprache
            auswählen; 1 Jahr. Ohne dieses Cookie folgt die App der Sprache
            Ihres Browsers.
          </li>
        </ul>
        <p>
          Auf der Website tragen die Anmelde-Cookies zusätzlich das Präfix{" "}
          <code>__Secure-</code> oder <code>__Host-</code>.
        </p>
      </>
    ),
  },
];
