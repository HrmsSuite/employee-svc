import { Router } from "express";
import { authenticate } from "@hrmssuite/persistence";
import { ShiftController } from "../controller/shift.controller.js";

const router = Router();
const shiftController = new ShiftController();

/*  Create Shift  */
router.post("/", authenticate, (req, res, next) =>
  shiftController.createShift(req, res, next),
);

/*  Get All Shifts  */
router.get("/", authenticate, (req, res, next) =>
  shiftController.getAllShifts(req, res, next),
);

/*  Get Shift By Id  */
router.get("/:id", authenticate, (req, res, next) =>
  shiftController.getShiftById(req, res, next),
);

/*  Update Shift  */
router.put("/:id", authenticate, (req, res, next) =>
  shiftController.updateShift(req, res, next),
);

/*  Delete Shift  */
router.delete("/:id", authenticate, (req, res, next) =>
  shiftController.deleteShift(req, res, next),
);

export default router;
