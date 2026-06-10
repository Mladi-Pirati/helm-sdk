import { z } from "zod";

export const HelmContactTypeSchema = z.enum([
  "phone",
  "email",
  "instagram",
  "tiktok",
  "twitter",
  "discord",
  "website",
]);

export const HelmContactSchema = z.object({
  type: HelmContactTypeSchema,
  value: z.string(),
  label: z.string().nullable(),
  isPrimary: z.boolean(),
  sortOrder: z.number(),
});

export const HelmMembershipSchema = z.object({
  extendedAt: z.string(),
  expiresAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});

export const HelmRoleSchema = z.object({
  key: z.string(),
  name: z.string(),
});

export const HelmApplicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  keycloakClientId: z.string(),
});

export const HelmUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  contacts: z.array(HelmContactSchema).default([]),
  memberships: z.array(HelmMembershipSchema).default([]),
  roles: z.array(HelmRoleSchema).default([]),
  applications: z.array(HelmApplicationSchema).default([]),
});
