import { Router } from "express";
import departmentRoute from "./department.route.js";
import designationRoute from "./designation.route.js";
import employeeRoute from "./designation.route.js"

const router = Router();
 
const apiPath = "/api/v1";

// department & designation routes
router.use(`${apiPath}/department`, departmentRoute);
router.use(`${apiPath}/designation`, designationRoute);
router.use(`${apiPath}/employee`, employeeRoute);
export default router;