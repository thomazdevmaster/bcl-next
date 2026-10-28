import { z } from "zod";

import { instrumentsCrudFormSchema } from "@/domains/instruments/schemas/crud-form.schema";
import { patrimonyCrudFormSchema } from "@/domains/patrimony/schemas/crud-form.schema";
import { peopleCrudFormSchema } from "@/domains/people/schemas/crud-form.schema";
import { presentationsCrudFormSchema } from "@/domains/presentations/schemas/crud-form.schema";
import { songsCrudFormSchema } from "@/domains/songs/schemas/crud-form.schema";

export const domainCrudFormSchema = z.discriminatedUnion("resource", [
  peopleCrudFormSchema,
  songsCrudFormSchema,
  patrimonyCrudFormSchema,
  instrumentsCrudFormSchema,
  presentationsCrudFormSchema,
]);

export type DomainCrudFormValues = z.infer<typeof domainCrudFormSchema>;
