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
}

export const hierarchyService = new HierarchyService();
