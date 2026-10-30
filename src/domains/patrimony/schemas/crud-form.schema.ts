import { z } from "zod";

export const patrimonyCrudFormSchema = z
  .object({
    resource: z.literal("patrimony"),
    id: z.union([z.string(), z.number()]).optional(),
    code: z.string().trim().min(1, "Informe o código."),
    name: z.string().trim().min(1, "Informe o nome."),
    category: z.enum([
      "",
      "instrument",
      "uniform",
      "equipment",
      "furniture",
      "other",
    ]),
    acquisitionDate: z
      .string()
      .refine(
        (value) =>
          Boolean(value) &&
          !Number.isNaN(new Date(`${value}T00:00:00`).getTime()),
        "Informe uma data de aquisição válida.",
      ),
    acquisitionValue: z
      .string()
      .refine(
        (value) =>
          !value || (Number.isFinite(Number(value)) && Number(value) >= 0),
        "Informe um valor igual ou maior que zero.",
      ),
    status: z.enum(["", "available", "in_use", "maintenance", "retired"]),
    location: z.string(),
    notes: z.string(),
    assignedPersonId: z.string(),
    instrument__instrumentId: z.string(),
    instrument__serialNumber: z.string(),
    instrument__manufacturer: z.string(),
    instrument__model: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.category) {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "Selecione a categoria do item.",
      });
    }
    if (!values.status) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Selecione o estado do item.",
      });
    }
    if (values.category === "instrument" && !values.instrument__instrumentId) {
      context.addIssue({
        code: "custom",
        path: ["instrument__instrumentId"],
        message: "Selecione o instrumento do catálogo.",
      });
    }
  });

export type PatrimonyCrudFormValues = z.infer<typeof patrimonyCrudFormSchema>;
