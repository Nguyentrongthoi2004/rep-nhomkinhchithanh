import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customer, phone, totalCost, items } = body;

    // We can use Supabase client directly, RLS allows authenticated users.
    // 1. Check or Insert Customer (khachhang) by phone
    let makh = null;
    const { data: existKh, error: khFindErr } = await supabase
      .from("khachhang")
      .select("makh")
      .eq("sdt", phone)
      .maybeSingle();

    if (khFindErr) throw khFindErr;

    if (existKh) {
      makh = existKh.makh;
    } else {
      const { data: newKh, error: khInsertErr } = await supabase
        .from("khachhang")
        .insert([{ hoten: customer, sdt: phone }])
        .select()
        .single();
      if (khInsertErr) throw khInsertErr;
      makh = newKh.makh;
    }

    // 2. Insert Order (donhang)
    const { data: newOrder, error: orderErr } = await supabase
      .from("donhang")
      .insert([{
        makh: makh,
        trangthai: "BAO_GIA_NHAP",
        tonggiatri: totalCost
      }])
      .select()
      .single();

    if (orderErr) throw orderErr;
    const madh = newOrder.madh;

    // 3. Insert BOM Items (chitietdh)
    if (items && items.length > 0) {
      const detailPayload = items.map((item: { mavt?: number; name: string; length?: number; w?: number; qty: number; }) => ({
        madh: madh,
        mavt: item.mavt, // Fallback to 12 if undefined
        mota: item.name,
        chieudaicat: item.length || item.w || 0,
        soluong: item.qty,
        dongiadongbang: 0,
        thanhtien: 0
      }));

      const { error: detailErr } = await supabase
        .from("chitietdh")
        .insert(detailPayload);
        
      if (detailErr) throw detailErr;
    }

    return NextResponse.json({ success: true, madh: madh, message: `Lưu thành công Đơn hàng #${madh}` });

  } catch (err: unknown) {
    console.error("Order Transaction Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lỗi xử lý đơn hàng" }, { status: 500 });
  }
}
