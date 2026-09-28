import { FiCheckCircle, FiCreditCard, FiHeadphones, FiShield } from "react-icons/fi";

const TRUST_ITEMS = [
  { label: "Secured Payment Method", Icon: FiShield },
  { label: "Verified Influencers", Icon: FiCheckCircle },
  { label: "MTN MoMo & Orange Money", Icon: FiCreditCard },
  { label: "24/7 Support", Icon: FiHeadphones },
];

export function TrustBar() {
  return (
    <section className="border-y border-border bg-surface-alt px-4 py-5">
      <ul className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {TRUST_ITEMS.map(({ label, Icon }) => (
          <li key={label} className="flex items-center gap-2 text-sm font-semibold text-heading">
            <Icon className="text-primary" size={16} />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
