import { hierarchyDao } from "../Dao";

export class HierarchyService {
  constructor(private readonly dao = hierarchyDao) {}

  /**
   * Returns all direct + indirect reports
   */
  public async getAllReports(
    companyId: string,
    employeeId: string,
  ): Promise<string[]> {
    const employeeIds: string[] = [];

    let currentManagers = [employeeId];

    while (currentManagers.length) {
      const reports = await this.dao.findDirectReports(
        companyId,
        currentManagers,
      );

      const next = reports.map((x) => x._id.toString());

      if (!next.length) break;

      employeeIds.push(...next);

      currentManagers = next;
    }

    return employeeIds;
  }
  public async getVisibleEmployeeIds(
  companyId: string,
  employeeId: string,
  isAdmin: boolean,
): Promise<string[]> {
  if (isAdmin) {
    const employees = await this.dao.findAllEmployeeIds(companyId);
    return employees.map((e) => e._id.toString());
  }

  const reports = await this.getAllReports(companyId, employeeId);

  return [employeeId, ...reports];
}
}

export const hierarchyService = new HierarchyService();
