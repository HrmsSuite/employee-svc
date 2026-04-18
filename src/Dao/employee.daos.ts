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
  public async createEmployee(data: EmployeeData): Promise<Employee> {
    try {
      const employee = await EmployeeModel.create({ data });
      return employee;
    } catch (error) {
      throw error;
    }
  }

  public async findById(id: string): Promise<Employee | null> {
    try {
      const employee = await EmployeeModel.findOne({
        _id: id,
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

  public async findAll(): Promise<Employee[]> {
    try {
      const employees = await EmployeeModel.find({ "meta.isDeleted": false })
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
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, "meta.isDeleted": false },
        { $set: { data: data } },
        { new: true, runValidators: true },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async updateBankDetails(
    id: string,
    bank: Partial<BankDetails>,
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, "meta.isDeleted": false },
        { $set: { "data.bank": bank } },
        { new: true, runValidators: true },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async updateLegalDetails(
    id: string,
    data: Partial<LegalDetails>,
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, "meta.isDeleted": false },
        { $set: { "data.legal": data } },
        { new: true, runValidators: true },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async updateCompensation(
    id: string,
    compensation: Partial<Compensation>,
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, "meta.isDeleted": false },
        { $set: { "data.compensation": compensation } },
        { new: true, runValidators: true },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async updateAddress(
    id: string,
    address: Partial<Address>,
  ): Promise<Employee | null> {
    try {
      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, "meta.isDeleted": false },
        { $set: { "data.address": address } },
        { new: true, runValidators: true },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async softDelete(id: string): Promise<void> {
    try {
      const employee = await EmployeeModel.findOne({
        _id: id,
        "meta.isDeleted": false,
      });
      if (!employee) throw new Error("Employee not found or already deleted");
      await EmployeeModel.findOneAndUpdate(
        { _id: id },
        { $set: { "meta.isDeleted": true } },
      );
    } catch (error) {
      throw error;
    }
  }

  public async findByEmail(email: string): Promise<Employee | null> {
    try {
      const employee = await EmployeeModel.findOne({
        "data.basic.email": email,
        "meta.isDeleted": false,
      });
      return employee;
    } catch (error) {
      throw error;
    }
  }

  public async findByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const employee = await EmployeeModel.findOne({
        "data.basic.employeeId": employeeId,
        "meta.isDeleted": false,
      });
      return employee;
    } catch (error) {
      throw error;
    }
  }
}
