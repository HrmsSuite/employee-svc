import {
  Department,
  DepartmentData,
  DepartmentModel,
} from "@hrmssuite/persistence";

export class DepartmentDAO {
  public async createDepartmentDao(data: DepartmentData): Promise<Department> {
    try {
      const createDepartment = await DepartmentModel.create({ data });
      return createDepartment;
    } catch (error) {
      throw error;
    }
  }

  public async findAllDepartment(): Promise<Department[]> {
    try {
      const findDept = await DepartmentModel.find({
        "meta.isDeleted": false,
      }).populate("data.designation");
      return findDept;
    } catch (error) {
      throw error;
    }
  }

  public async findById(id: string): Promise<Department | null> {
    try {
      const data = await DepartmentModel.findOne({
        _id: id,
        "meta.isDeleted": false,
      }).populate("data.designation");
      return data;
    } catch (error) {
      throw error;
    }
  }

  public async updateDepartment(
    id: string,
    data: Partial<DepartmentData>,
  ): Promise<Department | null> {
    try {
      const updateData = await DepartmentModel.findOneAndUpdate(
        { _id: id, "meta.isDeleted": false },
        { $set: { data: data } },
        { new: true, runValidators: true },
      );
      return updateData;
    } catch (error) {
      throw error;
    }
  }

  public async findByName(name: string): Promise<Department | null> {
    try {
      const findName = await DepartmentModel.findOne({
        "data.name": name,
        "meta.isDeleted": false,
      });
      return findName;
    } catch (error) {
      throw error;
    }
  }

  public async softDelete(id: string): Promise<void> {
    try {
      const department = await DepartmentModel.findOne({
        _id: id,
        "meta.isDeleted": false,
      });
      if (!department)
        throw new Error("Department not found or already deleted");
      await DepartmentModel.findOneAndUpdate(
        { _id: id },
        { $set: { "meta.isDeleted": true } },
      );
    } catch (error) {
      throw error;
    }
  }
}
