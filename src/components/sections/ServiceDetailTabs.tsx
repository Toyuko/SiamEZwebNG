"use client";

import { useState } from "react";
import { CheckCircle2, Clock, FileText, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "overview" | "requirements" | "process" | "documents";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ServiceDetailTabsProps {
  overview: React.ReactNode;
  requirements: React.ReactNode;
  process: React.ReactNode;
  documents: React.ReactNode;
}

const tabs: Tab[] = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "requirements", label: "Requirements", icon: ListChecks },
  { id: "process", label: "Process Steps", icon: Clock },
  { id: "documents", label: "Required Documents", icon: CheckCircle2 },
];

export function ServiceDetailTabs({
  overview,
  requirements,
  process,
  documents,
}: ServiceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const contentMap = {
    overview,
    requirements,
    process,
    documents,
  };

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
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-siam-blue text-siam-blue dark:text-siam-blue"
                    : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
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
          {contentMap[activeTab]}
        </div>
      </div>
    </div>
  );
}
