import type { PlainLegalDocument } from "@/lib/legal/types";

// Version 2026-11-18 (TERMS_VERSION in terms.ts). A change of meaning is a new
// version: the old text moves to terms-archive/ with its values written out.
export const TERMS_DE: PlainLegalDocument = {
  title: "Allgemeine Geschäftsbedingungen",
  sections: [
    {
      id: "scope",
      heading: "1. Geltungsbereich und Anbieter",
      blocks: [
        "Diese Bedingungen gelten für alle Verträge über die Nutzung von DevStash zwischen dir und dem Anbieter {operatorName}, {operatorAddress}, E-Mail {operatorEmail}, Telefon {operatorPhone}.",
        "DevStash läuft derzeit im Testbetrieb: Zahlungen werden nur mit Testkarten simuliert, es wird kein Geld abgebucht.",
      ],
    },
    {
      id: "subject",
      heading: "2. Leistungen",
      blocks: [
        "DevStash ist ein Online-Dienst, in dem du Snippets, Prompts, Notizen, Befehle, Links, Dateien und Bilder speicherst, ordnest und durchsuchst.",
        {
          items: [
            "Free: kostenlos, bis zu {freeItemLimit} Einträge und {freeCollectionLimit} Sammlungen, ohne Uploads, eigene Typen und KI-Funktionen.",
            "Pro: unbegrenzte Einträge und Sammlungen, Datei- und Bild-Uploads, eigene Eintragstypen und KI-Funktionen, für {monthlyPrice} pro Monat oder {yearlyPrice} pro Jahr.",
          ],
        },
      ],
    },
    {
      id: "contract",
      heading: "3. Vertragsschluss",
      blocks: [
        "Du wählst auf der Upgrade-Seite oder in den Einstellungen den monatlichen oder jährlichen Pro-Plan. Vor der Bestellung siehst du Plan, Gesamtpreis, Laufzeit und Verlängerung, bestätigst diese Bedingungen und, falls gewünscht, den sofortigen Beginn (Ziffer 8).",
        "Mit dem Klick auf „Zahlungspflichtig bestellen“ gelangst du zur Bezahlseite unseres Zahlungsdienstleisters Stripe. Dort gibst du deine Zahlungsdaten ein; mit dem Absenden der Zahlung gibst du ein verbindliches Angebot ab. Der Vertrag kommt zustande, sobald die Zahlung bestätigt ist. Die Vertragsbestätigung mit diesen Bedingungen und der Widerrufsbelehrung erhältst du per E-Mail.",
        "Die Vertragssprache ist Deutsch oder Englisch. Wir speichern den Vertragstext nicht für dich zum Abruf; er ist in der Bestätigungs-E-Mail vollständig enthalten.",
      ],
    },
    {
      id: "prices",
      heading: "4. Preise und Zahlung",
      blocks: [
        "Alle Preise sind Endpreise in Euro und enthalten die gesetzliche Umsatzsteuer. Die Steuer wird nach deinem Wohnsitzland berechnet und auf der Bezahlseite ausgewiesen.",
        "Der Preis ist für jede Laufzeit im Voraus fällig und wird über Stripe per Karte eingezogen.",
      ],
    },
    {
      id: "term",
      heading: "5. Laufzeit und Kündigung",
      blocks: [
        "Das Abonnement läuft einen Monat oder ein Jahr und verlängert sich jeweils um dieselbe Laufzeit, wenn du es nicht kündigst.",
        "Du kannst jederzeit zum Ende der laufenden Laufzeit kündigen, ohne Angabe von Gründen: über die Schaltfläche „Verträge hier kündigen“, die auf jeder Seite verlinkt ist, über die Abrechnungsverwaltung in den Einstellungen oder in Textform an {operatorEmail}. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.",
      ],
    },
    {
      id: "default",
      heading: "6. Zahlungsverzug",
      blocks: [
        "Schlägt eine Verlängerungszahlung fehl, behältst du Pro, und Stripe versucht die Zahlung etwa zwei Wochen lang erneut. Gelingt sie bis dahin nicht, endet das Abonnement und dein Konto wechselt auf Free. Deine Daten bleiben erhalten.",
      ],
    },
    {
      id: "downgrade",
      heading: "7. Ende von Pro",
      blocks: [
        "Endet Pro, bleiben alle deine Daten erhalten. Für die Zeit danach gilt:",
        {
          items: [
            "Ansehen, Kopieren, Suchen, Exportieren und Löschen bleiben immer möglich, ebenso Favoriten, Anheften und Sammlungen.",
            "Hast du mehr als {freeItemLimit} Einträge, kannst du Inhalte von Einträgen nicht mehr bearbeiten, bis du unter der Grenze bist oder wieder Pro hast. Neue Einträge legst du erst unterhalb der Grenze an.",
            "Deine eigenen Eintragstypen und ihre Einträge bleiben sichtbar. Neue eigene Typen und neue Einträge eines eigenen Typs sind erst mit Pro wieder möglich.",
            "Dateien und Bilder bleiben gespeichert, sind aber erst mit Pro wieder abrufbar.",
          ],
        },
      ],
    },
    {
      id: "withdrawal",
      heading: "8. Widerrufsrecht",
      blocks: [
        "Als Verbraucher hast du ein Widerrufsrecht nach der unten stehenden Widerrufsbelehrung.",
        "Pro beginnt sofort nach der Zahlung, wenn du vor der Bestellung ausdrücklich zustimmst, dass wir vor Ablauf der Widerrufsfrist mit der Leistung beginnen, und bestätigst, dass du weißt, dass dein Widerrufsrecht damit erlischt (§ 356 Abs. 5 BGB). Ohne diese Zustimmung ist eine Bestellung nicht möglich.",
      ],
    },
    {
      id: "availability",
      heading: "9. Verfügbarkeit und Haftung",
      blocks: [
        "Wir bemühen uns um einen störungsfreien Betrieb, schulden aber keine ständige Verfügbarkeit. Wartung und Störungen außerhalb unseres Einflusses können den Zugang zeitweise unterbrechen.",
        "Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, für Schäden aus der Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt; im Übrigen ist sie bei leichter Fahrlässigkeit ausgeschlossen.",
      ],
    },
    {
      id: "final",
      heading: "10. Schlussbestimmungen",
      blocks: [
        "Es gilt deutsches Recht. Bist du Verbraucher mit gewöhnlichem Aufenthalt in einem anderen Staat der EU, bleiben dir die zwingenden Verbraucherschutzvorschriften dieses Staates erhalten.",
        "Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
        "Wie wir deine Daten verarbeiten, steht in der Datenschutzerklärung.",
      ],
    },
  ],
};
