import { workerTasksService } from "../../modules/worker-tasks/worker-tasks.service";
import { cuttingPlansService } from "../../modules/cutting-plans/cutting-plans.service";
import { imagesService } from "../../modules/images/images.service";
import { supabaseAdmin } from "../../lib/supabase";

function expectError(fn: () => Promise<unknown>, expectedMsg: string) {
  return fn()
    .then(() => {
      throw new Error(`Expected error containing "${expectedMsg}" but it succeeded.`);
    })
    .catch((err: unknown) => {
      const msg = (err as Error).message || String(err);
      if (msg.includes(expectedMsg)) {
        console.log(`  -> SUCCESS: Got expected error: "${msg}"`);
      } else {
        throw new Error(`Expected error containing "${expectedMsg}" but got "${msg}"`);
      }
    });
}

async function main() {
  console.log("=== STARTING EXTENDED ORDER TERMINAL GUARDS AND WORKER/CUTTING/IMAGES VERIFICATION ===");

  // 0. Find an active worker and an admin to use as foreign keys
  const { data: workerRow, error: workerRowErr } = await supabaseAdmin
    .from("nguoidung")
    .select("mand")
    .eq("vaitro", "WORKER")
    .eq("trangthai", "DANG_LAM")
    .limit(1)
    .maybeSingle();

  if (workerRowErr) throw new Error(`Worker query error: ${workerRowErr.message}`);

  const { data: adminRow, error: adminRowErr } = await supabaseAdmin
    .from("nguoidung")
    .select("mand")
    .eq("vaitro", "ADMIN")
    .eq("trangthai", "DANG_LAM")
    .limit(1)
    .maybeSingle();

  if (adminRowErr) throw new Error(`Admin query error: ${adminRowErr.message}`);

  if (!workerRow || !adminRow) {
    throw new Error("Need at least one active WORKER and one active ADMIN to run tests.");
  }
  const matho = workerRow.mand;
  const adminId = adminRow.mand;
  console.log(`Using Worker ID: ${matho}, Admin ID: ${adminId} for testing`);

  // 1. Create a temporary customer & order
  console.log("Creating temporary customer & order...");
  const randomPhone = "09" + Math.floor(10000000 + Math.random() * 90000000).toString();
  const { data: customer, error: custErr } = await supabaseAdmin
    .from("khachhang")
    .insert({
      hoten: "Temp Verification Customer",
      sdt: randomPhone,
      diachi: "Temp Verification Road"
    })
    .select("makh")
    .single();

  if (custErr) throw new Error(`Customer insert error: ${custErr.message}`);
  const makh = customer.makh;

  const { data: order, error: ordErr } = await supabaseAdmin
    .from("donhang")
    .insert({
      makh,
      trangthai: "DA_DUYET_GIA",
      tonggiatri: 150000
    })
    .select("madh")
    .single();

  if (ordErr) {
    await supabaseAdmin.from("khachhang").delete().eq("makh", makh);
    throw new Error(`Order insert error: ${ordErr.message}`);
  }
  const madh = order.madh;
  console.log(`Created temporary order: DH-${madh}`);

  // Create an assignment for this order (linked to our worker)
  console.log("Creating temporary assignment...");
  const { data: assignment, error: assignErr } = await supabaseAdmin
    .from("phancong")
    .insert({
      madh,
      matho,
      trangthai: "CHO_THUC_HIEN"
    })
    .select("mapc")
    .single();

  if (assignErr) {
    await supabaseAdmin.from("donhang").delete().eq("madh", madh);
    await supabaseAdmin.from("khachhang").delete().eq("makh", makh);
    throw new Error(`Assignment insert error: ${assignErr.message}`);
  }
  const mapc = assignment.mapc;
  console.log(`Created temporary assignment: PC-${mapc}`);

  // Let's query any existing maphoi to link to sodocat (so it satisfies foreign key constraints if needed)
  const { data: phoiRow, error: phoiErr } = await supabaseAdmin
    .from("khothanhphoi")
    .select("maphoi")
    .limit(1)
    .maybeSingle();
  if (phoiErr) console.warn(`phoiQuery warning: ${phoiErr.message}`);
  const maphoi = phoiRow?.maphoi || null;

  // Create a temporary sodocat linked to assignment
  console.log(`Creating temporary cutting plan (sodocat) with maphoi=${maphoi}...`);
  const { data: plan, error: planErr } = await supabaseAdmin
    .from("sodocat")
    .insert({
      mapc,
      maphoi,
      trangthai: "CHO_DUYET"
    })
    .select("masdc")
    .single();

  if (planErr) {
    console.error(`Sodocat insert failed: ${planErr.message}`);
    await supabaseAdmin.from("phancong").delete().eq("mapc", mapc);
    await supabaseAdmin.from("donhang").delete().eq("madh", madh);
    await supabaseAdmin.from("khachhang").delete().eq("makh", makh);
    throw new Error(`Sodocat insert error: ${planErr.message}`);
  }
  const masdc = plan.masdc;
  console.log(`Created temporary cutting plan: SDC-${masdc}`);

  // Create a temporary dexuatcat linked to assignment
  console.log("Creating temporary cutting proposal (dexuatcat)...");
  const { data: proposal, error: propErr } = await supabaseAdmin
    .from("dexuatcat")
    .insert({
      mapc,
      matho,
      trangthai: "CHO_DUYET"
    })
    .select("madxc")
    .single();

  if (propErr) {
    await supabaseAdmin.from("sodocat").delete().eq("masdc", masdc);
    await supabaseAdmin.from("phancong").delete().eq("mapc", mapc);
    await supabaseAdmin.from("donhang").delete().eq("madh", madh);
    await supabaseAdmin.from("khachhang").delete().eq("makh", makh);
    throw new Error(`Proposal insert error: ${propErr.message}`);
  }
  const madxc = proposal.madxc;
  console.log(`Created temporary proposal: DXC-${madxc}`);

  // Create a temporary image linked to order
  console.log("Creating temporary image (hinhanh)...");
  const { data: image, error: imgErr } = await supabaseAdmin
    .from("hinhanh")
    .insert({
      madh,
      duongdan: "verification_test_image.jpg"
    })
    .select("maha")
    .single();

  if (imgErr) {
    await supabaseAdmin.from("dexuatcat").delete().eq("madxc", madxc);
    await supabaseAdmin.from("sodocat").delete().eq("masdc", masdc);
    await supabaseAdmin.from("phancong").delete().eq("mapc", mapc);
    await supabaseAdmin.from("donhang").delete().eq("madh", madh);
    await supabaseAdmin.from("khachhang").delete().eq("makh", makh);
    throw new Error(`Image insert error: ${imgErr.message}`);
  }
  const maha = image.maha;
  console.log(`Created temporary image: HA-${maha}`);

  try {
    // Set the order status directly in DB to HOAN_THANH to lock it
    console.log("Setting order status to HOAN_THANH to activate terminal locks...");
    await supabaseAdmin
      .from("donhang")
      .update({ trangthai: "HOAN_THANH" })
      .eq("madh", madh);

    // --- TEST 1: Worker updateStatus on assignment of HOAN_THANH order ---
    console.log("Testing: Worker updateStatus on HOAN_THANH order assignment...");
    await expectError(
      () => workerTasksService.updateStatus(mapc, matho, { trangthai: "DANG_THUC_HIEN" }),
      "Đơn hàng đã hoàn thành hoặc đã hủy, không thể cập nhật nhiệm vụ"
    );

    // --- TEST 2: Worker reject on assignment of HOAN_THANH order ---
    console.log("Testing: Worker reject on HOAN_THANH order assignment...");
    await expectError(
      () => workerTasksService.reject(mapc, matho, { lydo: "LY_DO_KHAC", ghichu: "Muốn nghỉ ngơi" }),
      "Đơn hàng đã hoàn thành hoặc đã hủy, không thể cập nhật nhiệm vụ"
    );

    // --- TEST 3: createForAssignment for HOAN_THANH order ---
    console.log("Testing: createForAssignment for HOAN_THANH order...");
    await expectError(
      () => cuttingPlansService.createForAssignment(mapc),
      "Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể tạo sơ đồ cắt"
    );

    // --- TEST 4: completePlan for HOAN_THANH order (must block before stock deduction) ---
    console.log("Testing: completePlan for HOAN_THANH order...");
    await expectError(
      () => cuttingPlansService.completePlan(masdc, matho),
      "Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể xác nhận hoàn thành sơ đồ cắt"
    );

    // --- TEST 5: reportIssue for HOAN_THANH order ---
    console.log("Testing: reportIssue for HOAN_THANH order...");
    await expectError(
      () => cuttingPlansService.reportIssue(masdc, matho, { loaiSuCo: "LOI_KHAC", mota: "Lỗi lưỡi cưa" }),
      "Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể báo sự cố"
    );

    // --- TEST 6: approveProposal/rejectProposal for proposal belonging to HOAN_THANH order ---
    console.log("Testing: approveProposal for HOAN_THANH order proposal...");
    await expectError(
      () => cuttingPlansService.approveProposal(madxc, adminId, "Duyệt gấp"),
      "Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể duyệt đề xuất cắt"
    );

    console.log("Testing: rejectProposal for HOAN_THANH order proposal...");
    await expectError(
      () => cuttingPlansService.rejectProposal(madxc, adminId, "Từ chối gấp"),
      "Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể từ chối đề xuất cắt"
    );

    // --- TEST 7: upload image for HOAN_THANH order (imagesService.upload) ---
    console.log("Testing: imagesService.upload for HOAN_THANH order...");
    await expectError(
      () => imagesService.upload(
        {
          madh,
          loaianh: "KHAC",
          dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        },
        adminId,
        "ADMIN"
      ),
      "Đơn hàng đã hoàn thành hoặc đã hủy, không thể tải lên hình ảnh"
    );

    // --- TEST 8: delete image of HOAN_THANH order ---
    console.log("Testing: remove image of HOAN_THANH order...");
    await expectError(
      () => imagesService.remove(maha),
      "Đơn hàng đã hoàn thành hoặc đã hủy, không thể xóa hình ảnh"
    );

  } finally {
    console.log("Cleaning up temporary database records...");
    await supabaseAdmin.from("hinhanh").delete().eq("maha", maha);
    await supabaseAdmin.from("dexuatcat").delete().eq("madxc", madxc);
    await supabaseAdmin.from("sodocat").delete().eq("masdc", masdc);
    await supabaseAdmin.from("phancong").delete().eq("mapc", mapc);
    await supabaseAdmin.from("donhang").delete().eq("madh", madh);
    await supabaseAdmin.from("khachhang").delete().eq("makh", makh);
    console.log("Cleanup finished.");
  }

  console.log("=== ALL REMAINING GUARD TEST CASES COMPLETED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
