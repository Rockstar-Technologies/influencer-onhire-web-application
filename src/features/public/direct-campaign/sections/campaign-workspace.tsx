"use client";

import { useState, type ReactNode } from "react";
import type { Campaign, CampaignFormOptions } from "@/types/direct-campaign";
import { CampaignForm } from "./campaign-form";
import { CampaignSuccess } from "./campaign-success";

interface CampaignWorkspaceProps {
  options: CampaignFormOptions;
  // Server-rendered page header and help sidebar.
  header: ReactNode;
  sidebar: ReactNode;
}

export function CampaignWorkspace({ options, header, sidebar }: CampaignWorkspaceProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  if (campaign) {
    return (
      <div className="mx-auto max-w-2xl">
        <CampaignSuccess campaign={campaign} options={options} onPostAnother={() => setCampaign(null)} />
      </div>
    );
  }

  return (
    <>
      {header}
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <CampaignForm options={options} onSuccess={setCampaign} />
        <aside aria-label="About posting a campaign" className="space-y-6">
          {sidebar}
        </aside>
      </div>
    </>
  );
}
