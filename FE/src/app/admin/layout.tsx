import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminHeader from "@/components/layout/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen admin-metal-bg text-gray-200 font-sans overflow-hidden relative">
      {/* Metallic background layers */}
      <div className="admin-metal-glow" />
      <div className="admin-metal-noise" />

      {/* Sidebar - Fixed Left */}
      <AdminSidebar />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <AdminHeader />

        {/* Dynamic Content Area (The actual page content) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 selection:bg-blue-500/30 relative z-10">
          <div className="max-w-7xl mx-auto relative">
            {children}
          </div>
        </main>
        
      </div>
    </div>
  );
}
