import { Request, Response, NextFunction } from "express";
import { DepartmentServices } from "../service/department.services";
import { ZodError } from "zod";

const departmentServices = new DepartmentServices();

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

export class DepartmentController {
  public async createDepartment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const createdDepartment = await departmentServices.createDepartment(req.body, companyId);
      res.status(201).json({
        success: true,
        message: "Department created successfully",
        data: createdDepartment,
      });
    } catch (error) {
      if (error instanceof ZodError) { handleZodError(error, res); return; }
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
      const departments = await departmentServices.findAll(companyId);
      res.status(200).json({
        success: true,
        message: "Departments fetched successfully",
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  }

  public async findByDepartment(
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

      const department = await departmentServices.findByDepartment(id, companyId);
      if (!department) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Department fetched successfully",
        data: department,
      });
    } catch (error) {
      if (error instanceof ZodError) { handleZodError(error, res); return; }
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

      const department = await departmentServices.findByName(name, companyId);
      if (!department) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Department fetched successfully",
        data: department,
      });
    } catch (error) {
      if (error instanceof ZodError) { handleZodError(error, res); return; }
      next(error);
    }
  }

  public async updateDepartment(
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

      const updatedDepartment = await departmentServices.updateDepartment(id, req.body.data, companyId);
      if (!updatedDepartment) {
        res.status(404).json({ success: false, message: "Department not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Department updated successfully",
        data: updatedDepartment,
      });
    } catch (error) {
      if (error instanceof ZodError) { handleZodError(error, res); return; }
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

      await departmentServices.softDelete(id, companyId);
      res.status(200).json({
        success: true,
        message: "Department deleted successfully",
      });
    } catch (error) {
      if (error instanceof ZodError) { handleZodError(error, res); return; }
      next(error);
    }
  }
}