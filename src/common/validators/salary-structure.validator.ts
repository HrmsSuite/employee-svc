import { z } from "zod";
import { SalaryCalculationBaseSchema } from "./salary-component.validator";

/**
 * Must stay aligned with SalaryPayFrequency / SalaryStructureStatus
 * (src/types/SalaryStructureComponent.types.ts, src/types/index.ts)
 */
export const SalaryPayFrequencySchema = z.enum([
  "MONTHLY",
  "WEEKLY",
  "BI_WEEKLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "YEARLY",
]);

export const SalaryStructureStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);

/**
 * Component entry inside a salary structure.
 * Mirrors SalaryStructureComponent exactly.
 */
export const SalaryStructureComponentInputSchema = z
  .object({
    componentId: z.string().min(1, "Component ID is required"),

    displayOrder: z.number().int().min(0).default(0),

    isRequired: z.boolean().default(false),

    allowOverride: z.boolean().default(false),

    fixedAmount: z.number().min(0, "fixedAmount cannot be negative").optional(),

    percentage: z
      .number()
      .min(0, "Percentage cannot be negative")
      .max(100, "Percentage cannot exceed 100")
      .optional(),

    calculationBase: SalaryCalculationBaseSchema.optional(),

    formula: z.string().trim().optional(),

    minimumAmount: z.number().min(0).optional(),

    maximumAmount: z.number().min(0).optional(),

    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.minimumAmount !== undefined &&
      data.maximumAmount !== undefined &&
      data.minimumAmount > data.maximumAmount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minimumAmount"],
        message: "minimumAmount cannot be greater than maximumAmount",
      });
    }
  });

/**
 * Create salary structure.
 *
 * Mirrors SalaryStructure (persistence type) minus
 * companyId/_id/timestamps/audit fields.
 */
export const CreateSalaryStructureSchema = z
  .object({
    code: z
      .string()
      .min(1, "Salary structure code is required")
      .trim()
      .transform((val) => val.toUpperCase()),

    name: z.string().min(1, "Salary structure name is required").trim(),

    currency: z
      .string()
      .trim()
      .min(1, "Currency is required")
      .transform((val) => val.toUpperCase())
      .default("INR"),

    description: z.string().trim().optional(),

    category: z.string().trim().optional(),

    payFrequency: SalaryPayFrequencySchema,

    components: z
      .array(SalaryStructureComponentInputSchema)
      .min(1, "At least one salary component is required"),

    status: SalaryStructureStatusSchema.default("DRAFT"),

    version: z.number().int().min(1).default(1),

    effectiveFrom: z.coerce.date(),

    effectiveTo: z
      .preprocess(
        (val) => (val === "" || val === null ? undefined : val),
        z.coerce.date().optional(),
      )
      .optional(),

    isDefault: z.boolean().default(false),

    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.effectiveTo && data.effectiveTo <= data.effectiveFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effectiveTo"],
        message: "effectiveTo must be after effectiveFrom",
      });
    }

    const seen = new Set<string>();
    data.components.forEach((c, idx) => {
      if (seen.has(c.componentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["components", idx, "componentId"],
          message: "Duplicate componentId within the same structure",
        });
      }
      seen.add(c.componentId);
    });
  });

/**
 * Update salary structure (partial).
 * Uses .strict() so unknown/renamed fields (e.g. legacy `isActive`,
 * `amount`) fail fast instead of being silently ignored.
 */
export const UpdateSalaryStructureSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .trim()
      .transform((val) => val.toUpperCase())
      .optional(),
    name: z.string().min(1).trim().optional(),
    currency: z
      .string()
      .trim()
      .min(1)
      .transform((val) => val.toUpperCase())
      .optional(),
    description: z.string().trim().optional(),
    category: z.string().trim().optional(),
    payFrequency: SalaryPayFrequencySchema.optional(),
    components: z.array(SalaryStructureComponentInputSchema).min(1).optional(),
    status: SalaryStructureStatusSchema.optional(),
    version: z.number().int().min(1).optional(),
    effectiveFrom: z.coerce.date().optional(),
    effectiveTo: z
      .preprocess(
        (val) => (val === "" || val === null ? undefined : val),
        z.coerce.date().optional(),
      )
      .optional(),
    isDefault: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.effectiveFrom &&
      data.effectiveTo &&
      data.effectiveTo <= data.effectiveFrom
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effectiveTo"],
        message: "effectiveTo must be after effectiveFrom",
      });
    }
  });

export const SalaryStructureIdSchema = z
  .string()
  .min(1, "Salary structure ID is required");

export type CreateSalaryStructureSchemaType = z.infer<
  typeof CreateSalaryStructureSchema
>;

export type UpdateSalaryStructureSchemaType = z.infer<
  typeof UpdateSalaryStructureSchema
>;

export const ChangeSalaryStructureStatusSchema = z.object({
  status: SalaryStructureStatusSchema,
});

export type ChangeSalaryStructureStatusType = z.infer<
  typeof ChangeSalaryStructureStatusSchema
>;
