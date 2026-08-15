// src/routes/salary-structure.routes.ts

import { Router } from "express";
import { SalaryStructureController } from "../controller";
import { authenticate } from "@hrmssuite/persistence";

const router = Router();
const controller = new SalaryStructureController();

router.post("/salary-structures", authenticate, (req, res, next) =>
  controller.createSalaryStructure(req, res, next),
);

router.get("/salary-structures", authenticate, (req, res, next) =>
  controller.getAllSalaryStructures(req, res, next),
);

router.get("/salary-structures/:structureId", authenticate, (req, res, next) =>
  controller.getSalaryStructureById(req, res, next),
);

router.put("/salary-structures/:structureId", authenticate, (req, res, next) =>
  controller.updateSalaryStructure(req, res, next),
);

router.patch(
  "/salary-structures/:structureId/status",
  authenticate,
  (req, res, next) => controller.changeSalaryStructureStatus(req, res, next),
);

router.delete(
  "/salary-structures/:structureId",
  authenticate,
  (req, res, next) => controller.deleteSalaryStructure(req, res, next),
);

export default router;
