import { Request, Response, NextFunction } from "express";
import { ShiftServices } from "../service";

const shiftService = new ShiftServices();

export class ShiftController {
  /*  Create Shift  */
  public async createShift(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.companyId;

      if (!companyId) {
        throw new Error("Unauthorized");
      }

      const payload = {
        ...req.body,
        companyId,
      };

      const shift = await shiftService.createShift(payload);

      return res.status(201).json({
        success: true,
        message: "Shift created successfully",
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  }

  /*  Update Shift  */
  public async updateShift(req: Request, res: Response, next: NextFunction) {
    try {
      let id = req.params.id;

      if (Array.isArray(id)) {
        id = id[0];
      }

      const companyId = req.companyId;

      if (!companyId) {
        throw new Error("Unauthorized");
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: "ID is required",
        });
        return;
      }

      const updatedShift = await shiftService.updateShift(
        id,
        companyId,
        req.body,
      );

      return res.status(200).json({
        success: true,
        message: "Shift updated successfully",
        data: updatedShift,
      });
    } catch (error) {
      next(error);
    }
  }

  /*  Get Shift By Id  */
  public async getShiftById(req: Request, res: Response, next: NextFunction) {
    try {
      let id = req.params.id;

      if (Array.isArray(id)) {
        id = id[0];
      }
      const companyId = req.companyId;

      if (!companyId) {
        throw new Error("Unauthorized");
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: "ID is required",
        });
        return;
      }

      const shift = await shiftService.getShiftById(id, companyId);

      return res.status(200).json({
        success: true,
        message: "Shift fetched successfully",
        data: shift,
      });
    } catch (error) {
      next(error);
    }
  }

  /*  Get All Shifts  */
  public async getAllShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.companyId;

      if (!companyId) {
        throw new Error("Unauthorized");
      }

      const shifts = await shiftService.getAllShifts(companyId);

      return res.status(200).json({
        success: true,
        message: "Shifts fetched successfully",
        data: shifts,
      });
    } catch (error) {
      next(error);
    }
  }

  /*  Delete Shift  */
  public async deleteShift(req: Request, res: Response, next: NextFunction) {
    try {
      let id = req.params.id;

      if (Array.isArray(id)) {
        id = id[0];
      }

      const companyId = req.companyId;

      if (!companyId) {
        throw new Error("Unauthorized");
      }
      if (!id) {
        res.status(400).json({
          success: false,
          message: "ID is required",
        });
        return;
      }
      const deletedShift = await shiftService.deleteShift(id, companyId);

      return res.status(200).json({
        success: true,
        message: "Shift deleted successfully",
        data: deletedShift,
      });
    } catch (error) {
      next(error);
    }
  }
}
