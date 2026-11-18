import type { PlainLegalDocument } from "@/lib/legal/types";

// The model withdrawal information (Anlage 1 zu Art. 246a § 1 Abs. 2 EGBGB)
// for a contract on a digital service, with the end of the right under
// § 356 Abs. 5 BGB, and the model withdrawal form (Anlage 2).
export const WITHDRAWAL_DE: PlainLegalDocument = {
  title: "Widerrufsbelehrung",
  sections: [
    {
      id: "right",
      heading: "Widerrufsrecht",
      blocks: [
        "Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.",
        "Um dein Widerrufsrecht auszuüben, musst du uns ({operatorName}, {operatorAddress}, E-Mail {operatorEmail}, Telefon {operatorPhone}) mittels einer eindeutigen Erklärung (z. B. eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das unten stehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.",
        "Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.",
      ],
    },
    {
      id: "consequences",
      heading: "Folgen des Widerrufs",
      blocks: [
        "Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.",
      ],
    },
    {
      id: "expiry",
      heading: "Erlöschen des Widerrufsrechts",
      blocks: [
        "Dein Widerrufsrecht erlischt bei einem Vertrag über digitale Dienstleistungen, wenn wir mit der Leistung begonnen haben, nachdem du ausdrücklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist mit der Leistung beginnen, und deine Kenntnis davon bestätigt hast, dass dein Widerrufsrecht mit Beginn der Leistung erlischt (§ 356 Abs. 5 BGB). DevStash Pro beginnt nur mit dieser Zustimmung, sofort nach der Zahlung.",
      ],
    },
    {
      id: "form",
      heading: "Muster-Widerrufsformular",
      blocks: [
        "Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular aus und sende es zurück.",
        {
          items: [
            "An {operatorName}, {operatorAddress}, E-Mail {operatorEmail}:",
            "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: DevStash Pro",
            "Bestellt am (*)",
            "Name des/der Verbraucher(s)",
            "Anschrift des/der Verbraucher(s)",
            "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)",
            "Datum",
          ],
        },
        "(*) Unzutreffendes streichen.",
      ],
    },
  ],
};
