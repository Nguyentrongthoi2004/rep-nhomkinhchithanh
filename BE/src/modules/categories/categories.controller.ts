import type { Request, Response } from "express";
import { sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { categoriesService } from "./categories.service";
import type { CreateCategoryDto, UpdateCategoryDto } from "./categories.schema";

export const categoriesController = {
  async list(_req: Request, res: Response) {
    const rows = await categoriesService.list();
    sendOk(res, rows);
  },

  async getById(req: Request, res: Response) {
    const id = (req.params as unknown as { id: number }).id;
    const row = await categoriesService.getById(id);
    sendOk(res, row);
  },

  async create(req: Request, res: Response) {
    const body = req.body as CreateCategoryDto;
    const row = await categoriesService.create(body);
    sendCreated(res, row);
  },

  async update(req: Request, res: Response) {
    const id = (req.params as unknown as { id: number }).id;
    const body = req.body as UpdateCategoryDto;
    const row = await categoriesService.update(id, body);
    sendOk(res, row);
  },

  async remove(req: Request, res: Response) {
    const id = (req.params as unknown as { id: number }).id;
    await categoriesService.remove(id);
    sendNoContent(res);
  },
};
