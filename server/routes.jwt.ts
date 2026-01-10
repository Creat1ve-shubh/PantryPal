import type { Express } from "express";
import {
  signup,
  login,
  refresh,
  logout,
  orgInvite,
  inviteAccept,
  listPendingInvites,
  withdrawInvite,
  loginLimiter,
  refreshLimiter,
} from "./controllers/authController";
import { auth, loadPermissions, can } from "./middleware/jwtAuth";
import { listRoles } from "./controllers/rbacController";

export function registerJwtRoutes(app: Express) {
  // Auth endpoints
  app.post("/api/auth/signup", loginLimiter, signup);
  app.post("/api/auth/login", loginLimiter, login);
  app.post("/api/auth/refresh", refreshLimiter, refresh);
  app.post("/api/auth/logout", auth(), logout);

  // Organization invite flow
  app.post(
    "/api/org/invite",
    auth(),
    loadPermissions(),
    can("users:manage"),
    orgInvite
  );
  app.post("/api/invite/accept", inviteAccept);
  app.get(
    "/api/org/invites/pending",
    auth(),
    loadPermissions(),
    can("users:manage"),
    listPendingInvites
  );
  app.delete(
    "/api/org/invites/:id",
    auth(),
    loadPermissions(),
    can("users:manage"),
    withdrawInvite
  );

  // RBAC helpers
  app.get(
    "/api/rbac/roles",
    auth(),
    loadPermissions(),
    can("roles:assign"),
    listRoles
  );
}
