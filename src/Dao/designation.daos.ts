import { Designations, DesignationsData, DesignationModel } from "@hrmssuite/persistence";

export class DesignationDAO {
  public async createDesignantionDao(data: Designations, companyId: string): Promise<Designations> {
    try {
      const createDesignate = await DesignationModel.create({ ...data, companyId });
      return createDesignate;
    } catch (error) {
      throw error;
    }
  }

  public async findAllDesignation(companyId: string): Promise<Designations[]> {
    try {
      const allData = await DesignationModel.find({
        companyId,
        "meta.isDeleted": false,
      }).sort({ "data.level": 1 });
      return allData;
    } catch (error) {
      throw error;
    }
  }

  public async findDesignate(id: string, companyId: string): Promise<Designations | null> {
    try {
      const findData = await DesignationModel.findOne({
        _id: id,
        companyId,
        "meta.isDeleted": false,
      });
      return findData;
    } catch (error) {
      throw error;
    }
  }

  public async findByName(name: string, companyId: string): Promise<Designations | null> {
    try {
      const findData = await DesignationModel.findOne({
        "data.name": name,
        companyId,
        "meta.isDeleted": false,
      });
      return findData;
    } catch (error) {
      throw error;
    }
  }

 public async updateDesignationDao(
  id: string,
  data: Partial<DesignationsData>,
  companyId: string,
): Promise<Designations | null> {
  try {
    const setFields: Record<string, any> = {};
    if (data.name !== undefined) setFields["data.name"] = data.name;
    if (data.sortHand !== undefined) setFields["data.sortHand"] = data.sortHand;
    if (data.level !== undefined) setFields["data.level"] = data.level;
    setFields["meta.updatedAt"] = new Date();

    const updateData = await DesignationModel.findOneAndUpdate(
      { _id: id, companyId, "meta.isDeleted": false },
      { $set: setFields },
      { new: true, runValidators: false }, 
    );
    return updateData;
  } catch (error) {
    throw error;
  }
}

  public async softDelete(id: string, companyId: string): Promise<void> {
    try {
      const designation = await DesignationModel.findOne({
        _id: id,
        companyId,
        "meta.isDeleted": false,
      });
      if (!designation) throw new Error("Designation not found or already deleted");
      await DesignationModel.findOneAndUpdate(
        { _id: id, companyId },
        { $set: { "meta.isDeleted": true } },
      );
    } catch (error) {
      throw error;
    }
  }
}