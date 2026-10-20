import { z } from "zod";

const roleCodes = ["amigos", "aluno", "musico", "maestro", "admin"] as const;

export const permissionsSchema = z.object({
  roles: z.array(z.string()).superRefine((roles, context) => {
    if (roles.some((role) => !roleCodes.includes(role as (typeof roleCodes)[number]))) {
      context.addIssue({ code: "custom", message: "Selecione apenas papéis disponíveis." });
    }
    if (new Set(roles).size !== roles.length) {
      context.addIssue({ code: "custom", message: "Remova papéis duplicados." });
    }
  }),
});

export type PermissionsFormValues = z.infer<typeof permissionsSchema>;
