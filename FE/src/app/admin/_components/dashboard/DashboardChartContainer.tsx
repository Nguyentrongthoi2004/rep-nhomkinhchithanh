"use client";

import type { ReactNode } from "react";

type DashboardChartContainerProps = {
  title: string;
  description?: string;
  heightClass?: string;
  children: ReactNode;
  rightAction?: ReactNode;
};

export function DashboardChartContainer({
  title,
  description,
  heightClass = "h-[300px]",
  children,
  rightAction,
}: DashboardChartContainerProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 flex flex-col min-w-0">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-100">{title}</h2>
          {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </div>
      <div className={`w-full ${heightClass} min-w-0 relative flex-1`}>
        {children}
      </div>
    </section>
  );
}
