import {
  ACCESS_SCOPES,
  AccessScopeResult,
  EmployeeModel,
} from "@hrmssuite/persistence";

export class InternalEmployeeDao {
  public async searchEmployees(
    companyId: string,
    accessScope: AccessScopeResult,
  ) {
    switch (accessScope.scope) {
      case ACCESS_SCOPES.ALL:
        return EmployeeModel.find({
          companyId,
          "meta.isDeleted": false,
        });

      case ACCESS_SCOPES.SELF:
      case ACCESS_SCOPES.HIERARCHY: {
        // 👇 Temporary debugging
        const employees = await EmployeeModel.find({
          companyId,
          _id: {
            $in: accessScope.employeeIds ?? [],
          },
        });

        console.log("CompanyId:", companyId);
        console.log("EmployeeIds:", accessScope.employeeIds);
        console.log("Employees Found:", employees.length);

        return employees;
      }

      default:
        return [];
    }
  }
}

export const internalEmployeeDao = new InternalEmployeeDao();
