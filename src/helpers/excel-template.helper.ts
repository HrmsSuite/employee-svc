import ExcelJS from "exceljs";
import {
  DepartmentModel,
  DesignationModel,
  ShiftModel,
  RolesModel,
  LeavePolicyModel,
  EmployeeModel,
} from "@hrmssuite/persistence";
import { Types } from "mongoose";

// ─── Colour palette ─────────────────────────────────────────────────────────
const COLORS = {
  REQUIRED_HEADER_BG: "FFFBF3D0", // amber tint
  REQUIRED_HEADER_FONT: "FF7D4E00",
  OPTIONAL_HEADER_BG: "FFE8F0FE", // blue tint
  OPTIONAL_HEADER_FONT: "FF1A56DB",
  HEADER_BORDER: "FFB0B0B0",
  ROW_ALT_BG: "FFF8F9FA",
  SAMPLE_ROW_BG: "FFE8F5E9", // light green — easy to spot
  NOTE_HEADER_BG: "FF1E3A5F",
  NOTE_HEADER_FONT: "FFFFFFFF",
  SECTION_BG: "FFEEF2FF",
};

// ─── Column definitions ──────────────────────────────────────────────────────
// key        : internal lookup key (used in __Lookups sheet and transformer)
// header     : text shown in Excel header row
// field      : dot-notation path in the EmployeeData nested object
// required   : true = amber header, mandatory field
// width      : column width in characters
// type       : 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'lookup' | 'multiLookup'
// enumValues : static dropdown options for 'enum' type
// note       : shown in the Instructions sheet
interface ColumnDef {
  key: string;
  header: string;
  field: string;
  required: boolean;
  width: number;
  type:
    | "text"
    | "number"
    | "date"
    | "boolean"
    | "enum"
    | "lookup"
    | "multiLookup";
  enumValues?: string[];
  note?: string;
  sample?: string;
}

