"use client";

import type { ElementType } from "react";
import Link from "next/link";

type DashboardMetricCardProps = {
  title: string;
  value: string | number;
  hint: string;
  icon: ElementType;
  tone: "emerald" | "sky" | "amber" | "red" | "violet";
  href?: string;
};

export function DashboardMetricCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: DashboardMetricCardProps) {
  const toneClass = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  }[tone];

  const body = (
    <div className="h-full rounded-2xl border border-white/10 bg-[#0a0a0c] p-5 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.03] hover:translate-y-[-2px] hover:shadow-lg hover:shadow-blue-500/5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 truncate">{title}</p>
          <div className="mt-2 text-2xl font-bold text-gray-100 truncate">{value}</div>
          <p className="mt-2 text-xs leading-relaxed text-gray-500 truncate">{hint}</p>
        </div>
        <div className={`rounded-xl border p-3 ${toneClass} shrink-0 transition-transform duration-300 hover:rotate-12`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }

  return body;
}
