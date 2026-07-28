import { Router } from "express";

import { authenticate } from "@hrmssuite/persistence";
import { internalEmployeeController } from "../controller";
 

const router = Router();

/**
 * Internal Employee Search
 *
 * Used only by node-auth after
 * resolving the employee's access scope.
 */
router.post(
  "/search",
  authenticate,
  (req, res, next) =>
    internalEmployeeController.searchEmployees(
      req,
      res,
      next,
    ),
);

export default router;