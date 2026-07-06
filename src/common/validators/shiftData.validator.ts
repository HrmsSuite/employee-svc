import { z } from "zod";

/*  Shift Data  */
export const ShiftInfoSchema = z.object({
  name: z.string().trim().min(1, "Shift name is required"),

  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),

endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),

  workingHours: z.number().min(0, "Working hours must be positive"),

  halfDayThreshold: z.number().min(0, "Half day threshold must be positive"),

  weeklyOff: z.array(z.string()).optional(),

  overtimeEligible: z.boolean().optional(),

  gracePeriodMinutes: z.number().min(0).optional(),
  
  overtimeAfterMinutes: z.number().min(0).optional(),

  isNightShift: z.boolean().optional(),

  breakDurationMinutes: z.number().min(0).optional(),

  isActive: z.boolean().optional(),
});

/*  Meta  */
export const ShiftMetaSchema = z.object({
  version: z.number().optional(),

  isDeleted: z.boolean().optional(),

  auditTrail: z.array(z.any()).optional(),
});

/*  Create Shift  */
export const CreateShiftSchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),

  data: ShiftInfoSchema,

  meta: ShiftMetaSchema.optional(),
});

/*  Update Shift  */
export const UpdateShiftSchema = z.object({
  data: ShiftInfoSchema.partial().optional(),

  meta: ShiftMetaSchema.partial().optional(),
});

/*  Params  */
export const ShiftIdSchema = z.string().min(1, "Shift ID is required");

/*  Types  */
export type ShiftInfoSchemaType = z.infer<typeof ShiftInfoSchema>;

export type CreateShiftSchemaType = z.infer<typeof CreateShiftSchema>;

export type UpdateShiftSchemaType = z.infer<typeof UpdateShiftSchema>;
