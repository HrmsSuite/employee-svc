import { ShiftData, ShiftModel } from "@hrmssuite/persistence";
import {
  CreateShiftSchemaType,
  UpdateShiftSchemaType,
} from "../common/validators/shiftData.validator";

export class ShiftDao {
  /*  Create  */
  public async createShift(data: CreateShiftSchemaType): Promise<ShiftData> {
    try {
      const createdShift = await ShiftModel.create(data);
      return createdShift;
    } catch (error) {
      throw error;
    }
  }

  /*  Update  */
  public async editShift(
    id: string,
    data: Partial<UpdateShiftSchemaType>,
    companyId: string,
  ): Promise<ShiftData | null> {
    try {
      const setFields: Record<string, any> = {};

      if (data.data !== undefined) {
        Object.entries(data.data).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.${key}`] = value;
          }
        });
      }

      if (data.meta !== undefined) {
        Object.entries(data.meta).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`meta.${key}`] = value;
          }
        });
      }

      const updatedShift = await ShiftModel.findOneAndUpdate(
        {
          _id: id,
          companyId,
          "meta.isDeleted": false,
        },
        {
          $set: setFields,
        },
        {
          new: true,
          runValidators: true,
        },
      );

      return updatedShift;
    } catch (error) {
      throw error;
    }
  }

  /*  Get By Id  */
  public async getShiftById(
    id: string,
    companyId: string,
  ): Promise<ShiftData | null> {
    try {
      const shift = await ShiftModel.findOne({
        _id: id,
        companyId,
        "meta.isDeleted": false,
      });

      return shift;
    } catch (error) {
      throw error;
    }
  }

  /*  Get All  */
  public async getAllShifts(companyId: string): Promise<ShiftData[]> {
    try {
      const shifts = await ShiftModel.find({
        companyId,
        "meta.isDeleted": false,
      }).sort({ createdAt: -1 });

      return shifts;
    } catch (error) {
      throw error;
    }
  }

  /*  Soft Delete  */
  public async deleteShift(
    id: string,
    companyId: string,
  ): Promise<ShiftData | null> {
    try {
      const deletedShift = await ShiftModel.findOneAndUpdate(
        {
          _id: id,
          companyId,
          "meta.isDeleted": false,
        },
        {
          $set: {
            "meta.isDeleted": true,
          },
        },
        {
          new: true,
        },
      );

      return deletedShift;
    } catch (error) {
      throw error;
    }
  }
}
