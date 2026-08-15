import { Router } from "express";
import multer from "multer";
import { EmployeeBulkUploadController } from "../controller";
import { BulkUploadController } from "../controller/bulk-upload.controller";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
const uploadController = new EmployeeBulkUploadController();
const downloadController = new BulkUploadController();

// Download template
router.get("/employees/bulk/template", (req, res, next) =>
  downloadController.downloadTemplate(req, res, next),
);

// Upload filled template
router.post(
  "/employees/bulk/upload",
  upload.single("file"), // field name "file"
  (req, res, next) => uploadController.upload(req, res, next),
);

export default router;
