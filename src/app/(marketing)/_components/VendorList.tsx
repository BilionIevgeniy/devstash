import { VENDOR_IDS, VENDORS, type VendorId } from "../_legal/vendors";

interface VendorListProps {
  /** One text per vendor: the type fails when a vendor has none. */
  texts: Record<VendorId, string>;
  /** The words of the link to the vendor's own privacy notice. */
  linkLabel: string;
}

export function VendorList({ texts, linkLabel }: VendorListProps) {
  return VENDOR_IDS.map((id) => (
    <div key={id} className="space-y-1">
      <h3>{VENDORS[id].name}</h3>
      <p>{texts[id]}</p>
      <p>
        <a href={VENDORS[id].privacyUrl}>
          {linkLabel}
          <span className="sr-only"> – {VENDORS[id].name}</span>
        </a>
      </p>
    </div>
  ));
}
