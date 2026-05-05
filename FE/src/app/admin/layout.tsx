import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminHeader from "@/components/layout/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen admin-metal-bg text-gray-200 font-sans overflow-hidden relative print:h-auto print:min-h-0 print:block print:overflow-visible print:bg-white">
      {/* Metallic background layers — ẩn khi in/PDF để file nhẹ, chỉ còn nội dung */}
      <div className="admin-metal-glow print:hidden" />
      <div className="admin-metal-noise print:hidden" />

      {/* Sidebar - Fixed Left */}
      <AdminSidebar />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 print:w-full">
        {/* Top Header */}
        <AdminHeader />

        {/* Dynamic Content Area (The actual page content) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 selection:bg-blue-500/30 relative z-10 print:overflow-visible print:p-4 print:bg-white print:text-black">
          <div className="max-w-7xl mx-auto relative print:max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
