import { FiCreditCard } from "react-icons/fi";
import { Panel } from "@/components/shared/panel";

export function PaymentMethods({ methods }: { methods: string[] }) {
  return (
    <Panel title="Payment Methods">
      <ul className="flex flex-wrap gap-3">
        {methods.map((method) => (
          <li
            key={method}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-heading"
          >
            <FiCreditCard className="text-muted" />
            {method}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
