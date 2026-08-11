import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import patientsRouter from "./patients";
import invitationsRouter from "./invitations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(leadsRouter);
router.use(patientsRouter);
router.use(invitationsRouter);

export default router;
