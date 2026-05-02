import { Router } from "express";
import { EmployeeController } from "../controller/employee.controller";
import { authenticate } from "@hrmssuite/persistence";
import { uploadToS3 } from "../helpers/s3-upload";
import multer from "multer";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../common/config/S3-upload";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();
const employeeController = new EmployeeController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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
      const key  = await uploadToS3(req.file, "employee-documents");
      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        data: { key  },
      });
    } catch (error) {
      next(error);
    }
  },
);
router.get("/media/:folder/:filename", authenticate, async (req, res) => {
  try {
    const { folder, filename } = req.params;

    if (!folder || !filename) {
      return res.status(400).json({ message: "Invalid key" });
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
// create
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

// find by filters — before /:id to avoid conflict
router.get("/filters", authenticate, (req, res, next) =>
  employeeController.findByFilters(req, res, next),
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
