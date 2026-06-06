import { Types } from "mongoose";
import { TeamsDao } from "../Dao";
import { TeamFilters } from "../typings/teams.typings";

export class TeamsServices {
  private teamsDAO: TeamsDao;

  constructor() {
    this.teamsDAO = new TeamsDao();
  }

  public async getAllTeams(companyId: string, filters?: TeamFilters) {
    return this.teamsDAO.getAllTeams(new Types.ObjectId(companyId), filters);
  }

  public async getTeamById(teamId: string, companyId: string) {
    if (!Types.ObjectId.isValid(teamId)) {
      throw new Error("Invalid team id");
    }

    const team = await this.teamsDAO.getTeamById(
      new Types.ObjectId(teamId),
      new Types.ObjectId(companyId),
    );

    if (!team) {
      throw new Error("Team not found");
    }

    return team;
  }

  public async getTeamByTL(reportingManagerId: string, companyId: string) {
    if (!Types.ObjectId.isValid(reportingManagerId)) {
      throw new Error("Invalid reporting manager id");
    }

    const team = await this.teamsDAO.getTeamByTL(
      new Types.ObjectId(reportingManagerId),
      new Types.ObjectId(companyId),
    );

    if (!team) {
      throw new Error("Team not found");
    }

    return team;
  }

  public async getTeamByEmployee(employeeId: string, companyId: string) {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new Error("Invalid employee id");
    }

    const team = await this.teamsDAO.getTeamsByEmployee(
      new Types.ObjectId(employeeId),
      new Types.ObjectId(companyId),
    );

    if (!team) {
      throw new Error("Team not found");
    }

    return team;
  }
}
