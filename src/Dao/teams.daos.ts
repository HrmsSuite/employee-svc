import { TeamModel } from "@hrmssuite/persistence";
import { Types } from "mongoose";
import { TeamFilters } from "../typings/teams.typings";

export class TeamsDao {
  private buildMatch(companyId: Types.ObjectId, filters?: TeamFilters) {
    const match: any = {
      companyId,
      "meta.isDeleted": false,
    };

    if (filters?.departmentIds?.length) {
      match.departmentId = {
        $in: filters.departmentIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (filters?.reportingManagerIds?.length) {
      match.reportingManagerId = {
        $in: filters.reportingManagerIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (filters?.memberIds?.length) {
      match.memberIds = {
        $in: filters.memberIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (filters?.search?.trim()) {
      match.name = {
        $regex: filters.search.trim(),
        $options: "i",
      };
    }

    return match;
  }

  private getTeamLookupPipeline() {
    return [
      {
        $lookup: {
          from: "employees",
          localField: "reportingManagerId",
          foreignField: "_id",
          as: "manager",
        },
      },
      {
        $unwind: {
          path: "$manager",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "employees",
          localField: "memberIds",
          foreignField: "_id",
          as: "members",
        },
      },

      {
        $project: {
          _id: 1,
          companyId: 1,
          name: 1,
          chatChannelId: 1,
          meta: 1,

          memberCount: {
            $size: "$memberIds",
          },

          department: {
            _id: "$department._id",
            name: "$department.name",
          },

          manager: {
            _id: "$manager._id",
            employeeId: "$manager.data.basic.employeeId",
            firstName: "$manager.data.basic.firstName",
            lastName: "$manager.data.basic.lastName",
            email: "$manager.data.basic.email",
          },

          members: {
            $map: {
              input: "$members",
              as: "member",
              in: {
                _id: "$$member._id",
                employeeId: "$$member.data.basic.employeeId",
                firstName: "$$member.data.basic.firstName",
                lastName: "$$member.data.basic.lastName",
                email: "$$member.data.basic.email",
              },
            },
          },
        },
      },
    ];
  }

  public async getAllTeams(companyId: Types.ObjectId, filters?: TeamFilters) {
    return TeamModel.aggregate([
      {
        $match: this.buildMatch(companyId, filters),
      },
      ...this.getTeamLookupPipeline(),
      {
        $sort: {
          name: 1,
        },
      },
    ]);
  }

  public async getTeamByTL(
    reportingManagerId: Types.ObjectId,
    companyId: Types.ObjectId,
  ) {
    const result = await TeamModel.aggregate([
      {
        $match: {
          companyId,
          reportingManagerId,
          "meta.isDeleted": false,
        },
      },
      ...this.getTeamLookupPipeline(),
      {
        $limit: 1,
      },
    ]);

    return result[0] ?? null;
  }

  public async getTeamsByEmployee(
    employeeId: Types.ObjectId,
    companyId: Types.ObjectId,
  ) {
    const result = await TeamModel.aggregate([
      {
        $match: {
          companyId,
          memberIds: employeeId,
          "meta.isDeleted": false,
        },
      },
      ...this.getTeamLookupPipeline(),
      {
        $limit: 1,
      },
    ]);

    return result[0] ?? null;
  }

  public async getTeamById(teamId: Types.ObjectId, companyId: Types.ObjectId) {
    const result = await TeamModel.aggregate([
      {
        $match: {
          _id: teamId,
          companyId,
          "meta.isDeleted": false,
        },
      },
      ...this.getTeamLookupPipeline(),
      {
        $limit: 1,
      },
    ]);

    return result[0] ?? null;
  }
}
