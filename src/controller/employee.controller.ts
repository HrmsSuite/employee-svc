import { Request, Response, NextFunction } from "express";
import { EmployeeServices } from "../service/employee.services";
import { ZodError } from "zod";
const employeeServices = new EmployeeServices();
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

export class EmployeeController {
  public async createEmployee(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.companyId as string;
      const createdEmployee = await employeeServices.createEmployee(
        req.body,
        companyId,
      );
      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: createdEmployee,
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
      const employees = await employeeServices.findAll(companyId);
      res.status(200).json({
        success: true,
        message: "Employees fetched successfully",
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  }

  public async findById(
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

      const employee = await employeeServices.findById(id, companyId);
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async findByEmail(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const email = req.params.email as string;
      const companyId = req.companyId as string;
      if (!email) {
        res.status(400).json({ success: false, message: "Email is required" });
        return;
      }

      const employee = await employeeServices.findByEmail(email, companyId);
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async findByEmployeeId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const employeeId = req.params.employeeId as string;
      const companyId = req.companyId as string;
      if (!employeeId) {
        res
          .status(400)
          .json({ success: false, message: "Employee ID is required" });
        return;
      }

      const employee = await employeeServices.findByEmployeeId(
        employeeId,
        companyId,
      );
      if (!employee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee fetched successfully",
        data: employee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async updateEmployee(
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

      const updatedEmployee = await employeeServices.updateEmployee(
        id,
        req.body,
        companyId,
      );
      if (!updatedEmployee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Employee updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async updateBankDetails(
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

      const updatedEmployee = await employeeServices.updateBankDetails(
        id,
        req.body,
        companyId,
      );
      if (!updatedEmployee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Bank details updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async updateLegalDetails(
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

      const updatedEmployee = await employeeServices.updateLegalDetails(
        id,
        req.body,
        companyId,
      );
      if (!updatedEmployee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Legal details updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async updateCompensation(
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

      const updatedEmployee = await employeeServices.updateCompensation(
        id,
        req.body,
        companyId,
      );
      if (!updatedEmployee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Compensation updated successfully",
        data: updatedEmployee,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  }

  public async updateAddress(
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

      const updatedEmployee = await employeeServices.updateAddress(
        id,
        req.body,
        companyId,
      );
      if (!updatedEmployee) {
        res.status(404).json({ success: false, message: "Employee not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Address updated successfully",
        data: updatedEmployee,
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

      await employeeServices.softDelete(id, companyId);
      res.status(200).json({
        success: true,
        message: "Employee deleted successfully",
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
