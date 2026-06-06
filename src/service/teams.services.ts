import { Types } from "mongoose";
import { TeamsDao } from "../Dao";
import { TeamFilters } from "../typings/teams.typings";

export class TeamsServices {
  private teamsDAO: TeamsDao;

  constructor() {
    this.teamsDAO = new TeamsDao();
  }

  // TeamsServices
  public async getAllTeams(companyId: string, query?: any) {
    const filters: TeamFilters = {};

    if (query?.departmentIds) {
      filters.departmentIds = String(query.departmentIds)
        .split(",")
        .map((id) => id.trim());
    }

    if (query?.reportingManagerIds) {
      filters.reportingManagerIds = String(query.reportingManagerIds)
        .split(",")
        .map((id) => id.trim());
    }

    if (query?.memberIds) {
      filters.memberIds = String(query.memberIds)
        .split(",")
        .map((id) => id.trim());
    }

    if (query?.search) {
      filters.search = query.search;
    }

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

  public async getMyTeam(employeeId: string, companyId: string) {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new Error("Invalid employee id");
    }

    // First check if they are a reporting manager
    const teamAsManager = await this.teamsDAO.getTeamByTL(
      new Types.ObjectId(employeeId),
      new Types.ObjectId(companyId),
    );

    if (teamAsManager) return teamAsManager;

    // Otherwise check if they are a member
    const teamAsMember = await this.teamsDAO.getTeamsByEmployee(
      new Types.ObjectId(employeeId),
      new Types.ObjectId(companyId),
    );

    if (!teamAsMember) {
      throw new Error("Team not found");
    }

    return teamAsMember;
  }
}
