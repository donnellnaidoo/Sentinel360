import { publicProcedure, router } from "../index";
import { alertsRouter } from "./alerts";
import { auditRouter } from "./audit";
import { casesRouter } from "./cases";
import { evidenceRouter } from "./evidence";
import { organizationsRouter } from "./organizations";
import { profilesRouter } from "./profiles";
import { rolesRouter } from "./roles";
import { settingsRouter } from "./settings";
import { sightingsRouter } from "./sightings";
import { usersRouter } from "./users";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  users: usersRouter,
  roles: rolesRouter,
  organizations: organizationsRouter,
  cases: casesRouter,
  evidence: evidenceRouter,
  profiles: profilesRouter,
  sightings: sightingsRouter,
  alerts: alertsRouter,
  audit: auditRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
