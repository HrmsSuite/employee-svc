// src/routes/salary-component.routes.ts

import { Router } from "express";
import { SalaryComponentController } from "../controller";
import { authenticate } from "@hrmssuite/persistence";

const router = Router();
const controller = new SalaryComponentController();

router.post("/salary-components", authenticate, (req, res, next) =>
  controller.createSalaryComponent(req, res, next),
);

router.get("/salary-components", authenticate, (req, res, next) =>
  controller.getAllSalaryComponents(req, res, next),
);

router.get("/salary-components/:componentId", authenticate, (req, res, next) =>
  controller.getSalaryComponentById(req, res, next),
);

router.put("/salary-components/:componentId", authenticate, (req, res, next) =>
  controller.updateSalaryComponent(req, res, next),
);

router.delete(
  "/salary-components/:componentId",
  authenticate,
  (req, res, next) => controller.deleteSalaryComponent(req, res, next),
);

export default router;
