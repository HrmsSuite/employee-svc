import { Designations, DesignationsData } from "@hrmssuite/persistence";
import { DesignationDAO } from "../Dao/designation.daos";
import {
  DesignationSchema,
  DesignationIdSchema,
  DesignationNameSchema,
  UpdateDesignationSchema,
} from "../common/validators/designation.validator";

const designationDAO = new DesignationDAO();

export class DesignationServices {
  public async createDesignate(
    data: Designations,
    companyId: string,
  ): Promise<Designations> {
    DesignationSchema.parse(data);

    try {
      const createdDesignation = await designationDAO.createDesignantionDao(
        data,
        companyId,
      );
      return createdDesignation;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create designation";
      throw new Error(message);
    }
  }

  public async findAll(companyId: string, page: number, limit: number) {
    try {
      const result = await designationDAO.findAllDesignation(
        companyId,
        page,
        limit,
      );

      const totalPages = Math.ceil(result.total / limit);

      return {
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch designations";

      throw new Error(message);
    }
  }

  public async findDesignate(
    id: string,
    companyId: string,
  ): Promise<Designations | null> {
    DesignationIdSchema.parse(id);

    try {
      const designation = await designationDAO.findDesignate(id, companyId);
      return designation;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch designation by id";
      throw new Error(message);
    }
  }

  public async findByName(
    name: string,
    companyId: string,
  ): Promise<Designations | null> {
    DesignationNameSchema.parse(name);

    try {
      const designation = await designationDAO.findByName(name, companyId);
      return designation;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch designation by name";
      throw new Error(message);
    }
  }

  public async updateDesignate(
    id: string,
    data: Partial<DesignationsData>,
    companyId: string,
  ): Promise<Designations | null> {
    DesignationIdSchema.parse(id);
    UpdateDesignationSchema.parse(data);

    try {
      const updatedDesignation = await designationDAO.updateDesignationDao(
        id,
        data,
        companyId,
      );
      return updatedDesignation;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update designation";
      throw new Error(message);
    }
  }

  public async softDelete(id: string, companyId: string): Promise<void> {
    DesignationIdSchema.parse(id);

    try {
      await designationDAO.softDelete(id, companyId);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete designation";
      throw new Error(message);
    }
  }
}
