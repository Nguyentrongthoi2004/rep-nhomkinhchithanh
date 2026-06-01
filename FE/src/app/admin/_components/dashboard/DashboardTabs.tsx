"use client";

import type { ElementType } from "react";

export type TabItem = {
  id: string;
  label: string;
  icon: ElementType;
};

type DashboardTabsProps = {
  tabs: readonly TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
};

export function DashboardTabs({ tabs, activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="flex border-b border-white/10 bg-[#0a0a0c]/60 backdrop-blur-md p-1.5 rounded-xl gap-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 relative ${
              isActive
                ? "bg-white/10 text-white shadow-lg border border-white/5"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-blue-400 animate-pulse" : "text-gray-500"}`} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
