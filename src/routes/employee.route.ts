import { Router } from "express";
import { EmployeeController } from "../controller/employee.controller";
import { BulkUploadController } from "../controller/bulk-upload.controller";
import { authenticate } from "@hrmssuite/persistence";
import { uploadToS3 } from "../helpers/s3-upload";
import multer from "multer";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../common/config/S3-upload";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();
const employeeController = new EmployeeController();
const bulkUploadController = new BulkUploadController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB — supports large bulk upload files
  },
});
//upload file
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No file provided" });
        return;
      }
      const companyId = req.companyId as string;
      const key = await uploadToS3(req.file, `employee-documents/${companyId}`);
      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        data: { key },
      });
    } catch (error) {
      next(error);
    }
  },
);
router.get("/media/:folder/:filename", authenticate, async (req, res) => {
  try {
    const { folder, filename } = req.params;
    const companyId = req.companyId as string;

    if (!folder || !filename || folder !== `employee-documents/${companyId}`) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this file" });
    }

    const key = `${folder}/${filename}`;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, {
      expiresIn: 300,
    });

    return res.json({ url });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate URL" });
  }
});
// ── Bulk upload routes (must be before /:id to avoid route conflicts) ────────

// GET /employees/bulk/template — download the pre-filled Excel template
router.get("/bulk/template", authenticate, (req, res, next) =>
  bulkUploadController.downloadTemplate(req, res, next),
);

// ─────────────────────────────────────────────────────────────────────────────

// create single employee
router.post("/", authenticate, (req, res, next) =>
  employeeController.createEmployee(req, res, next),
);

// find all
router.get("/", authenticate, (req, res, next) =>
  employeeController.findAll(req, res, next),
);

// find by email — before /:id to avoid conflict
router.get("/email/:email", authenticate, (req, res, next) =>
  employeeController.findByEmail(req, res, next),
);

// find by employeeId — before /:id to avoid conflict
router.get("/employeeId/:employeeId", authenticate, (req, res, next) =>
  employeeController.findByEmployeeId(req, res, next),
);

// find by mongo id
router.get("/:id", authenticate, (req, res, next) =>
  employeeController.findById(req, res, next),
);

// update employee
router.patch("/:id", authenticate, (req, res, next) =>
  employeeController.updateEmployee(req, res, next),
);

// soft delete
router.delete("/:id", authenticate, (req, res, next) =>
  employeeController.softDelete(req, res, next),
);

export default router;
