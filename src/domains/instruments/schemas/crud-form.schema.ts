import { z } from "zod";

export const instrumentsCrudFormSchema = z
  .object({
    resource: z.literal("instruments"),
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().trim().min(1, "Informe o nome do instrumento."),
    family: z.string().min(1, "Selecione a família do instrumento."),
    subclass: z.string(),
    tuning: z.string(),
    signalType: z.string().min(1, "Selecione o tipo de sinal."),
    tessitura: z.string(),
    tags: z.string(),
    status: z.enum(["", "active", "inactive"]),
  })
  .superRefine((values, context) => {
    if (!values.status) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Selecione o status do instrumento.",
      });
    }
  });

export type InstrumentsCrudFormValues = z.infer<
  typeof instrumentsCrudFormSchema
>;
