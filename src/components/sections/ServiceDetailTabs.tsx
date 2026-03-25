"use client";

import { useState } from "react";
import { CheckCircle2, Clock, FileText, Images, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "overview" | "media" | "requirements" | "process" | "documents";

export type ServiceDetailTabLabels = {
  overview: string;
  requirements: string;
  process: string;
  documents: string;
};

interface ServiceDetailTabsProps {
  tabLabels: ServiceDetailTabLabels;
  overview: React.ReactNode;
  requirements: React.ReactNode;
  process: React.ReactNode;
  documents: React.ReactNode;
  /** When set with `media`, a Photos & video tab is shown after Overview. */
  media?: React.ReactNode;
  mediaTabLabel?: string;
}

export function ServiceDetailTabs({
  tabLabels,
  overview,
  requirements,
  process,
  documents,
  media,
  mediaTabLabel,
}: ServiceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const showMediaTab = media != null && Boolean(mediaTabLabel);

  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "overview", label: tabLabels.overview, icon: FileText },
    ...(showMediaTab ? [{ id: "media" as const, label: mediaTabLabel!, icon: Images }] : []),
    { id: "requirements", label: tabLabels.requirements, icon: ListChecks },
    { id: "process", label: tabLabels.process, icon: Clock },
    { id: "documents", label: tabLabels.documents, icon: CheckCircle2 },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50 dark:bg-gray-800/50">
        <nav className="-mb-px flex gap-1 overflow-x-auto px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-siam-blue text-siam-blue dark:text-siam-blue"
                    : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white py-8 dark:bg-gray-900">
        <div className="px-4">
          {activeTab === "overview" ? overview : null}
          {activeTab === "media" ? media : null}
          {activeTab === "requirements" ? requirements : null}
          {activeTab === "process" ? process : null}
          {activeTab === "documents" ? documents : null}
        </div>
      </div>
    </div>
  );
}