export const COLUMN_DEFS: ColumnDef[] = [
  // ── BASIC ────────────────────────────────────────────────────────────────
  {
    key: "employeeId",
    header: "Employee ID *",
    field: "basic.employeeId",
    required: true,
    width: 16,
    type: "text",
    note: "Unique employee identifier within your company (e.g. EMP001). Must not duplicate an existing employee ID.",
    sample: "EMP001",
  },
  {
    key: "firstName",
    header: "First Name *",
    field: "basic.firstName",
    required: true,
    width: 16,
    type: "text",
    note: "Employee's first name.",
    sample: "John",
  },
  {
    key: "lastName",
    header: "Last Name *",
    field: "basic.lastName",
    required: true,
    width: 16,
    type: "text",
    note: "Employee's last name.",
    sample: "Smith",
  },
  {
    key: "email",
    header: "Email *",
    field: "basic.email",
    required: true,
    width: 28,
    type: "text",
    note: "Valid email address. Must be unique within your company.",
    sample: "john.smith@company.com",
  },
  {
    key: "phone",
    header: "Phone *",
    field: "basic.phone",
    required: true,
    width: 16,
    type: "text",
    note: "Phone number (any format). Must be unique within your company.",
    sample: "9876543210",
  },
  {
    key: "gender",
    header: "Gender",
    field: "basic.gender",
    required: false,
    width: 12,
    type: "enum",
    enumValues: ["Male", "Female", "Other"],
    note: "Select from dropdown.",
    sample: "Male",
  },
  {
    key: "dateOfBirth",
    header: "Date of Birth",
    field: "basic.dateOfBirth",
    required: false,
    width: 16,
    type: "date",
    note: "Format: DD-MM-YYYY (e.g. 15-06-1990).",
    sample: "15-06-1990",
  },

  // ── JOB ──────────────────────────────────────────────────────────────────
  {
    key: "designation",
    header: "Designation *",
    field: "job.designation",
    required: true,
    width: 24,
    type: "lookup",
    note: "Select a designation from the dropdown. Options are fetched from your company's configured designations.",
    sample: "Software Engineer",
  },
  {
    key: "department",
    header: "Department *",
    field: "job.department",
    required: true,
    width: 22,
    type: "lookup",
    note: "Select a department from the dropdown. Options are fetched from your company's configured departments.",
    sample: "Engineering",
  },
  {
    key: "employmentType",
    header: "Employment Type *",
    field: "job.employmentType",
    required: true,
    width: 20,
    type: "enum",
    enumValues: ["Full-time", "Part-time", "Contract", "Intern"],
    note: "Select from dropdown: Full-time, Part-time, Contract, Intern.",
    sample: "Full-time",
  },
  {
    key: "dateOfJoining",
    header: "Date of Joining *",
    field: "job.dateOfJoining",
    required: true,
    width: 18,
    type: "date",
    note: "Format: DD-MM-YYYY. Must be a valid date. Must be before Date of Exit if provided.",
    sample: "01-01-2024",
  },
  {
    key: "workLocation",
    header: "Work Location *",
    field: "job.workLocation",
    required: true,
    width: 22,
    type: "text",
    note: "Physical work location or office name (e.g. Mumbai HQ).",
    sample: "Mumbai HQ",
  },
  {
    key: "employeeStatus",
    header: "Employee Status *",
    field: "job.employeeStatus",
    required: true,
    width: 18,
    type: "enum",
    enumValues: ["Active", "Inactive", "On Leave", "Terminated"],
    note: "Initial employment status. Typically 'Active' for new hires.",
    sample: "Active",
  },
  {
    key: "leavepolicy",
    header: "Leave Policies *",
    field: "job.leavepolicy",
    required: true,
    width: 30,
    type: "multiLookup",
    note: "Select one or more leave policy names, separated by commas (e.g. Annual Leave,Sick Leave). At least one is required.",
    sample: "Annual Leave,Sick Leave",
  },
  {
    key: "roleIds",
    header: "Roles",
    field: "job.roleIds",
    required: false,
    width: 24,
    type: "multiLookup",
    note: "Optional. Select one or more role names, separated by commas. Roles must be active in your company.",
    sample: "Employee",
  },
  {
    key: "reportingManagerId",
    header: "Reporting Manager",
    field: "job.reportingManagerId",
    required: false,
    width: 26,
    type: "lookup",
    note: "Optional. Select the reporting manager's full name from the dropdown. Manager must be an active employee.",
    sample: "Jane Doe",
  },
  {
    key: "shiftId",
    header: "Shift",
    field: "job.shiftId",
    required: false,
    width: 20,
    type: "lookup",
    note: "Optional. Select a shift. REQUIRED if Attendance Mode is Biometric or Hybrid.",
    sample: "Morning Shift",
  },
  {
    key: "attendanceMode",
    header: "Attendance Mode",
    field: "job.attendanceMode",
    required: false,
    width: 20,
    type: "enum",
    enumValues: ["Manual", "Biometric", "GPS", "Hybrid"],
    note: "Optional. If Biometric or Hybrid, a Shift must also be selected.",
    sample: "Manual",
  },
  {
    key: "weeklyOff",
    header: "Weekly Off Days",
    field: "job.weeklyOff",
    required: false,
    width: 22,
    type: "text",
    note: "Optional. Comma-separated day names (e.g. Saturday,Sunday).",
    sample: "Saturday,Sunday",
  },
  {
    key: "dateOfExit",
    header: "Date of Exit",
    field: "job.dateOfExit",
    required: false,
    width: 16,
    type: "date",
    note: "Optional. Format: DD-MM-YYYY. Must be after Date of Joining.",
    sample: "",
  },
  {
    key: "exitReason",
    header: "Exit Reason",
    field: "job.exitReason",
    required: false,
    width: 22,
    type: "text",
    note: "Optional. Reason for exit (e.g. Resigned, Terminated).",
    sample: "",
  },

  // ── ADDRESS ───────────────────────────────────────────────────────────────
  {
    key: "currentAddress",
    header: "Current Address *",
    field: "address.currentAddress",
    required: true,
    width: 36,
    type: "text",
    note: "Full current residential address.",
    sample: "123 Main Street, Apt 4B",
  },
  {
    key: "permanentAddress",
    header: "Permanent Address",
    field: "address.permanentAddress",
    required: false,
    width: 36,
    type: "text",
    note: "Optional. Permanent address if different from current.",
    sample: "45 Old Town Road",
  },
  {
    key: "city",
    header: "City *",
    field: "address.city",
    required: true,
    width: 16,
    type: "text",
    note: "City of current residence.",
    sample: "Mumbai",
  },
  {
    key: "state",
    header: "State *",
    field: "address.state",
    required: true,
    width: 18,
    type: "text",
    note: "State of current residence.",
    sample: "Maharashtra",
  },
  {
    key: "country",
    header: "Country *",
    field: "address.country",
    required: true,
    width: 16,
    type: "text",
    note: "Country of current residence.",
    sample: "India",
  },
  {
    key: "postalCode",
    header: "Postal Code *",
    field: "address.postalCode",
    required: true,
    width: 14,
    type: "text",
    note: "Postal / ZIP code.",
    sample: "400001",
  },

  // ── BANK ──────────────────────────────────────────────────────────────────
  {
    key: "bankName",
    header: "Bank Name",
    field: "bank.bankName",
    required: false,
    width: 22,
    type: "text",
    note: "Optional. Name of the bank. If any bank field is filled, Bank Name and Account Number become required.",
    sample: "HDFC Bank",
  },
  {
    key: "accountNumber",
    header: "Account Number",
    field: "bank.accountNumber",
    required: false,
    width: 22,
    type: "text",
    note: "Optional. Bank account number. Required if Bank Name is provided.",
    sample: "1234567890",
  },
  {
    key: "ifscCode",
    header: "IFSC Code",
    field: "bank.ifscCode",
    required: false,
    width: 16,
    type: "text",
    note: "Optional. Bank IFSC code.",
    sample: "HDFC0001234",
  },
  {
    key: "branch",
    header: "Bank Branch",
    field: "bank.branch",
    required: false,
    width: 20,
    type: "text",
    note: "Optional. Bank branch name.",
    sample: "Andheri West",
  },

  // ── LEGAL ─────────────────────────────────────────────────────────────────
  {
    key: "panNumber",
    header: "PAN Number",
    field: "legal.panNumber",
    required: false,
    width: 16,
    type: "text",
    note: "Optional. PAN card number. Must be unique within your company if provided.",
    sample: "ABCDE1234F",
  },
  {
    key: "aadhaarNumber",
    header: "Aadhaar Number",
    field: "legal.aadhaarNumber",
    required: false,
    width: 18,
    type: "text",
    note: "Optional. 12-digit Aadhaar number. Must be unique within your company if provided.",
    sample: "123456789012",
  },
  {
    key: "uan",
    header: "UAN",
    field: "legal.uan",
    required: false,
    width: 18,
    type: "text",
    note: "Optional. Universal Account Number (PF). Must be unique within your company if provided.",
    sample: "100123456789",
  },

  // ── PAYROLL ───────────────────────────────────────────────────────────────
  {
    key: "payrollId",
    header: "Payroll ID",
    field: "payroll.payrollId",
    required: false,
    width: 16,
    type: "text",
    note: "Optional. Internal payroll system ID.",
    sample: "",
  },
  {
    key: "payslipPreference",
    header: "Payslip Preference",
    field: "payroll.payslipPreference",
    required: false,
    width: 20,
    type: "enum",
    enumValues: ["Email", "Download", "Both"],
    note: "Optional. How the employee receives payslips.",
    sample: "Email",
  },

  // ── TAX ───────────────────────────────────────────────────────────────────
  {
    key: "taxRegime",
    header: "Tax Regime",
    field: "tax.taxRegime",
    required: false,
    width: 14,
    type: "enum",
    enumValues: ["Old", "New"],
    note: "Optional. Income tax regime preference.",
    sample: "New",
  },
  {
    key: "taxDeclarationSubmitted",
    header: "Tax Declaration Submitted",
    field: "tax.taxDeclarationSubmitted",
    required: false,
    width: 26,
    type: "boolean",
    note: "Optional. Enter TRUE or FALSE.",
    sample: "FALSE",
  },
];

