import {
  AuditEntry,
  Employee,
  EmployeeData,
  EmployeeModel,
} from "@hrmssuite/persistence";
import { EmployeeQueryFilters } from "../typings/employee.typings";
import { Types } from "mongoose";

export class EmployeeDAO {
  public async createEmployee(
    data: EmployeeData,
    companyId: string,
  ): Promise<Employee> {
    try {
      console.log("DAO received data:", JSON.stringify(data, null, 2)); // ← add this
      const employee = await EmployeeModel.create({
        data,
        companyId,

        meta: {
          version: 1,
          isDeleted: false,
          auditTrail: [
            {
              action: "created",
              changedAt: new Date(),
            },
          ],
        },
      });
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
        .populate("data.job.shiftId")
        .populate("data.job.reportingManagerId");
      return employee;
    } catch (error) {
      throw error;
    }
  }

  public async findByFilters(
    companyId: string,
    filters: EmployeeQueryFilters,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ employees: Employee[]; total: number; totalPages: number }> {
    try {
      const query: Record<string, any> = { companyId, "meta.isDeleted": false };

      if (filters.designation)
        query["data.job.designation"] = filters.designation;
      if (filters.department) query["data.job.department"] = filters.department;
      if (filters.employeeStatus)
        query["data.job.employmentStatus"] = filters.employeeStatus;
      if (filters.search) {
        const regex = new RegExp(filters.search, "i");
        query["$or"] = [
          { "data.basic.firstName": regex },
          { "data.basic.lastName": regex },
          { "data.basic.email": regex },
          { "data.basic.employeeId": regex },
        ];
      }

      const skip = (page - 1) * limit;

      const [employees, total] = await Promise.all([
        EmployeeModel.find(query)
          .populate("data.job.designation")
          .populate("data.job.department")
          .populate("data.job.shiftId")
          .populate("data.job.reportingManagerId")
          .skip(skip)
          .limit(limit),
        EmployeeModel.countDocuments(query),
      ]);

      return { employees, total, totalPages: Math.ceil(total / limit) };
    } catch (error) {
      throw error;
    }
  }

  public async findAll(
    companyId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ employees: Employee[]; total: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const [employees, total] = await Promise.all([
        EmployeeModel.find({ companyId, "meta.isDeleted": false })
          .populate("data.job.designation")
          .populate("data.job.department")
          .populate("data.job.shiftId")
          .populate("data.job.reportingManagerId")
          .skip(skip)
          .limit(limit),
        EmployeeModel.countDocuments({ companyId, "meta.isDeleted": false }),
      ]);

      return {
        employees,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  public async updateEmployee(
    id: string,
    data: Partial<EmployeeData>,
    companyId: string,
    changedBy?: string,
  ): Promise<Employee | null> {
    try {
      const setFields: Record<string, any> = {};
      if (data.basic !== undefined) {
        Object.entries(data.basic).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.basic.${key}`] = value;
          }
        });
      }

      if (data.job !== undefined) {
        Object.entries(data.job).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.job.${key}`] = value;
          }
        });
      }

      if (data.compensation !== undefined) {
        Object.entries(data.compensation).forEach(([key, value]) => {
          if (value !== undefined && key !== "salaryHistory") {
            setFields[`data.compensation.${key}`] = value;
          }
        });
      }

      if (data.address !== undefined) {
        Object.entries(data.address).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.address.${key}`] = value;
          }
        });
      }

      if (data.leave !== undefined) {
        Object.entries(data.leave).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.leave.${key}`] = value;
          }
        });
      }

      if (data.documents !== undefined) {
        setFields["data.documents"] = data.documents;
      }
      if (data.payroll !== undefined) {
        Object.entries(data.payroll).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.payroll.${key}`] = value;
          }
        });
      }

      // employee.daos.ts - updateEmployee function-ல இதை சேர்க்கவும்
      if (data.bank !== undefined) {
        Object.entries(data.bank).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.bank.${key}`] = value;
          }
        });
      }

      if (data.legal !== undefined) {
        Object.entries(data.legal).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.legal.${key}`] = value;
          }
        });
      }

      if (data.attendancePolicy !== undefined) {
        Object.entries(data.attendancePolicy).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.attendancePolicy.${key}`] = value;
          }
        });
      }

      if (data.tax !== undefined) {
        Object.entries(data.tax).forEach(([key, value]) => {
          if (value !== undefined) {
            setFields[`data.tax.${key}`] = value;
          }
        });
      }

      const auditEntry: AuditEntry = {
        action: "updated",
        changedBy: changedBy ? new Types.ObjectId(changedBy) : undefined,
        changedAt: new Date(),
      };

      const updatedEmployee = await EmployeeModel.findOneAndUpdate(
        { _id: id, companyId, "meta.isDeleted": false },
        { $set: setFields, $push: { "meta.auditTrail": auditEntry } },
        { new: true, runValidators: false },
      );
      return updatedEmployee;
    } catch (error) {
      throw error;
    }
  }

  public async softDelete(
    id: string,
    companyId: string,
    changedBy?: string,
  ): Promise<void> {
    try {
      const employee = await EmployeeModel.findOne({
        _id: id,
        companyId,
        "meta.isDeleted": false,
      });
      if (!employee) throw new Error("Employee not found or already deleted");
      await EmployeeModel.findOneAndUpdate(
        { _id: id, companyId },
        {
          $set: { "meta.isDeleted": true },
          $push: {
            "meta.auditTrail": {
              action: "deleted",
              changedBy: changedBy ? new Types.ObjectId(changedBy) : undefined,
              changedAt: new Date(),
            },
          },
        },
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
