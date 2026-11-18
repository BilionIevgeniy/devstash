import type { PlainLegalDocument } from "@/lib/legal/types";

// The English rendering of withdrawal.de.ts; the German text is the binding one.
export const WITHDRAWAL_EN: PlainLegalDocument = {
  title: "Withdrawal information",
  sections: [
    {
      id: "right",
      heading: "Right of withdrawal",
      blocks: [
        "You have the right to withdraw from this contract within fourteen days without giving any reason. The withdrawal period is fourteen days from the day the contract is made.",
        "To exercise the right of withdrawal, you must inform us ({operatorName}, {operatorAddress}, email {operatorEmail}, phone {operatorPhone}) of your decision to withdraw from this contract by an unequivocal statement (for example an email). You may use the model withdrawal form below, but it is not obligatory.",
        "To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired.",
      ],
    },
    {
      id: "consequences",
      heading: "Effects of withdrawal",
      blocks: [
        "If you withdraw from this contract, we shall reimburse to you all payments received from you without undue delay and in any event not later than fourteen days from the day on which we are informed about your decision to withdraw. We will carry out the reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of the reimbursement.",
      ],
    },
    {
      id: "expiry",
      heading: "End of the right of withdrawal",
      blocks: [
        "For a contract on a digital service, your right of withdrawal ends once we have begun the service after you expressly agreed that we begin before the withdrawal period ends and confirmed that you know your right of withdrawal ends when the service begins (§ 356 (5) BGB). DevStash Pro begins only with this consent, right after the payment.",
      ],
    },
    {
      id: "form",
      heading: "Model withdrawal form",
      blocks: [
        "If you wish to withdraw from the contract, please complete and return this form.",
        {
          items: [
            "To {operatorName}, {operatorAddress}, email {operatorEmail}:",
            "I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract for the provision of the following service: DevStash Pro",
            "Ordered on (*)",
            "Name of consumer(s)",
            "Address of consumer(s)",
            "Signature of consumer(s) (only if this form is notified on paper)",
            "Date",
          ],
        },
        "(*) Delete as appropriate.",
      ],
    },
  ],
};
