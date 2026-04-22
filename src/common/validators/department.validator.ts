import { z } from "zod";

export const DepartmentSchema = z.object({
  data: z.object({
    name: z.string().min(1, "Department name is required"),
    designation: z.array(z.string()).min(1, "At least one designation is required"),
  }),
  meta: z.object({
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    version: z.number(),
    isDeleted: z.boolean(),
  }),
});

export const DepartmentIdSchema = z.string().min(1, "ID is required");

export const DepartmentNameSchema = z.string().min(1, "Name is required");

export const UpdateDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").optional(),
  designation: z.array(z.string()).min(1, "At least one designation is required").optional(),
});

export type DepartmentSchemaType = z.infer<typeof DepartmentSchema>;
export type UpdateDepartmentSchemaType = z.infer<typeof UpdateDepartmentSchema>;