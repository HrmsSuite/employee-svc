import { Router } from "express";
import { EmployeeController } from "../controller/employee.controller";
import { authenticate } from "@hrmssuite/persistence";

const router = Router();
const employeeController = new EmployeeController();

// create
router.post(
  "/",
  authenticate,
  (req, res, next) => employeeController.createEmployee(req, res, next),
);

// find all
router.get(
  "/",
  authenticate,
  (req, res, next) => employeeController.findAll(req, res, next),
);

// find by email — before /:id to avoid conflict
router.get(
  "/email/:email",
  authenticate,
  (req, res, next) => employeeController.findByEmail(req, res, next),
);

// find by employeeId — before /:id to avoid conflict
router.get(
  "/employeeId/:employeeId",
  authenticate,
  (req, res, next) => employeeController.findByEmployeeId(req, res, next),
);

// find by filters — before /:id to avoid conflict
router.get(
  "/filters",
  authenticate,
  (req, res, next) => employeeController.findByFilters(req, res, next),
);

// find by mongo id
router.get(
  "/:id",
  authenticate,
  (req, res, next) => employeeController.findById(req, res, next),
);

// update employee
router.patch(
  "/:id",
  authenticate,
  (req, res, next) => employeeController.updateEmployee(req, res, next),
);

// update bank details
router.patch(
  "/:id/bank",
  authenticate,
  (req, res, next) => employeeController.updateBankDetails(req, res, next),
);

// update legal details
router.patch(
  "/:id/legal",
  authenticate,
  (req, res, next) => employeeController.updateLegalDetails(req, res, next),
);

// update compensation
router.patch(
  "/:id/compensation",
  authenticate,
  (req, res, next) => employeeController.updateCompensation(req, res, next),
);

// update address
router.patch(
  "/:id/address",
  authenticate,
  (req, res, next) => employeeController.updateAddress(req, res, next),
);

// soft delete
router.delete(
  "/:id",
  authenticate,
  (req, res, next) => employeeController.softDelete(req, res, next),
);

export default router;