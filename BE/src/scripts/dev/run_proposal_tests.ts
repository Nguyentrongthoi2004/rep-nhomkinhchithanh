/* eslint-disable @typescript-eslint/no-explicit-any */
import { cuttingPlansService } from "../../modules/cutting-plans/cutting-plans.service";
import { HttpError } from "../../lib/http";
import { supabaseAdmin } from "../../lib/supabase";

async function runTest(name: string, fn: () => Promise<any>) {
  console.log(`\n--- TEST: ${name} ---`);
  try {
    const res = await fn();
    console.log("PASS:", typeof res === "object" ? JSON.stringify(res, null, 2) : res);
    return res;
  } catch (error: any) {
    console.log("ERROR:", error instanceof HttpError ? `[HttpError ${error.status}] ${error.message}` : error.message);
    return null;
  }
}

async function main() {
  const mapc = 8;
  const workerId = 10;
  const adminId = 5;
  const bodiStockId = 646;

  await supabaseAdmin.from("dexuatcat").delete().eq("mapc", mapc);

  const validSimulatedBars = [
    {
      maphoi: 596, 
      cuts: [
        { mactdh: 35, chieudaicat: 2000, thutucat: 1 },
        { mactdh: 35, chieudaicat: 2000, thutucat: 2 }
      ]
    },
    {
      maphoi: 597,
      cuts: [
        { mactdh: 36, chieudaicat: 1800, thutucat: 1 },
        { mactdh: 40, chieudaicat: 2000, thutucat: 2 }
      ]
    },
    {
      maphoi: 1042,
      cuts: [
        { mactdh: 37, chieudaicat: 1954, thutucat: 1 },
        { mactdh: 37, chieudaicat: 1954, thutucat: 2 },
        { mactdh: 38, chieudaicat: 857, thutucat: 3 },
        { mactdh: 38, chieudaicat: 857, thutucat: 4 }
      ]
    },
    {
      maphoi: 1043,
      cuts: [
        { mactdh: 37, chieudaicat: 1954, thutucat: 1 },
        { mactdh: 37, chieudaicat: 1954, thutucat: 2 },
        { mactdh: 38, chieudaicat: 857, thutucat: 3 },
        { mactdh: 38, chieudaicat: 857, thutucat: 4 }
      ]
    }
  ];

  await runTest("Worker submit phân công người khác -> 403", async () => {
    return cuttingPlansService.submitProposal(mapc, 999, {
      mapc,
      lydodexuat: "Test sai worker",
      simulatedBars: validSimulatedBars
    });
  });

  await runTest("Phôi BO_DI -> 400", async () => {
    const barsWithBoDi = JSON.parse(JSON.stringify(validSimulatedBars));
    barsWithBoDi[0].maphoi = bodiStockId; 
    return cuttingPlansService.submitProposal(mapc, workerId, {
      mapc,
      lydodexuat: "Test BO DI",
      simulatedBars: barsWithBoDi
    });
  });

  await runTest("Vượt chiều dài -> 400", async () => {
    const barsOverLength = JSON.parse(JSON.stringify(validSimulatedBars));
    barsOverLength[0].cuts.push({ mactdh: 36, chieudaicat: 1800, thutucat: 3 });
    barsOverLength[1].cuts.shift();
    return cuttingPlansService.submitProposal(mapc, workerId, {
      mapc,
      simulatedBars: barsOverLength
    });
  });

  await runTest("Thiếu/Dư BOM -> 400", async () => {
    const barsMissingBom = JSON.parse(JSON.stringify(validSimulatedBars));
    barsMissingBom[1].cuts = [];
    return cuttingPlansService.submitProposal(mapc, workerId, {
      mapc,
      simulatedBars: barsMissingBom
    });
  });

  await runTest("Sai vật tư -> 400", async () => {
    const barsWrongMaterial = JSON.parse(JSON.stringify(validSimulatedBars));
    barsWrongMaterial[2].cuts[0].mactdh = 35; 
    barsWrongMaterial[0].cuts[0].mactdh = 37;
    return cuttingPlansService.submitProposal(mapc, workerId, {
      mapc,
      simulatedBars: barsWrongMaterial
    });
  });

  let proposalId: number | null = null;
  await runTest("Submit proposal hợp lệ", async () => {
    const res = await cuttingPlansService.submitProposal(mapc, workerId, {
      mapc,
      lydodexuat: "De xuat test hop le",
      simulatedBars: validSimulatedBars
    });
    proposalId = res.proposalId;
    return res;
  });

  if (!proposalId) return;

  await runTest("GET /api/worker/cutting-proposals", async () => {
    const res = await cuttingPlansService.listWorkerProposals(workerId);
    return res.length;
  });

  await runTest("GET /api/admin/cutting-proposals", async () => {
    const res = await cuttingPlansService.listProposals(mapc);
    return res.length;
  });

  await runTest("GET /api/admin/cutting-proposals/:id", async () => {
    const res = await cuttingPlansService.getProposalDetail(proposalId!);
    return res.trangthai;
  });

  await runTest("Admin reject proposal", async () => {
    return cuttingPlansService.rejectProposal(proposalId!, adminId, "Tu choi de xuat thu 1");
  });

  let prop2: any;
  let prop3: any;
  await runTest("Submit proposal 2 (để approve)", async () => {
    const validBars2 = JSON.parse(JSON.stringify(validSimulatedBars));
    validBars2[0].maphoi = 598;
    validBars2[1].maphoi = 599;
    validBars2[2].maphoi = 1044;
    validBars2[3].maphoi = 1045;
    prop2 = await cuttingPlansService.submitProposal(mapc, workerId, {
      mapc,
      lydodexuat: "De xuat test 2",
      simulatedBars: validBars2
    });
    return prop2;
  });

  await runTest("Submit proposal 3 (để test HET_HIEU_LUC)", async () => {
    const validBars3 = JSON.parse(JSON.stringify(validSimulatedBars));
    validBars3[0].maphoi = 600;
    validBars3[1].maphoi = 599; 
    validBars3[2].maphoi = 1046;
    validBars3[3].maphoi = 1047;
    prop3 = await cuttingPlansService.submitProposal(mapc, workerId, {
      mapc,
      lydodexuat: "De xuat test 3",
      simulatedBars: validBars3
    });
    return prop3;
  });

  await runTest("Admin approve proposal 2", async () => {
    return cuttingPlansService.approveProposal(prop2.proposalId, adminId, "Duyet de xuat 2");
  });

  await runTest("Kiem tra proposal 3 het hieu luc", async () => {
    const res = await cuttingPlansService.getProposalDetail(prop3.proposalId);
    return res.trangthai;
  });
}

main().catch(console.error);
