// src/common/validators/employee-salary.validator.ts

import { z } from "zod";

export const SalaryCalculationBaseSchema = z.enum([
  "BASIC",
  "GROSS",
  "CTC",
  "NET",
  "COMPONENT",
  "CUSTOM",
]);

export const SalaryPayFrequencySchema = z.enum([
  "MONTHLY",
  "WEEKLY",
  "BI_WEEKLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
]);

export const EmployeeSalaryStatusSchema = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
  "CANCELLED",
  "ARCHIVED",
]);

export const EmployeeSalarySourceSchema = z.enum([
  "STRUCTURE",
  "CUSTOM",
  "PROMOTION",
  "REVISION",
  "TRANSFER",
  "JOINING",
  "ADJUSTMENT",
  "SYSTEM",
]);

export const EmployeeSalaryComponentInputSchema = z.object({
  componentId: z.string().min(1, "Component ID is required"),
  amount: z.number().min(0, "Component amount cannot be negative"),
  percentage: z
    .number()
    .min(0, "Percentage cannot be negative")
    .max(100, "Percentage cannot exceed 100")
    .optional(),
  calculationBase: SalaryCalculationBaseSchema.optional(),
  isOverridden: z.boolean().default(false),
  overrideReason: z.string().trim().optional(),
  displayOrder: z.number().int().min(0).default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const EmployeeSalaryTotalsInputSchema = z.object({
  gross: z.number().min(0),
  totalDeductions: z.number().min(0),
  totalEmployerContributions: z.number().min(0).default(0),
  ctc: z.number().min(0),
  net: z.number().min(0),
});

export const CreateEmployeeSalarySchema = z.object({
  salaryStructureId: z
    .string()
    .min(1, "Salary structure ID is required")
    .optional(),
  salaryStructureVersion: z.number().int().min(1).optional(),
  components: z
    .array(EmployeeSalaryComponentInputSchema)
    .min(1, "At least one salary component is required"),
  currency: z
    .string()
    .trim()
    .min(1, "Currency is required")
    .transform((val) => val.toUpperCase())
    .default("INR"),
  totals: EmployeeSalaryTotalsInputSchema,
  payFrequency: SalaryPayFrequencySchema,
  effectiveFrom: z.coerce.date(),
  effectiveTo: z
    .preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce.date().optional(),
    )
    .optional(),
  source: EmployeeSalarySourceSchema,
  revisionNumber: z.number().int().min(1).default(1),
  status: EmployeeSalaryStatusSchema.default("DRAFT"),
  revisionReason: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update schema:
 * - Disallow `status` and `revisionNumber` entirely.
 * - Everything else is optional.
 */
export const UpdateEmployeeSalarySchema = CreateEmployeeSalarySchema.omit({
  status: true,
  revisionNumber: true,
}).partial();

export const EmployeeSalaryIdSchema = z
  .string()
  .min(1, "Employee salary ID is required");

export const EmployeeSalaryEmployeeIdSchema = z
  .string()
  .min(1, "Employee ID is required");

export type CreateEmployeeSalarySchemaType = z.infer<
  typeof CreateEmployeeSalarySchema
>;

export type UpdateEmployeeSalarySchemaType = z.infer<
  typeof UpdateEmployeeSalarySchema
>;
