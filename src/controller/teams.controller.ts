import { NextFunction, Request, Response } from "express";
import { TeamsServices } from "../service";
import { ZodError } from "zod";

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

export class TeamsController {
  private teamsServices: TeamsServices;

  constructor() {
    this.teamsServices = new TeamsServices();
  }

  public getTeams = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        throw new Error("Company ID not found");
      }

      const teams = await this.teamsServices.getAllTeams(companyId, req.query);

      res.status(200).json({
        success: true,
        data: teams,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  };

  public getTeamById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { teamId } = req.params;
      const companyId = req.user?.companyId;

      if (Array.isArray(teamId)) {
        throw new Error("Invalid reporting manager id");
      }

      if (!companyId) {
        throw new Error("Company ID not found");
      }

      const team = await this.teamsServices.getTeamById(teamId, companyId);

      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  };

  public getTeamByTL = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { reportingManagerId } = req.params;
      const companyId = req.user?.companyId;

      if (Array.isArray(reportingManagerId)) {
        throw new Error("Invalid reporting manager id");
      }

      if (!companyId) {
        throw new Error("Company ID not found");
      }

      const team = await this.teamsServices.getTeamByTL(
        reportingManagerId,
        companyId,
      );

      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  };

  public getTeamByEmployee = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const employeeId = String(req.params.employeeId);
      const companyId = String(req.user?.companyId);

      const team = await this.teamsServices.getTeamByEmployee(
        employeeId,
        companyId,
      );

      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
        return;
      }
      next(error);
    }
  };
  public getMyTeam = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = req.user?.companyId;
      const employeeId =  (req.user as any)?.employeeId;

      if (!companyId || !employeeId) {
        throw new Error("Unauthorized");
      }

      const team = await this.teamsServices.getMyTeam(employeeId, companyId);

      res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      next(error);
    }
  };
}
