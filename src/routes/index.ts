import { Router } from "express";
import departmentRoute from "./department.route.js";
import designationRoute from "./designation.route.js";
import employeeRoute from "./employee.route.js";
import shiftRoute from "./shift.route.js";
import teamsRoute from "./teams.routes.js";

const router = Router();

const apiPath = "/api/v1";

// department & designation routes
router.use(`${apiPath}/department`, departmentRoute);
router.use(`${apiPath}/designation`, designationRoute);
router.use(`${apiPath}/employees`, employeeRoute);
router.use(`${apiPath}/shift`, shiftRoute);
router.use(`${apiPath}/teams`, teamsRoute);
export default router;