// ─── Reference lookup keys ────────────────────────────────────────────────────
const LOOKUP_KEYS = [
  "designation",
  "department",
  "leavepolicy",
  "roleIds",
  "reportingManagerId",
  "shiftId",
] as const;

type LookupKey = (typeof LOOKUP_KEYS)[number];

// ─── Shared cell border ───────────────────────────────────────────────────────
function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = {
    style: "thin",
    color: { argb: COLORS.HEADER_BORDER },
  };
  return { top: side, left: side, bottom: side, right: side };
}

// ─── Apply header style ───────────────────────────────────────────────────────
function styleHeader(cell: ExcelJS.Cell, required: boolean): void {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: required ? COLORS.REQUIRED_HEADER_BG : COLORS.OPTIONAL_HEADER_BG,
    },
  };
  cell.font = {
    bold: true,
    size: 11,
    color: {
      argb: required
        ? COLORS.REQUIRED_HEADER_FONT
        : COLORS.OPTIONAL_HEADER_FONT,
    },
    name: "Calibri",
  };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = thinBorder();
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates a company-specific employee upload Excel template.
 *
 * Strategy for reference dropdowns:
 *  1. Fetch all valid names from the DB for this company in parallel.
 *  2. Write those names into a hidden "__Lookups" sheet (one column per entity).
 *  3. Each reference column in "Employee Data" sheet points its DataValidation
 *     to the relevant column in "__Lookups" — this bypasses Excel's 255-char
 *     formula-string limit and supports hundreds of options cleanly.
 *
 * @param companyId  MongoDB ObjectId string of the requesting company
 * @returns          Raw Excel buffer ready to stream to the client
 */
