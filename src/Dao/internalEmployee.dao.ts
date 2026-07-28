import { ACCESS_SCOPES, AccessScopeResult, EmployeeModel } from "@hrmssuite/persistence";

 

export class InternalEmployeeDao {
  public async searchEmployees(
    companyId: string,
    accessScope: AccessScopeResult,
  ) {
    switch (accessScope.scope) {
      /**
       * Company-wide access
       */
      case ACCESS_SCOPES.ALL:
        return EmployeeModel.find({
          companyId,
          isDeleted: false,
        });

      /**
       * Self / Hierarchy access
       */
      case ACCESS_SCOPES.SELF:
      case ACCESS_SCOPES.HIERARCHY:
        return EmployeeModel.find({
          companyId,
          _id: {
            $in: accessScope.employeeIds ?? [],
          },
          isDeleted: false,
        });

      default:
        return [];
    }
  }
}

export const internalEmployeeDao =
  new InternalEmployeeDao();