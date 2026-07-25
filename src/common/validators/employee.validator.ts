import { z } from "zod";

const EmployeeBasicSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  fullName: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  dateOfBirth: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.date().optional(),
  ),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  profilePhotoUrl: z.string().optional(),
});

const JobDetailsSchema = z.object({
  designation: z.string().min(1, "Designation is required"),
  department: z.string().min(1, "Department is required"),
  roleIds: z.array(z.string()).optional(),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Intern"]),
  dateOfJoining: z.coerce.date(),
  reportingManagerId: z.string().optional(),
  workLocation: z.string().min(1, "Work location is required"),
  employeeStatus: z.enum(["Active", "Inactive", "On Leave", "Terminated"]),
  shiftId: z.string().optional(),
  leavepolicy: z.array(z.string()).min(1, "At least one leave policy required"),
  weeklyOff: z.array(z.string()).optional(),
  attendanceMode: z.enum(["Manual", "Biometric", "GPS", "Hybrid"]).optional(),

  dateOfExit: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.date().optional(),
  ),
  exitReason: z.string().optional(),
  fullAndFinalSettled: z.boolean().optional(),
});

const SalaryStructureSchema = z.object({
  basic: z.number().min(0),
  hra: z.number().min(0),
  allowances: z.number().min(0),
  gross: z.number().min(0),
  effectiveFrom: z.coerce.date(),
});

const CompensationSchema = z.object({
  salary: z.number().min(0, "Salary must be positive"),
  payFrequency: z.enum(["Monthly", "Bi-weekly"]),
  salaryStructure: SalaryStructureSchema.optional(),
  salaryHistory: z.array(SalaryStructureSchema).optional(),
});
const BankDetailsSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  ifscCode: z.string().optional(),
  branch: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

const LegalDetailsSchema = z.object({
  panNumber: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  uan: z.string().optional(),
});

const AddressSchema = z.object({
  currentAddress: z.string().min(1, "Current address is required"),
  permanentAddress: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
});

const DocumentSchema = z.object({
  type: z.string().min(1, "Document type is required"),
  name: z.string().min(1, "Document name is required"),
  url: z.string().min(1, "Document URL is required"),
  uploadedAt: z.coerce.date().optional(),
});

const PayrollInfoSchema = z.object({
  payrollId: z.string().optional(),
  payrollGroupId: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().optional(),
  ),
  payslipPreference: z.enum(["Email", "Download", "Both"]).optional(),
});

const TaxInfoSchema = z.object({
  taxRegime: z.enum(["Old", "New"]).optional(),
  taxDeclarationSubmitted: z.boolean().optional(),
});

export const EmployeeSchema = z.object({
  basic: EmployeeBasicSchema,
  job: JobDetailsSchema,
  compensation: CompensationSchema,
  address: AddressSchema,
  bank: BankDetailsSchema.optional(),
  legal: LegalDetailsSchema.optional(),
  documents: z.array(DocumentSchema).optional(),
  payroll: PayrollInfoSchema.optional(),
  tax: TaxInfoSchema.optional(),
});

export const UpdateEmployeeSchema = z.object({
  basic: EmployeeBasicSchema.partial().optional(),
  job: JobDetailsSchema.partial().optional(),
  compensation: CompensationSchema.partial().optional(),
  address: AddressSchema.partial().optional(),
  bank: BankDetailsSchema.partial().optional(),
  legal: LegalDetailsSchema.partial().optional(),
  documents: z.array(DocumentSchema).optional(),
  payroll: PayrollInfoSchema.partial().optional(),
  tax: TaxInfoSchema.partial().optional(),
});

export const UpdateBankSchema = BankDetailsSchema.partial();
export const UpdateLegalSchema = LegalDetailsSchema.partial();
export const UpdateCompensationSchema = CompensationSchema.partial();
export const UpdateAddressSchema = AddressSchema.partial();

export const UpdatePayrollInfoSchema = PayrollInfoSchema.partial();
export const UpdateTaxInfoSchema = TaxInfoSchema.partial();

export const EmployeeIdSchema = z.string().min(1, "ID is required");
export const EmployeeEmailSchema = z.string().email("Invalid email");
export const EmployeeIdNumberSchema = z
  .string()
  .min(1, "Employee ID is required");

export type EmployeeSchemaType = z.infer<typeof EmployeeSchema>;
export type UpdateEmployeeSchemaType = z.infer<typeof UpdateEmployeeSchema>;
export type UpdateBankSchemaType = z.infer<typeof UpdateBankSchema>;
export type UpdateLegalSchemaType = z.infer<typeof UpdateLegalSchema>;
export type UpdateCompensationSchemaType = z.infer<
  typeof UpdateCompensationSchema
>;
export type UpdateAddressSchemaType = z.infer<typeof UpdateAddressSchema>;
export type UpdatePayrollInfoSchemaType = z.infer<
  typeof UpdatePayrollInfoSchema
>;
export type UpdateTaxInfoSchemaType = z.infer<typeof UpdateTaxInfoSchema>;
