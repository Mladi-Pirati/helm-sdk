import type { z } from "zod";
import type {
  HelmUserSchema,
  HelmContactSchema,
  HelmContactTypeSchema,
  HelmMembershipSchema,
  HelmRoleSchema,
  HelmApplicationSchema,
} from "./user.schemas";

export type HelmUser = z.infer<typeof HelmUserSchema>;
export type HelmContact = z.infer<typeof HelmContactSchema>;
export type HelmContactType = z.infer<typeof HelmContactTypeSchema>;
export type HelmMembership = z.infer<typeof HelmMembershipSchema>;
export type HelmRole = z.infer<typeof HelmRoleSchema>;
export type HelmApplication = z.infer<typeof HelmApplicationSchema>;
