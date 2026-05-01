import { ShiftData } from "@hrmssuite/persistence";
import { ShiftDao } from "../Dao";
import {
  CreateShiftSchema,
  UpdateShiftSchema,
  ShiftIdSchema,
  CreateShiftSchemaType,
  UpdateShiftSchemaType,
} from "../common/validators/shiftData.validator";

export class ShiftServices {
  private shiftDAO: ShiftDao;
  constructor() {
    this.shiftDAO = new ShiftDao();
  }

  /*  Create Shift  */
  public async createShift(data: CreateShiftSchemaType): Promise<ShiftData> {
    try {
      const validatedData = CreateShiftSchema.parse(data);

      const createdShift = await this.shiftDAO.createShift(validatedData);

      return createdShift;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create shift";

      throw new Error(message);
    }
  }

  /*  Update Shift  */
  public async updateShift(
    id: string,
    companyId: string,
    data: UpdateShiftSchemaType,
  ): Promise<ShiftData | null> {
    try {
      ShiftIdSchema.parse(id);

      const validatedData = UpdateShiftSchema.parse(data);

      const updatedShift = await this.shiftDAO.editShift(
        id,
        validatedData,
        companyId,
      );

      if (!updatedShift) {
        const error = new Error("Shift not found");
        (error as any).statusCode = 404;
        throw error;
      }

      return updatedShift;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update shift";

      throw new Error(message);
    }
  }

  /*  Get Shift By Id  */
  public async getShiftById(
    id: string,
    companyId: string,
  ): Promise<ShiftData | null> {
    try {
      ShiftIdSchema.parse(id);

      const shift = await this.shiftDAO.getShiftById(id, companyId);

      if (!shift) {
        const error = new Error("Shift not found");
        (error as any).statusCode = 404;
        throw error;
      }

      return shift;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch shift by id";

      throw new Error(message);
    }
  }

  /*  Get All Shifts  */
  public async getAllShifts(companyId: string): Promise<ShiftData[]> {
    try {
      const shifts = await this.shiftDAO.getAllShifts(companyId);

      return shifts;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch shifts";

      throw new Error(message);
    }
  }

  /*  Delete Shift  */
  public async deleteShift(
    id: string,
    companyId: string,
  ): Promise<ShiftData | null> {
    try {
      ShiftIdSchema.parse(id);

      const deletedShift = await this.shiftDAO.deleteShift(id, companyId);

      if (!deletedShift) {
        const error = new Error("Shift not found");
        (error as any).statusCode = 404;
        throw error;
      }

      return deletedShift;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete shift";

      throw new Error(message);
    }
  }
}