export async function generateEmployeeTemplate(
  companyId: string,
): Promise<Buffer> {
  const companyOid = new Types.ObjectId(companyId);

  // ── 1. Fetch all reference data in parallel ────────────────────────────────
  const [departments, designations, shifts, roles, policies, managers] =
    await Promise.all([
      DepartmentModel.find(
        { companyId: companyOid, "meta.isDeleted": { $ne: true } },
        { _id: 0, "data.name": 1 },
      ).lean(),
      DesignationModel.find(
        { companyId: companyOid, "meta.isDeleted": { $ne: true } },
        { _id: 0, "data.name": 1 },
      ).lean(),
      ShiftModel.find(
        { companyId: companyOid, "meta.isDeleted": { $ne: true } },
        { _id: 0, "data.name": 1 },
      ).lean(),
      RolesModel.find(
        { companyId: companyOid, isDeleted: false, isActive: true },
        { _id: 0, name: 1 },
      ).lean(),
      LeavePolicyModel.find(
        { companyId: companyOid, isDeleted: { $ne: true } },
        { _id: 0, leaveTypeName: 1 },
      ).lean(),
      EmployeeModel.find(
        {
          companyId: companyOid,
          "meta.isDeleted": false,
          "data.job.employeeStatus": "Active",
        },
        { _id: 0, "data.basic.firstName": 1, "data.basic.lastName": 1 },
      ).lean(),
    ]);

  // Map fetched docs → plain string arrays
  const lookupData: Record<LookupKey, string[]> = {
    department: departments.map((d) => (d as any).data.name).filter(Boolean),
    designation: designations.map((d) => (d as any).data.name).filter(Boolean),
    shiftId: shifts.map((s) => (s as any).data.name).filter(Boolean),
    roleIds: roles.map((r) => (r as any).name).filter(Boolean),
    leavepolicy: policies.map((p) => (p as any).leaveTypeName).filter(Boolean),
    reportingManagerId: managers
      .map((m) => {
        const first = (m as any).data?.basic?.firstName ?? "";
        const last = (m as any).data?.basic?.lastName ?? "";
        return `${first} ${last}`.trim();
      })
      .filter(Boolean),
  };

  // ── 2. Create workbook ─────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "HRMS Suite";
  wb.created = new Date();
  wb.modified = new Date();
  wb.properties.date1904 = false;

  // ── 3. Instructions sheet ──────────────────────────────────────────────────
  const instrSheet = wb.addWorksheet("Instructions");
  instrSheet.getColumn(1).width = 28;
  instrSheet.getColumn(2).width = 70;
  instrSheet.getColumn(3).width = 20;
  instrSheet.getColumn(4).width = 20;
  instrSheet.getColumn(5).width = 16;

  const instrTitleRow = instrSheet.addRow([
    "HRMS Suite — Employee Bulk Upload Instructions",
  ]);
  instrTitleRow.getCell(1).font = {
    bold: true,
    size: 16,
    color: { argb: "FF1E3A5F" },
    name: "Calibri",
  };
  instrSheet.mergeCells(`A1:E1`);
  instrTitleRow.height = 32;

  instrSheet.addRow([]); // spacer

  const colHeaders = instrSheet.addRow([
    "Column",
    "Description / Notes",
    "Required?",
    "Sample Value",
    "Format",
  ]);
  colHeaders.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.NOTE_HEADER_BG },
    };
    cell.font = {
      bold: true,
      color: { argb: COLORS.NOTE_HEADER_FONT },
      name: "Calibri",
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  });
  colHeaders.height = 22;

  COLUMN_DEFS.forEach((col, i) => {
    const row = instrSheet.addRow([
      col.header.replace(" *", ""),
      col.note ?? "",
      col.required ? "✅ Required" : "Optional",
      col.sample ?? "",
      col.type === "date"
        ? "DD-MM-YYYY"
        : col.type === "number"
          ? "Positive number"
          : col.type === "boolean"
            ? "TRUE / FALSE"
            : col.type === "enum"
              ? (col.enumValues?.join(", ") ?? "")
              : col.type === "lookup"
                ? "Select from dropdown"
                : col.type === "multiLookup"
                  ? "Select one or more (comma-separated)"
                  : "Text",
    ]);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      if (i % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF3F6FF" },
        };
      }
      cell.border = thinBorder();
      cell.font = { name: "Calibri", size: 10 };
    });
    row.getCell(3).font = {
      name: "Calibri",
      size: 10,
      color: { argb: col.required ? "FF7D4E00" : "FF2D6A4F" },
      bold: col.required,
    };
    row.height = 36;
  });

  // Key notes at the bottom
  instrSheet.addRow([]);
  const notesTitle = instrSheet.addRow(["⚠️  Important Notes"]);
  notesTitle.getCell(1).font = {
    bold: true,
    size: 12,
    color: { argb: "FFCC0000" },
    name: "Calibri",
  };

  const notes = [
    "• Do NOT rename or reorder columns. The upload parser reads by column position.",
    "• Do NOT delete the sample row (Row 2) — it will be ignored by the parser.",
    "• Dates must be in DD-MM-YYYY format (e.g. 15-06-1990).",
    "• For fields with comma-separated values (Leave Policies, Roles), type names exactly as shown in the dropdown.",
    "• Columns marked * are REQUIRED. Leaving them blank will cause that row to fail.",
    "• The Employee ID, Email, Phone, PAN, Aadhaar, and UAN must each be unique across your company.",
    "• If Attendance Mode is Biometric or Hybrid, a Shift must be selected.",
    "• Do NOT upload this file with the sample data row — replace it with real employee data.",
  ];
  notes.forEach((note) => {
    const r = instrSheet.addRow([note]);
    r.getCell(1).font = { name: "Calibri", size: 10 };
    instrSheet.mergeCells(`A${r.number}:E${r.number}`);
  });

  // ── 5. Main "Employee Data" sheet ──────────────────────────────────────────
  const dataSheet = wb.addWorksheet("Employee Data", {
    views: [{ state: "frozen", ySplit: 2 }], // freeze header + legend rows
  });

  // ── 6. Hidden __Lookups sheet (added last so it appears at end of tab bar) ──
  const lookupSheet = wb.addWorksheet("__Lookups");
  lookupSheet.state = "hidden";

  const lookupColMap: Record<LookupKey, number> = {} as any;
  let lookupColIdx = 1;

  for (const key of LOOKUP_KEYS) {
    const names = lookupData[key];
    lookupColMap[key] = lookupColIdx;
    lookupSheet.getCell(1, lookupColIdx).value = key; // header label
    names.forEach((name, rowIdx) => {
      lookupSheet.getCell(rowIdx + 2, lookupColIdx).value = name;
    });
    lookupColIdx++;
  }

  // Legend row (row 1)
  const legendRow = dataSheet.addRow([
    "🟡 Amber headers = Required fields     🔵 Blue headers = Optional fields     📋 Use dropdowns where provided     ⚠️  See Instructions sheet for details",
  ]);
  dataSheet.mergeCells(`A1:${colIdxToLetter(COLUMN_DEFS.length)}1`);
  legendRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFDE7" },
  };
  legendRow.getCell(1).font = {
    italic: true,
    size: 10,
    color: { argb: "FF555555" },
    name: "Calibri",
  };
  legendRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  legendRow.height = 22;

  // Header row (row 2)
  const headerRow = dataSheet.addRow(COLUMN_DEFS.map((c) => c.header));
  headerRow.height = 36;
  COLUMN_DEFS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    styleHeader(cell, col.required);
    dataSheet.getColumn(i + 1).width = col.width;
  });

  // Sample data row (row 3) — visually distinct green background
  const sampleRow = dataSheet.addRow(COLUMN_DEFS.map((c) => c.sample ?? ""));
  sampleRow.height = 20;
  sampleRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.SAMPLE_ROW_BG },
    };
    cell.font = {
      italic: true,
      color: { argb: "FF2D6A4F" },
      size: 10,
      name: "Calibri",
    };
    cell.alignment = { vertical: "middle" };
    cell.border = thinBorder();
    // Format date columns as text (we parse DD-MM-YYYY ourselves)
    const col = COLUMN_DEFS[colNumber - 1];
    if (col.type === "date") cell.numFmt = "@";
    if (col.type === "number") cell.numFmt = "#,##0";
  });

  // Data validation rows 3–2002 (1 sample + up to 2000 data rows)
  const MAX_ROWS = 2002;

  COLUMN_DEFS.forEach((col, colIndex) => {
    const colNum = colIndex + 1;
    const excelCol = colIdxToLetter(colNum);

    // Apply number format to entire column for number/date cols
    if (col.type === "number") {
      dataSheet.getColumn(colNum).numFmt = "#,##0";
    }
    if (col.type === "date") {
      dataSheet.getColumn(colNum).numFmt = "@"; // treat as text — we parse ourselves
    }

    // ── Static enum dropdowns ─────────────────────────────────────────────
    if (col.type === "enum" && col.enumValues && col.enumValues.length > 0) {
      const formulaStr = `"${col.enumValues.join(",")}"`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dataSheet as any).dataValidations.add(
        `${excelCol}4:${excelCol}${MAX_ROWS}`,
        {
          type: "list",
          allowBlank: !col.required,
          formulae: [formulaStr],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Invalid value",
          error: `Please select a valid option: ${col.enumValues.join(", ")}`,
        },
      );
    }

    // ── Lookup / multiLookup: range-based dropdown from __Lookups ─────────
    if (
      (col.type === "lookup" || col.type === "multiLookup") &&
      col.key in lookupColMap
    ) {
      const lKey = col.key as LookupKey;
      const lookupNames = lookupData[lKey];
      if (lookupNames.length > 0) {
        const lCol = colIdxToLetter(lookupColMap[lKey]);
        // Rows 2..(n+1) in __Lookups (row 1 is the header label)
        const lastLookupRow = lookupNames.length + 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dataSheet as any).dataValidations.add(
          `${excelCol}4:${excelCol}${MAX_ROWS}`,
          {
            type: "list",
            allowBlank: !col.required,
            formulae: [`__Lookups!$${lCol}$2:$${lCol}$${lastLookupRow}`],
            showErrorMessage: true,
            errorStyle: col.required ? "stop" : "warning",
            errorTitle: col.required
              ? "Selection required"
              : "Unrecognised value",
            error: col.required
              ? `Please select a valid ${col.header.replace(" *", "")} from the dropdown.`
              : `"${col.header}" value not found in the list. Leave blank or choose from the dropdown.`,
          },
        );
      }
    }

    // ── Boolean columns: restrict to TRUE/FALSE ───────────────────────────
    if (col.type === "boolean") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dataSheet as any).dataValidations.add(
        `${excelCol}4:${excelCol}${MAX_ROWS}`,
        {
          type: "list",
          allowBlank: true,
          formulae: ['"TRUE,FALSE"'],
        },
      );
    }
  });

  // ── 6. Alternating row shading for readability (every other row) ───────────
  for (let r = 4; r <= 12; r++) {
    // shade the empty placeholder rows visually
    const row = dataSheet.getRow(r);
    if (r % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum <= COLUMN_DEFS.length) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.ROW_ALT_BG },
          };
        }
      });
    }
  }

  // ── 7. Return buffer ───────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─── Utility: column index → Excel letter (1 → "A", 27 → "AA") ───────────────
function colIdxToLetter(n: number): string {
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}
