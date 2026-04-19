import WorkerHeader from "@/components/layout/WorkerHeader";
import WorkerBottomNav from "@/components/layout/WorkerBottomNav";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0c] text-gray-200 font-sans selection:bg-blue-500/30 relative">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
      
      <WorkerHeader />
      
      {/* 
        Main content padding: 
        pt-20 (80px) to clear the top header (16x4=64px + safe space)
        pb-24 (96px) to clear the bottom nav (20x4=80px + safe space) 
      */}
      <main className="flex-1 w-full max-w-md mx-auto pt-20 pb-24 px-4 overflow-y-auto">
        {children}
      </main>

      <WorkerBottomNav />
    </div>
  );
}
