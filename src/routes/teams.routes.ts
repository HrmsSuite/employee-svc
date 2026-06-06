import { Router } from "express";
import { authenticate } from "@hrmssuite/persistence";
import { TeamsController } from "../controller";

const router = Router();
const teamsController = new TeamsController();

/* Get All Teams */
router.get("/", authenticate, (req, res, next) =>
  teamsController.getTeams(req, res, next),
);

/* Get MyTeam  */
router.get("/my-team", authenticate, (req, res, next) =>
  teamsController.getMyTeam(req, res, next),
);

/* Get Team By Team Lead */
router.get("/manager/:reportingManagerId", authenticate, (req, res, next) =>
  teamsController.getTeamByTL(req, res, next),
);

/* Get Team By Employee */
router.get("/employee/:employeeId", authenticate, (req, res, next) =>
  teamsController.getTeamByEmployee(req, res, next),
);

/* Get Team By Id */
router.get("/:teamId", authenticate, (req, res, next) =>
  teamsController.getTeamById(req, res, next),
);

export default router;
