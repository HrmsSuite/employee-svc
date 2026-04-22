import { Router } from "express";
import { DesignationController } from "../controller/designation.controller";
import { authenticate, authorizeRoles } from "@hrmssuite/persistence";

const router = Router();
const designationController = new DesignationController();

router.post(
  "/",
  authenticate,
  
  (req, res, next) => designationController.createDesignate(req, res, next),
);

router.get(
  "/",
  authenticate,
  
  (req, res, next) => designationController.findAll(req, res, next),
);

router.get(
  "/name/:name",
  authenticate,
  
  (req, res, next) => designationController.findByName(req, res, next),
);

router.get(
  "/:id",
  authenticate,
  
  (req, res, next) => designationController.findDesignate(req, res, next),
);

router.patch(
  "/:id",
  authenticate,
  
  (req, res, next) => designationController.updateDesignate(req, res, next),
);

router.delete(
  "/:id",
  authenticate,
  
  (req, res, next) => designationController.softDelete(req, res, next),
);

export default router;