import {
  DesignationModel,
  Designations,
  DesignationsData,
} from "@hrmssuite/persistence";

export class designationDAO {
  public async createDesignantionDao(
    data: DesignationsData,
  ): Promise<Designations> {
    try {
      const createDesignate = await DesignationModel.create({ data });
      return createDesignate;
    } catch (error) {
      throw error;
    }
  }
  public async updateDesignationDao(
    id: string,
    data: Partial<DesignationsData>,
  ): Promise<Designations | null> {
    try {
      const update_Designate = await DesignationModel.findOneAndUpdate(
        { _id: id, "meta.isDeleted": false },
        { $set: { data: data } },
        { new: true, runValidators: true },
      );
      return update_Designate;
    } catch (error) {
      throw error;
    }
  }
  public async findDesignate(id: string): Promise<Designations | null> {
    try {
      const findData = await DesignationModel.findOne({
        _id: id,
        "meta.isDeleted": false,
      });
      return findData;
    } catch (error) {
      throw error;
    }
  }
  public async findAllDesignation(): Promise<Designations[] | []> {
    try {
      const Alldata = await DesignationModel.find({
        "meta.isDeleted": false,
      }).sort({ "data.level": 1 });
      return Alldata;
    } catch (error) {
      throw error;
    }
  }
  public async findByName(name: string): Promise<Designations | null> {
    try {
      const findData = await DesignationModel.findOne({
        "data.name": name,
        "meta.isDeleted": false,
      });
      return findData;
    } catch (error) {
      throw error;
    }
  }
  public async softDelete(id: string): Promise<void> {
    try {
      const designation = await DesignationModel.findOne({
        _id: id,
        "meta.isDeleted": false,
      });
      if (!designation)
        throw new Error("Designation not found or already deleted");
      await DesignationModel.findOneAndUpdate(
        { _id: id },
        { $set: { "meta.isDeleted": true } },
      );
    } catch (error) {
      throw error;
    }
  }
}
