import {
  Department,
  DepartmentData,
  DepartmentModel,
} from "@hrmssuite/persistence";

export class DepartmentDAO {
  public async createDepartmentDao(
    data: Department,
    companyId: string,
  ): Promise<Department> {
    try {
      const createDepartment = await DepartmentModel.create({
        ...data,
        companyId,
      });
      return createDepartment;
    } catch (error) {
      throw error;
    }
  }

  public async findAllDepartment(companyId: string): Promise<Department[]> {
    try {
      const findDept = await DepartmentModel.find({
        companyId,
        "meta.isDeleted": false,
      }).populate("data.designation");
      return findDept;
    } catch (error) {
      throw error;
    }
  }

  public async findById(
    id: string,
    companyId: string,
  ): Promise<Department | null> {
    try {
      const data = await DepartmentModel.findOne({
        _id: id,
        companyId,
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
    companyId: string,
  ): Promise<Department | null> {
    try {
      const setFields: Record<string, any> = {};
      if (data.name !== undefined) setFields["data.name"] = data.name;
      if (data.designation !== undefined)
        setFields["data.designation"] = data.designation;
      setFields["meta.updatedAt"] = new Date();

      const updateData = await DepartmentModel.findOneAndUpdate(
        { _id: id, companyId, "meta.isDeleted": false },
        { $set: setFields },
        { new: true, runValidators: false }, // ✅
      ).populate("data.designation");;
      return updateData;
    } catch (error) {
      throw error;
    }
  }

  public async findByName(
    name: string,
    companyId: string,
  ): Promise<Department | null> {
    try {
      const findName = await DepartmentModel.findOne({
        "data.name": name,
        companyId,
        "meta.isDeleted": false,
      });
      return findName;
    } catch (error) {
      throw error;
    }
  }

  public async softDelete(id: string, companyId: string): Promise<void> {
    try {
      const department = await DepartmentModel.findOne({
        _id: id,
        companyId,
        "meta.isDeleted": false,
      });
      if (!department)
        throw new Error("Department not found or already deleted");
      await DepartmentModel.findOneAndUpdate(
        { _id: id, companyId },
        { $set: { "meta.isDeleted": true } },
      );
    } catch (error) {
      throw error;
    }
  }
}
