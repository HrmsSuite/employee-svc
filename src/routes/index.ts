import { Router } from "express";
import departmentRoute from "./department.route.js";
import designationRoute from "./designation.route.js";
import employeeRoute from "./employee.route.js";
import shiftRoute from "./shift.route.js";
import teamsRoute from "./teams.routes.js";
import hierarchyRoute from "./hierarchy.routes.js";
import salarycomponents from "./salary-component.routes.js";
import salarystructure from "./salary-structure.routes.js";
import employeesalary from "./employee-salary.routes.js";
import salaryauditlog from "./salaryAuditLog.routes.js";
import employeeBulkUploadRoutes from "./employee-bulk-upload.routes.js";

const router = Router();

const apiPath = "/api/v1";

// department & designation routes
router.use(`${apiPath}/department`, departmentRoute);
router.use(`${apiPath}/designation`, designationRoute);
router.use(`${apiPath}/employees`, employeeRoute);
router.use(`${apiPath}/shift`, shiftRoute);
router.use(`${apiPath}/teams`, teamsRoute);
router.use(`${apiPath}/internal/hierarchy`, hierarchyRoute);
router.use(`${apiPath}`, salarycomponents);
router.use(`${apiPath}`, salarystructure);
router.use(`${apiPath}`, employeesalary);
router.use(`${apiPath}`, salaryauditlog);
router.use(`${apiPath}`, employeeBulkUploadRoutes);
export default router;
