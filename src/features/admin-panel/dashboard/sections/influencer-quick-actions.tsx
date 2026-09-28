"use client";

import Link from "next/link";
import { useState } from "react";
import { FiCheckCircle, FiEye, FiMail } from "react-icons/fi";
import type { TopInfluencer } from "@/types/dashboard";
import { MessageDialog } from "../../users/sections/message-dialog";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-md border border-border text-body transition-colors hover:border-navy/30 hover:bg-info-light hover:text-navy";

export function InfluencerQuickActions({ influencer }: { influencer: TopInfluencer }) {
  const [messaging, setMessaging] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {sent && <FiCheckCircle className="text-success" aria-label="Message sent" />}
      <button type="button" onClick={() => setMessaging(true)} aria-label={`Message ${influencer.name}`} title="Message" className={iconButton}>
        <FiMail />
      </button>
      <Link href={`/admin/users/${influencer.id}`} aria-label={`View ${influencer.name}'s profile`} title="View profile" className={iconButton}>
        <FiEye />
      </Link>
      <MessageDialog
        recipients={messaging ? [influencer] : null}
        onClose={() => setMessaging(false)}
        onSent={() => setSent(true)}
      />
    </div>
  );
}
