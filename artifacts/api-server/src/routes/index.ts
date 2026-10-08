import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import patientsRouter from "./patients";
import invitationsRouter from "./invitations";
import directorRouter from "./director";
import clinicUsersRouter from "./clinic-users";
import clinicProtocolRouter from "./clinic-protocol";
import leadPhasesRouter from "./lead-phases";
import diagnosisRouter from "./diagnosis";
import resultsRouter from "./results";
import portalRouter from "./portal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(leadsRouter);
router.use(patientsRouter);
router.use(invitationsRouter);
router.use(directorRouter);
router.use(clinicUsersRouter);
router.use(clinicProtocolRouter);
router.use(leadPhasesRouter);
router.use(diagnosisRouter);
router.use(resultsRouter);
router.use(portalRouter);

export default router;
