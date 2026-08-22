import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { DesignationServices } from "../service/designate.service";

const designationServices = new DesignationServices();

const handleZodError = (error: ZodError, res: Response): void => {
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    })),
  });
};

export class DesignationController {
  public async createDesignate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const createdDesignation = await designationServices.createDesignate(
        req.body,
        companyId,
      );
      res.status(201).json({
        success: true,
        message: "Designation created successfully",
        data: createdDesignation,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async findAll(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;

      const page = Math.max(
        Number.parseInt(req.query.page as string, 10) || 1,
        1,
      );

      const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit as string, 10) || 10, 1),
        100,
      );

      const designations = await designationServices.findAll(
        companyId,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        message: "Designations fetched successfully",
        ...designations,
      });
    } catch (error) {
      next(error);
    }
  }

  public async findDesignate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;
      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      const designation = await designationServices.findDesignate(
        id,
        companyId,
      );
      if (!designation) {
        res
          .status(404)
          .json({ success: false, message: "Designation not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Designation fetched successfully",
        data: designation,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async findByName(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const name = req.params.name as string;
      const companyId = req.companyId as string;
      if (!name) {
        res.status(400).json({ success: false, message: "Name is required" });
        return;
      }

      const designation = await designationServices.findByName(name, companyId);
      if (!designation) {
        res
          .status(404)
          .json({ success: false, message: "Designation not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Designation fetched successfully",
        data: designation,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async updateDesignate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;
      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      const updatedDesignation = await designationServices.updateDesignate(
        id,
        req.body.data,
        companyId,
      );
      if (!updatedDesignation) {
        res
          .status(404)
          .json({ success: false, message: "Designation not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Designation updated successfully",
        data: updatedDesignation,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async softDelete(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const companyId = req.companyId as string;
      if (!id) {
        res.status(400).json({ success: false, message: "ID is required" });
        return;
      }

      await designationServices.softDelete(id, companyId);
      res.status(200).json({
        success: true,
        message: "Designation deleted successfully",
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }
}
