import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resourcesRouter from "./resources";
import analysisRouter from "./analysis";
import dashboardRouter from "./dashboard";
import recommendationsRouter from "./recommendations";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resourcesRouter);
router.use(analysisRouter);
router.use(dashboardRouter);
router.use(recommendationsRouter);
router.use(reportsRouter);

export default router;
