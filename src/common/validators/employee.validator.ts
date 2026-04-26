import { z } from "zod";

// Basic
const EmployeeBasicSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  fullName: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  dateOfBirth: z.coerce.date().optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  profilePhotoUrl: z.string().optional(),
});

// Job
const JobDetailsSchema = z.object({
  designation: z.string().min(1, "Designation is required"),
  department: z.string().min(1, "Department is required"),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Intern"]),
  dateOfJoining: z.coerce.date(),
  reportingManagerId: z.string().optional(),
  workLocation: z.string().min(1, "Work location is required"),
  employeeStatus: z.enum(["Active", "Inactive", "On Leave", "Terminated"]),
});

// Compensation
const CompensationSchema = z.object({
  salary: z.number().min(0, "Salary must be positive"),
  payFrequency: z.enum(["Monthly", "Bi-weekly"]),
});

// Bank
const BankDetailsSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  ifscCode: z.string().optional(),
  branch: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

// Legal
const LegalDetailsSchema = z.object({
  panNumber: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  uan: z.string().optional(),
});

// Address
const AddressSchema = z.object({
  currentAddress: z.string().min(1, "Current address is required"),
  permanentAddress: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
});

// Leave
const LeaveInfoSchema = z.object({
  leaveBalance: z.number().min(0),
  sickLeaveBalance: z.number().min(0).optional(),
  casualLeaveBalance: z.number().min(0).optional(),
});

// Document
const DocumentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  url: z.string().min(1, "Document URL is required"),
  uploadedAt: z.coerce.date(),
});

// Full Employee
export const EmployeeSchema = z.object({
  basic: EmployeeBasicSchema,
  job: JobDetailsSchema,
  compensation: CompensationSchema,
  address: AddressSchema,
  bank: BankDetailsSchema.optional(),
  legal: LegalDetailsSchema.optional(),
  leave: LeaveInfoSchema.optional(),
  documents: z.array(DocumentSchema).optional(),
});

// Update schemas — all fields optional
export const UpdateEmployeeSchema = z.object({
  basic: EmployeeBasicSchema.partial().optional(),
  job: JobDetailsSchema.partial().optional(),
  compensation: CompensationSchema.partial().optional(),
  address: AddressSchema.partial().optional(),
  bank: BankDetailsSchema.partial().optional(),
  legal: LegalDetailsSchema.partial().optional(),
  leave: LeaveInfoSchema.partial().optional(),
  documents: z.array(DocumentSchema).optional(),
});

export const UpdateBankSchema = BankDetailsSchema.partial();

export const UpdateLegalSchema = LegalDetailsSchema.partial();

export const UpdateCompensationSchema = CompensationSchema.partial();

export const UpdateAddressSchema = AddressSchema.partial();

export const EmployeeIdSchema = z.string().min(1, "ID is required");

export const EmployeeEmailSchema = z.string().email("Invalid email");

export const EmployeeIdNumberSchema = z.string().min(1, "Employee ID is required");

// Types
export type EmployeeSchemaType = z.infer<typeof EmployeeSchema>;
export type UpdateEmployeeSchemaType = z.infer<typeof UpdateEmployeeSchema>;
export type UpdateBankSchemaType = z.infer<typeof UpdateBankSchema>;
export type UpdateLegalSchemaType = z.infer<typeof UpdateLegalSchema>;
export type UpdateCompensationSchemaType = z.infer<typeof UpdateCompensationSchema>;
export type UpdateAddressSchemaType = z.infer<typeof UpdateAddressSchema>;