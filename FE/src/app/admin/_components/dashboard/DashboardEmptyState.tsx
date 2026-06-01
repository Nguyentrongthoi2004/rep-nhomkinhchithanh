"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type DashboardEmptyStateProps = {
  icon: ElementType;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
};

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  href,
  actionLabel,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[220px] p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01] transition-colors hover:bg-white/[0.02]">
      <div className="p-3 rounded-2xl bg-white/5 text-gray-400 mb-3">
        <Icon className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 max-w-[280px]">{description}</p>
      {href && actionLabel && (
        <Link
          href={href}
          className="mt-4 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-blue-400 transition-all inline-flex items-center gap-1 group"
        >
          {actionLabel}
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}
    </div>
  );
}
