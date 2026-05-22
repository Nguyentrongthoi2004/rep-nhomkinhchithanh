/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "../../lib/supabase";

async function main() {
  console.log("=== BẮT ĐẦU TÌM DỮ LIỆU TEST ===");
  
  // 1. Tìm Worker
  const { data: workers } = await supabaseAdmin.from("nguoidung").select("*").eq("vaitro", "WORKER").limit(1);
  const worker = workers?.[0];
  console.log("Worker:", worker ? worker.mand : "Không tìm thấy");

  // 2. Tìm Admin
  const { data: admins } = await supabaseAdmin.from("nguoidung").select("*").eq("vaitro", "ADMIN").limit(1);
  const admin = admins?.[0];
  console.log("Admin:", admin ? admin.mand : "Không tìm thấy");

  if (!worker || !admin) return;

  // 3. Tìm Phân công
  const { data: assignments } = await supabaseAdmin.from("phancong").select("mapc, madh, matho, trangthai, donhang(trangthai)").eq("matho", worker.mand).limit(5);
  console.log("Phân công của Worker:", JSON.stringify(assignments, null, 2));

  if (!assignments || assignments.length === 0) return;

  const assignment = assignments[0];

  // 4. Tìm BOM
  const { data: bom } = await supabaseAdmin.from("chitietdh").select("*").eq("madh", assignment.madh);
  console.log("BOM của Phân công:", JSON.stringify(bom, null, 2));

  if (!bom || bom.length === 0) return;

  // 5. Tìm Phôi
  const materialIds = [...new Set(bom.map((b: any) => b.mavt))];
  const { data: stocks } = await supabaseAdmin.from("khothanhphoi").select("*").in("mavt", materialIds);
  console.log("Phôi liên quan:", JSON.stringify(stocks, null, 2));

  // 6. Tìm Sự cố (nếu có)
  const stockIds = stocks?.map((s: any) => s.maphoi) || [];
  if (stockIds.length > 0) {
    const { data: issues } = await supabaseAdmin.from("nhatkygiacong").select("*").in("maphoi", stockIds).eq("sukien", "LOI");
    console.log("Sự cố mở:", JSON.stringify(issues, null, 2));
  }
}

main().catch(console.error);
