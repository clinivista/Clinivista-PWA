import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import patientsRouter from "./patients";
import invitationsRouter from "./invitations";
import directorRouter from "./director";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(leadsRouter);
router.use(patientsRouter);
router.use(invitationsRouter);
router.use(directorRouter);

export default router;
