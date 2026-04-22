import { z } from "zod";

export const DesignationSchema = z.object({
  data: z.object({
    name: z.string().min(1, "Designation name is required"),
    sortHand: z.string().optional(),
    level: z.number().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }),
  meta: z.object({
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    version: z.number(),
    isDeleted: z.boolean(),
  }),
});

export const DesignationIdSchema = z.string().min(1, "ID is required");

export const DesignationNameSchema = z.string().min(1, "Name is required");

export const UpdateDesignationSchema = z.object({
  name: z.string().min(1, "Designation name is required").optional(),
  sortHand: z.string().optional(),
  level: z.number().optional(),
});

export type DesignationSchemaType = z.infer<typeof DesignationSchema>;
export type UpdateDesignationSchemaType = z.infer<
  typeof UpdateDesignationSchema
>;
