import {
  Address,
  BankDetails,
  Compensation,
  Employee,
  EmployeeData,
  EmployeeModel,
  LegalDetails,
} from "@hrmssuite/persistence";

export class EmployeeDAO {
  public async createEmployee(
    data: EmployeeData,
    companyId: string,
  ): Promise<Employee> {
    try {
      const employee = await EmployeeModel.create({ data, companyId });
      return employee;
    } catch (error) {
      throw error;
    }
  }

  public async findById(
    id: string,
    companyId: string,
  ): Promise<Employee | null> {
    try {
      const employee = await EmployeeModel.findOne({
        _id: id,
        companyId,
        "meta.isDeleted": false,
      })
        .populate("data.job.designation")
        .populate("data.job.department")
        .populate("data.job.reportingManagerId");
      return employee;
    } catch (error) {
      throw error;
    }
  }

  public async findAll(companyId: string): Promise<Employee[]> {
    try {
      const employees = await EmployeeModel.find({
        companyId,
        "meta.isDeleted": false,
      })
        .populate("data.job.designation")
        .populate("data.job.department");
      return employees;
    } catch (error) {
      throw error;
    }
  }

  public async updateEmployee(
    id: string,
    data: Partial<EmployeeData>,
    companyId: string,
  ): Promise<Employee | null> {
    try {
      const setFields: Record<string, any> = {};
      if (data.basic !== undefined) setFields["data.basic"] = data.basic;
      if (data.job !== undefined) setFields["data.job"] = data.job;
      if (data.compensation !== undefined)
        setFields["data.compensation"] = data.compensation;
      if (data.address !== undefined) setFields["data.address"] = data.address;
      if (data.leave !== undefined) setFields["data.leave"] = data.leave;
      if (data.documents !== undefined)
        setFields["data.documents"] = data.documents;

      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, companyId, "meta.isDeleted": false },
        { $set: setFields },
        { new: true, runValidators: false },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async updateBankDetails(
    id: string,
    bank: Partial<BankDetails>,
    companyId: string,
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, companyId, "meta.isDeleted": false },
        { $set: { "data.bank": bank } },
        { new: true, runValidators: false },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async updateLegalDetails(
    id: string,
    data: Partial<LegalDetails>,
    companyId: string,
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, companyId, "meta.isDeleted": false },
        { $set: { "data.legal": data } },
        { new: true, runValidators: false },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async updateCompensation(
    id: string,
    compensation: Partial<Compensation>,
    companyId: string,
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, companyId, "meta.isDeleted": false },
        { $set: { "data.compensation": compensation } },
        { new: true, runValidators: false },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async updateAddress(
    id: string,
    address: Partial<Address>,
    companyId: string,
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, companyId, "meta.isDeleted": false },
        { $set: { "data.address": address } },
        { new: true, runValidators: false },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async softDelete(id: string, companyId: string): Promise<void> {
    try {
      const employee = await EmployeeModel.findOne({
        _id: id,
        companyId,
        "meta.isDeleted": false,
      });
      if (!employee) throw new Error("Employee not found or already deleted");
      await EmployeeModel.findOneAndUpdate(
        { _id: id, companyId },
        { $set: { "meta.isDeleted": true } },
      );
    } catch (error) {
      throw error;
    }
  }

  public async findByEmail(
    email: string,
    companyId: string,
  ): Promise<Employee | null> {
    try {
      const employee = await EmployeeModel.findOne({
        "data.basic.email": email,
        companyId,
        "meta.isDeleted": false,
      });
      return employee;
    } catch (error) {
      throw error;
    }
  }

  public async findByEmployeeId(
    employeeId: string,
    companyId: string,
  ): Promise<Employee | null> {
    try {
      const employee = await EmployeeModel.findOne({
        "data.basic.employeeId": employeeId,
        companyId,
        "meta.isDeleted": false,
      });
      return employee;
    } catch (error) {
      throw error;
    }
  }
}
