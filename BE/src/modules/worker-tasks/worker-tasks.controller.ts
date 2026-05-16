import type { Request, Response } from "express";
import { sendOk } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { workerTasksService } from "./worker-tasks.service";
import type { RejectTaskDto, UpdateTaskDto } from "./worker-tasks.schema";

export const workerTasksController = {
  async list(req: Request, res: Response) {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const rows = await workerTasksService.listForWorker(user.mand);
    sendOk(res, rows);
  },

  async updateStatus(req: Request, res: Response) {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const id = (req.params as unknown as { id: number }).id;
    const row = await workerTasksService.updateStatus(id, user.mand, req.body as UpdateTaskDto);
    sendOk(res, row);
  },

  async reject(req: Request, res: Response) {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const id = (req.params as unknown as { id: number }).id;
    const row = await workerTasksService.reject(id, user.mand, req.body as RejectTaskDto);
    sendOk(res, row);
  },
};
