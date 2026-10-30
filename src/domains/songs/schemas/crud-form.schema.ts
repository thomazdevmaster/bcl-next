import { z } from "zod";

import { youtubeVideoId } from "@/domains/songs/youtube";

export const songsCrudFormSchema = z
  .object({
    resource: z.literal("songs"),
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().trim().min(1, "Informe o título."),
    composer: z.string().trim().min(1, "Informe o compositor."),
    arranger: z.string(),
    genre: z.string(),
    key: z.string(),
    durationSeconds: z
      .string()
      .refine(
        (value) =>
          !value || (Number.isFinite(Number(value)) && Number(value) > 0),
        "Informe uma duração maior que zero.",
      ),
    scoreFile: z.string(),
    scoreFileName: z.string(),
    scoreMimeType: z.string(),
    status: z.enum(["", "active", "inactive"]),
    visibility: z.enum(["", "public", "private"]),
    visibleToStudents: z.boolean(),
    visibleToMusicians: z.boolean(),
    videoUrl: z
      .string()
      .trim()
      .refine(
        (value) => !value || youtubeVideoId(value) != null,
        "Informe um link válido do YouTube.",
      ),
  })
  .superRefine((values, context) => {
    if (!values.status) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Selecione o status da música.",
      });
    }
    if (!values.visibility) {
      context.addIssue({
        code: "custom",
        path: ["visibility"],
        message: "Selecione a visualização da música.",
      });
    }
    if (
      values.visibility === "private" &&
      !values.visibleToStudents &&
      !values.visibleToMusicians
    ) {
      context.addIssue({
        code: "custom",
        path: ["visibleToStudents"],
        message:
          "Selecione pelo menos um perfil para visualizar a música privada.",
      });
    }
  });

export type SongsCrudFormValues = z.infer<typeof songsCrudFormSchema>;
