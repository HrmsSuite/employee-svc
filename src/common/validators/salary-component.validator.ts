import { z } from "zod";
import { SalaryFormulaHelper } from "../../helpers/salary-formula.helper";

/**
 * These MUST stay aligned with:
 * - SalaryComponentType
 * - SalaryCalculationType
 * - SalaryCalculationBase
 * - SalaryComponentInclusion
 * - SalaryTaxability
 * - SalaryComponentStatus
 * (src/types/salaryComponent.types.ts)
 */

export const SalaryComponentTypeSchema = z.enum([
  "EARNING",
  "DEDUCTION",
  "REIMBURSEMENT",
  "BENEFIT",
  "CONTRIBUTION",
  "TAX",
]);

export const SalaryComponentCalculationTypeSchema = z.enum([
  "FIXED",
  "PERCENTAGE",
  "FORMULA",
  "UNIT_BASED",
  "ATTENDANCE_BASED",
  "MANUAL",
]);

export const SalaryCalculationBaseSchema = z.enum([
  "BASIC",
  "GROSS",
  "CTC",
  "NET",
  "COMPONENT",
  "CUSTOM",
]);

export const SalaryComponentInclusionSchema = z.enum([
  "GROSS",
  "CTC",
  "NET",
  "NONE",
]);

export const SalaryTaxabilitySchema = z.enum([
  "TAXABLE",
  "NON_TAXABLE",
  "PARTIALLY_TAXABLE",
]);

export const SalaryComponentStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);

export const SalaryUnitConfigSchema = z.object({
  unit: z.enum(["HOUR", "DAY", "KM", "MEAL", "SHIFT", "ITEM", "CUSTOM"]),
  rate: z.number().min(0, "Rate cannot be negative"),
  customUnitName: z.string().trim().optional(),
  minimumUnits: z.number().min(0).optional(),
  maximumUnits: z.number().min(0).optional(),
});

/**
 * Create salary component.
 *
 * Mirrors SalaryComponent (persistence type) minus
 * companyId/_id/timestamps/audit fields, which are
 * injected by the DAO/controller layer.
 */
export const CreateSalaryComponentSchema = z
  .object({
    code: z
      .string()
      .min(1, "Salary component code is required")
      .trim()
      .transform((val) => val.toUpperCase()),

    name: z.string().min(1, "Salary component name is required").trim(),

    description: z.string().trim().optional(),

    type: SalaryComponentTypeSchema,

    calculationType: SalaryComponentCalculationTypeSchema,

    calculationBase: SalaryCalculationBaseSchema.optional(),

    baseComponentId: z.string().min(1).optional(),

    fixedAmount: z
      .number()
      .min(0, "Fixed amount cannot be negative")
      .optional(),

    percentage: z
      .number()
      .min(0, "Percentage cannot be negative")
      .max(100, "Percentage cannot exceed 100")
      .optional(),

    formula: z.string().trim().optional(),

    unitConfig: SalaryUnitConfigSchema.optional(),

    inclusion: SalaryComponentInclusionSchema,

    taxability: SalaryTaxabilitySchema,

    isStatutory: z.boolean().default(false),

    statutoryConfig: z.record(z.string(), z.unknown()).optional(),

    allowManualOverride: z.boolean().default(false),

    isConfigurable: z.boolean().default(true),

    status: SalaryComponentStatusSchema.default("DRAFT"),

    displayOrder: z.number().int().min(0).default(0),

    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  // Cross-field checks that mirror how calculationType is actually used.
  .superRefine((data, ctx) => {
    if (data.calculationType === "FIXED" && data.fixedAmount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fixedAmount"],
        message: "fixedAmount is required when calculationType is FIXED",
      });
    }

    if (data.calculationType === "PERCENTAGE") {
      if (data.percentage === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["percentage"],
          message: "percentage is required when calculationType is PERCENTAGE",
        });
      }
      if (!data.calculationBase) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["calculationBase"],
          message:
            "calculationBase is required when calculationType is PERCENTAGE",
        });
      }
      if (data.calculationBase === "COMPONENT" && !data.baseComponentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseComponentId"],
          message:
            "baseComponentId is required when calculationBase is COMPONENT",
        });
      }
    }

    if (data.calculationType === "FORMULA") {
      if (!data.formula) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["formula"],
          message: "Formula is required when calculationType is FORMULA",
        });
      } else {
        try {
          SalaryFormulaHelper.validateSyntax(data.formula);
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["formula"],
            message: error instanceof Error ? error.message : "Invalid formula",
          });
        }
      }
    }

    if (data.calculationType === "UNIT_BASED" && !data.unitConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitConfig"],
        message: "unitConfig is required when calculationType is UNIT_BASED",
      });
    }
  });

/**
 * Update salary component (partial).
 *
 * Note: .partial() is applied to the underlying object schema
 * before the cross-field superRefine, so updates aren't forced
 * to satisfy the full "create" invariants — re-validate those
 * at the DAO/service layer if a calculationType change occurs.
 */
export const UpdateSalaryComponentSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .trim()
      .transform((val) => val.toUpperCase())
      .optional(),
    name: z.string().min(1).trim().optional(),
    description: z.string().trim().optional(),
    type: SalaryComponentTypeSchema.optional(),
    calculationType: SalaryComponentCalculationTypeSchema.optional(),
    calculationBase: SalaryCalculationBaseSchema.optional(),
    baseComponentId: z.string().min(1).optional(),
    fixedAmount: z.number().min(0).optional(),
    percentage: z.number().min(0).max(100).optional(),
    formula: z.string().trim().optional(),
    unitConfig: SalaryUnitConfigSchema.optional(),
    inclusion: SalaryComponentInclusionSchema.optional(),
    taxability: SalaryTaxabilitySchema.optional(),
    isStatutory: z.boolean().optional(),
    statutoryConfig: z.record(z.string(), z.unknown()).optional(),
    allowManualOverride: z.boolean().optional(),
    isConfigurable: z.boolean().optional(),
    status: SalaryComponentStatusSchema.optional(),
    displayOrder: z.number().int().min(0).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const SalaryComponentIdSchema = z
  .string()
  .min(1, "Salary component ID is required");

export type CreateSalaryComponentSchemaType = z.infer<
  typeof CreateSalaryComponentSchema
>;

export type UpdateSalaryComponentSchemaType = z.infer<
  typeof UpdateSalaryComponentSchema
>;
