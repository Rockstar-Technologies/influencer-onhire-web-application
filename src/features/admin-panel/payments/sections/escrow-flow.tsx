import { EscrowSteps } from "@/components/shared/escrow-steps";

export function EscrowFlow() {
  return (
    <EscrowSteps
      steps={[
        { title: "Brand pays", body: "The brand deposits the full campaign budget via MTN MoMo or Orange Money." },
        { title: "Held in escrow", body: "Funds stay on the platform, visible to the brand and the creator on their dashboards." },
        {
          title: "Released on completion",
          body: "The creator submits a delivery report and requests cashout. Once you approve it, 80% goes to the creator and the 20% service fee is booked as platform revenue.",
        },
      ]}
    />
  );
}
