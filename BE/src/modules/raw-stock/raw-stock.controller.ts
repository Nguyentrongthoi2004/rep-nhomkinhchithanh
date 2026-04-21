import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { rawStockService } from "./raw-stock.service";
import type {
  CreateBatchDto,
  CutActionDto,
  UpdateRawStockDto,
} from "./raw-stock.schema";

export const rawStockController = {
  async list(_req: Request, res: Response) {
    const rows = await rawStockService.list();
    sendOk(res, rows);
  },

  async getById(req: Request, res: Response) {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await rawStockService.getById(id));
  },

  async createBatch(req: Request, res: Response) {
    const result = await rawStockService.createBatch(req.body as CreateBatchDto);
    sendCreated(res, result);
  },

  async update(req: Request, res: Response) {
    const id = (req.params as unknown as { id: number }).id;
    const row = await rawStockService.update(id, req.body as UpdateRawStockDto);
    sendOk(res, row);
  },

  async remove(req: Request, res: Response) {
    const id = (req.params as unknown as { id: number }).id;
    await rawStockService.remove(id);
    sendNoContent(res);
  },

  /** Worker action: POST /api/worker/raw-stock/cut */
  async cut(req: Request, res: Response) {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const row = await rawStockService.recordCut(req.body as CutActionDto, user.mand);
    sendOk(res, row);
  },
};
