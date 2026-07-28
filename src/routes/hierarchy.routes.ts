import { Router } from "express";
import { authenticate } from "@hrmssuite/persistence";

import { HierarchyController } from "../controller/hierarchy.controller";

const router = Router();

const hierarchyController = new HierarchyController();

/**
 * Get all direct + indirect reports
 */
router.get("/reports/:employeeId", authenticate, (req, res, next) =>
  hierarchyController.getReports(req, res, next),
);

export default router;
