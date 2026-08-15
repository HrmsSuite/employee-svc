import { SalaryStructure } from "@hrmssuite/persistence";

import {
  ChangeSalaryStructureStatusSchema,
  CreateSalaryStructureSchema,
  SalaryStructureIdSchema,
  UpdateSalaryStructureSchema,
} from "../common/validators/salary-structure.validator";

import { AppError } from "../helpers/error";
import { SalaryStructureDAO } from "../Dao";

function rethrow(error: unknown, fallbackMessage: string): never {
  if (error instanceof AppError) {
    throw error;
  }

  const message = error instanceof Error ? error.message : fallbackMessage;

  throw new Error(message);
}

export class SalaryStructureService {
  private salaryStructureDAO: SalaryStructureDAO;

  constructor() {
    this.salaryStructureDAO = new SalaryStructureDAO();
  }

  /**
   * Create salary structure.
   */
  public async createSalaryStructure(
    companyId: string,
    data: unknown,
  ): Promise<SalaryStructure> {
    const parsed = CreateSalaryStructureSchema.parse(data);

    try {
      return await this.salaryStructureDAO.createSalaryStructure(
        companyId,
        parsed as any,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to create salary structure");
    }
  }

  /**
   * Get salary structure by ID.
   */
  public async getSalaryStructureById(
    structureId: string,
    companyId: string,
  ): Promise<SalaryStructure | null> {
    SalaryStructureIdSchema.parse(structureId);

    try {
      return await this.salaryStructureDAO.getSalaryStructureById(
        structureId,
        companyId,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to fetch salary structure");
    }
  }

  /**
   * Get all salary structures for a company.
   */
  public async getAllSalaryStructures(
    companyId: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: SalaryStructure[]; total: number }> {
    try {
      return await this.salaryStructureDAO.getAllSalaryStructures(
        companyId,
        page,
        limit,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to fetch salary structures");
    }
  }

  /**
   * Update salary structure.
   */
  public async updateSalaryStructure(
    structureId: string,
    companyId: string,
    data: unknown,
  ): Promise<SalaryStructure> {
    SalaryStructureIdSchema.parse(structureId);

    const parsed = UpdateSalaryStructureSchema.parse(data);

    try {
      return await this.salaryStructureDAO.updateSalaryStructure(
        structureId,
        companyId,
        parsed as any,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to update salary structure");
    }
  }

  /**
   * Soft delete salary structure.
   */
  public async deleteSalaryStructure(
    structureId: string,
    companyId: string,
  ): Promise<void> {
    SalaryStructureIdSchema.parse(structureId);

    try {
      await this.salaryStructureDAO.deleteSalaryStructure(
        structureId,
        companyId,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to delete salary structure");
    }
  }
  public async changeSalaryStructureStatus(
    structureId: string,
    companyId: string,
    data: unknown,
  ): Promise<SalaryStructure> {
    SalaryStructureIdSchema.parse(structureId);

    const parsed = ChangeSalaryStructureStatusSchema.parse(data);

    try {
      return await this.salaryStructureDAO.changeSalaryStructureStatus(
        structureId,
        companyId,
        parsed.status,
      );
    } catch (error: unknown) {
      rethrow(error, "Failed to change salary structure status");
    }
  }
}
