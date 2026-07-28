import { AccessScopeResult } from "@hrmssuite/persistence"; 
import { internalEmployeeDao } from "../Dao";

export class InternalEmployeeService {
  constructor(
    private readonly dao = internalEmployeeDao,
  ) {}

  /**
   * Search employees based on resolved access scope.
   */
  public async searchEmployees(
    companyId: string,
    accessScope: AccessScopeResult,
  ) {
    return this.dao.searchEmployees(
      companyId,
      accessScope,
    );
  }
}

export const internalEmployeeService =
  new InternalEmployeeService();