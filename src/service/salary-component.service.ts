import { SalaryComponent, SalaryComponentModel } from "@hrmssuite/persistence";

import { AppError } from "../helpers/error";
import { SalaryComponentDAO } from "../Dao";
import {
  CreateSalaryComponentSchema,
  SalaryComponentIdSchema,
  UpdateSalaryComponentSchema,
} from "../common/validators/salary-component.validator";

/**
 * Re-throws known application errors as-is.
 * Unexpected errors are converted into a normal Error.
 */
function rethrow(error: unknown, fallbackMessage: string): never {
  if (error instanceof AppError) {
    throw error;
  }

  const message = error instanceof Error ? error.message : fallbackMessage;

  throw new Error(message);
}

export class SalaryComponentService {
  private salaryComponentDAO: SalaryComponentDAO;

  constructor() {
    this.salaryComponentDAO = new SalaryComponentDAO();
  }

  /**
   * Create a salary component.
   */
  public async createSalaryComponent(
    companyId: string,
    data: unknown,
  ): Promise<SalaryComponent> {
    const parsed = CreateSalaryComponentSchema.parse(data);

    try {
      return await this.salaryComponentDAO.createSalaryComponent(
        companyId,
        parsed as any,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to create salary component");
    }
  }

  /**
   * Get salary component by ID.
   */
  public async getSalaryComponentById(
    componentId: string,
    companyId: string,
  ): Promise<SalaryComponent | null> {
    SalaryComponentIdSchema.parse(componentId);

    try {
      return await this.salaryComponentDAO.getSalaryComponentById(
        componentId,
        companyId,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to fetch salary component");
    }
  }

  /**
   * Get all salary components of a company.
   */
  public async getAllSalaryComponents(
    companyId: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: SalaryComponent[]; total: number }> {
    try {
      return await this.salaryComponentDAO.getAllSalaryComponents(
        companyId,
        page,
        limit,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to fetch salary components");
    }
  }
  /**
   * Update salary component.
   */
  public async updateSalaryComponent(
    componentId: string,
    companyId: string,
    data: unknown,
  ): Promise<SalaryComponent> {
    SalaryComponentIdSchema.parse(componentId);

    const parsed = UpdateSalaryComponentSchema.parse(data);

    try {
      return await this.salaryComponentDAO.updateSalaryComponent(
        componentId,
        companyId,
        parsed as any,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to update salary component");
    }
  }

  /**
   * Soft delete salary component.
   */
  public async deleteSalaryComponent(
    componentId: string,
    companyId: string,
  ): Promise<void> {
    SalaryComponentIdSchema.parse(componentId);

    try {
      await this.salaryComponentDAO.deleteSalaryComponent(
        componentId,
        companyId,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to delete salary component");
    }
  }
}
