import { Router } from "express";
import { DepartmentController } from "../controller/department.controller";
import { authenticate, authorizeRoles } from "@hrmssuite/persistence";

const router = Router();
const departmentController = new DepartmentController();

router.post(
  "/",
  authenticate,
  
  (req, res, next) => departmentController.createDepartment(req, res, next),
);

router.get(
  "/",
  authenticate,
  
  (req, res, next) => departmentController.findAll(req, res, next),
);

router.get(
  "/name/:name",
  authenticate,
  
  (req, res, next) => departmentController.findByName(req, res, next),
);

router.get(
  "/:id",
  authenticate,
  
  (req, res, next) => departmentController.findByDepartment(req, res, next),
);

router.patch(
  "/:id",
  authenticate,
  
  (req, res, next) => departmentController.updateDepartment(req, res, next),
);

router.delete(
  "/:id",
  authenticate,
  
  (req, res, next) => departmentController.softDelete(req, res, next),
);

export default router;