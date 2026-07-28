import { EmployeeModel } from "@hrmssuite/persistence";

export class HierarchyDao {
  public async findDirectReports(companyId: string, managerIds: string[]) {
    return EmployeeModel.find({
      companyId,
      "data.job.reportingManagerId": {
        $in: managerIds,
      },
    }).select("_id");
  }
}

export const hierarchyDao = new HierarchyDao();
