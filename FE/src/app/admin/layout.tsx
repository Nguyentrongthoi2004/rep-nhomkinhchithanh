import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminHeader from "@/components/layout/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#050505] text-gray-200 font-sans overflow-hidden">
      {/* Sidebar - Fixed Left */}
      <AdminSidebar />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <AdminHeader />

        {/* Dynamic Content Area (The actual page content) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 selection:bg-blue-500/30">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
      </div>
    </div>
  );
}
