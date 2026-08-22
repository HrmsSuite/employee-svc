import ExcelJS from "exceljs";
import {
  DepartmentModel,
  DesignationModel,
  ShiftModel,
  RolesModel,
  LeavePolicyModel,
  EmployeeModel,
  Employee,
} from "@hrmssuite/persistence";
import { Types } from "mongoose";

import { COLUMN_DEFS } from "./excel-template.helper";
import { BusinessRuleError } from "./error";

interface ParsedEmployeeRow {
  rowNumber: number;
  employee: Omit<Employee, "companyId" | "createdAt" | "updatedAt">;
}

interface BulkUploadResult {
  created: number;
  updated: number;
  errors: {
    rowNumber: number;
    message: string;
  }[];
}

type LookupMaps = {
  designationByName: Map<string, Types.ObjectId>;
  departmentByName: Map<string, Types.ObjectId>;
  shiftByName: Map<string, Types.ObjectId>;
  roleByName: Map<string, Types.ObjectId>;
  leavePolicyByName: Map<string, Types.ObjectId>;
  managerByFullName: Map<string, Types.ObjectId>;
};

/**
 * Process uploaded employee Excel file and upsert into EmployeeModel.
 */
export async function processEmployeeBulkUpload(
  companyId: string,
  buffer: ArrayBuffer | Uint8Array | Buffer,
  userId?: string,
): Promise<BulkUploadResult> {
  const companyOid = new Types.ObjectId(companyId);
  const userOid =
    userId && Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : undefined;

  // 1) Load workbook
  const wb = new ExcelJS.Workbook();
  const data =
    buffer instanceof Uint8Array
      ? buffer
      : new Uint8Array(buffer as ArrayBuffer);
  await wb.xlsx.load(data);

  const dataSheet = wb.getWorksheet("Employee Data");
  if (!dataSheet) {
    throw new BusinessRuleError(
      "Invalid template: 'Employee Data' sheet not found",
    );
  }

  // 2) Fetch lookup data (same as generateEmployeeTemplate, but with IDs)
  const [depDocs, desDocs, shiftDocs, roleDocs, policyDocs, managerDocs] =
    await Promise.all([
      DepartmentModel.find(
        { companyId: companyOid, "meta.isDeleted": { $ne: true } },
        { _id: 1, "data.name": 1 },
      ).lean(),
      DesignationModel.find(
        { companyId: companyOid, "meta.isDeleted": { $ne: true } },
        { _id: 1, "data.name": 1 },
      ).lean(),
      ShiftModel.find(
        { companyId: companyOid, "meta.isDeleted": { $ne: true } },
        { _id: 1, "data.name": 1 },
      ).lean(),
      RolesModel.find(
        { companyId: companyOid, isDeleted: false, isActive: true },
        { _id: 1, name: 1 },
      ).lean(),
      LeavePolicyModel.find(
        { companyId: companyOid, isDeleted: { $ne: true } },
        { _id: 1, leaveTypeName: 1 },
      ).lean(),
      EmployeeModel.find(
        {
          companyId: companyOid,
          "meta.isDeleted": false,
          "data.job.employeeStatus": "Active",
        },
        {
          _id: 1,
          "data.basic.firstName": 1,
          "data.basic.lastName": 1,
        },
      ).lean(),
    ]);

  const lookupMaps: LookupMaps = {
    designationByName: new Map(
      desDocs.map((d) => [
        ((d as any).data?.name ?? "").trim(),
        d._id as Types.ObjectId,
      ]),
    ),
    departmentByName: new Map(
      depDocs.map((d) => [
        ((d as any).data?.name ?? "").trim(),
        d._id as Types.ObjectId,
      ]),
    ),
    shiftByName: new Map(
      shiftDocs.map((s) => [
        ((s as any).data?.name ?? "").trim(),
        s._id as Types.ObjectId,
      ]),
    ),
    roleByName: new Map(
      roleDocs.map((r) => [
        ((r as any).name ?? "").trim(),
        r._id as Types.ObjectId,
      ]),
    ),
    leavePolicyByName: new Map(
      policyDocs.map((p) => [
        ((p as any).leaveTypeName ?? "").trim(),
        p._id as Types.ObjectId,
      ]),
    ),
    managerByFullName: new Map(
      managerDocs.map((m) => {
        const first = (m as any).data?.basic?.firstName ?? "";
        const last = (m as any).data?.basic?.lastName ?? "";
        const full = `${first} ${last}`.trim();
        return [full, m._id as Types.ObjectId];
      }),
    ),
  };

  // 3) Build header map
  const HEADER_ROW_INDEX = 2;
  const DATA_START_ROW_INDEX = 3;

  const headerRow = dataSheet.getRow(HEADER_ROW_INDEX);
  const headerMap: Record<string, number> = {};

  COLUMN_DEFS.forEach((colDef, idx) => {
    const cell = headerRow.getCell(idx + 1);
    const rawHeader = (cell.value ?? "").toString().trim();
    if (!rawHeader) return;
    headerMap[colDef.key] = idx + 1;
  });

  const errors: BulkUploadResult["errors"] = [];
  let created = 0;
  let updated = 0;

  // 4) Iterate rows
  for (let r = DATA_START_ROW_INDEX; r <= dataSheet.rowCount; r++) {
    const row = dataSheet.getRow(r);

    if (rowIsEmpty(row, COLUMN_DEFS.length)) {
      continue;
    }

    try {
      const parsed = parseRow(row, headerMap, r, lookupMaps);

      const employee = parsed.employee;
      const basic = employee.data.basic;

      if (!basic.employeeId || !basic.email || !basic.phone) {
        throw new BusinessRuleError(
          "Employee ID, Email and Phone are required for every row",
        );
      }

      const existing = await EmployeeModel.findOne({
        companyId: companyOid,
        "data.basic.employeeId": basic.employeeId,
        "meta.isDeleted": { $ne: true },
      });

      if (existing) {
        // merge/overwrite
        existing.data = {
          ...existing.data,
          ...employee.data,
        };

        existing.meta = {
          ...existing.meta,
          version: (existing.meta.version ?? 1) + 1,
        };

        if (userOid) {
          existing.meta.auditTrail = existing.meta.auditTrail ?? [];
          existing.meta.auditTrail.push({
            changedBy: userOid,
            changedAt: new Date(),
            changes: "Bulk upload update",
          } as any);
        }

        await existing.save();
        updated++;
      } else {
        const doc: Employee = {
          companyId: companyOid,
          data: employee.data,
          meta: {
            version: 1,
            isDeleted: false,
            auditTrail: userOid
              ? [
                  {
                    changedBy: userOid,
                    changedAt: new Date(),
                    changes: "Bulk upload create",
                  } as any,
                ]
              : [],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await EmployeeModel.create(doc);
        created++;
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unknown error while processing row";
      errors.push({ rowNumber: r, message: msg });
    }
  }

  return { created, updated, errors };
}

// ───────────── helpers ─────────────

function rowIsEmpty(row: ExcelJS.Row, maxCols: number): boolean {
  for (let c = 1; c <= maxCols; c++) {
    const val = row.getCell(c).value;
    if (val !== null && val !== undefined && val.toString().trim() !== "") {
      return false;
    }
  }
  return true;
}

function extractCellString(raw: ExcelJS.CellValue): string {
  if (raw === null || raw === undefined) return "";
  if (raw instanceof Date) return raw.toISOString();

  if (typeof raw === "object") {
    const obj = raw as any;
    if ("result" in obj) return obj.result != null ? String(obj.result) : "";
    if ("richText" in obj && Array.isArray(obj.richText))
      return obj.richText.map((rt: any) => rt.text).join("");
    if ("text" in obj) return String(obj.text);
    if ("error" in obj) return "";
    return "";
  }
  return raw.toString();
}

function parseRow(
  row: ExcelJS.Row,
  headerMap: Record<string, number>,
  rowNumber: number,
  lookupMaps: LookupMaps,
): ParsedEmployeeRow {
  const values: Record<string, unknown> = {};

  for (const colDef of COLUMN_DEFS) {
    const colIndex = headerMap[colDef.key];
    if (!colIndex) continue;

    const cell = row.getCell(colIndex);
    const raw = cell.value;

    if (raw === null || raw === undefined || raw === "") {
      values[colDef.key] = undefined;
      continue;
    }

    const strVal = extractCellString(raw).trim();

    switch (colDef.type) {
      case "text":
      case "lookup":
      case "multiLookup":
        values[colDef.key] = strVal.trim();
        break;
      case "number": {
        const num = Number(strVal);
        if (Number.isNaN(num)) {
          throw new BusinessRuleError(
            `Invalid number in column "${colDef.header}" at row ${rowNumber}`,
          );
        }
        values[colDef.key] = num;
        break;
      }
      case "date": {
        const parsedDate = parseDdMmYyyy(strVal.trim());
        if (!parsedDate) {
          throw new BusinessRuleError(
            `Invalid date format in column "${colDef.header}" at row ${rowNumber}. Expected DD-MM-YYYY.`,
          );
        }
        values[colDef.key] = parsedDate;
        break;
      }
      case "boolean": {
        const upper = strVal.trim().toUpperCase();
        if (upper === "TRUE") values[colDef.key] = true;
        else if (upper === "FALSE") values[colDef.key] = false;
        else {
          throw new BusinessRuleError(
            `Invalid boolean in column "${colDef.header}" at row ${rowNumber}. Use TRUE/FALSE.`,
          );
        }
        break;
      }
      case "enum":
        values[colDef.key] = strVal.trim();
        break;
      default:
        values[colDef.key] = strVal;
    }
  }

  // Map names → ObjectIds using lookupMaps

  // Designation
  const designationName = (values["designation"] ?? "") as string;
  const designationId = lookupMaps.designationByName.get(
    designationName.trim(),
  );

  if (!designationId) {
    throw new BusinessRuleError(
      `Unknown designation "${designationName}" at row ${rowNumber}`,
    );
  }

  // Department
  const departmentName = (values["department"] ?? "") as string;
  const departmentId = lookupMaps.departmentByName.get(departmentName.trim());
  if (!departmentId) {
    throw new BusinessRuleError(
      `Unknown department "${departmentName}" at row ${rowNumber}`,
    );
  }

  // Shift
  let shiftId: Types.ObjectId | undefined;
  if (values["shiftId"]) {
    const shiftName = (values["shiftId"] ?? "") as string;
    shiftId = lookupMaps.shiftByName.get(shiftName.trim());
    if (!shiftId) {
      throw new BusinessRuleError(
        `Unknown shift "${shiftName}" at row ${rowNumber}`,
      );
    }
  }

  // Roles (multiLookup, comma-separated)
  const roleIds: Types.ObjectId[] = [];
  if (values["roleIds"]) {
    const rawRoles = (values["roleIds"] as string).split(",");
    for (const r of rawRoles) {
      const name = r.trim();
      if (!name) continue;
      const id = lookupMaps.roleByName.get(name);
      if (!id) {
        throw new BusinessRuleError(
          `Unknown role "${name}" at row ${rowNumber}`,
        );
      }
      roleIds.push(id);
    }
  }

  // Leave policies (multiLookup, comma-separated)
  const leavepolicy: Types.ObjectId[] = [];
  if (values["leavepolicy"]) {
    const rawPolicies = (values["leavepolicy"] as string).split(",");
    for (const p of rawPolicies) {
      const name = p.trim();
      if (!name) continue;
      const id = lookupMaps.leavePolicyByName.get(name);
      if (!id) {
        throw new BusinessRuleError(
          `Unknown leave policy "${name}" at row ${rowNumber}`,
        );
      }
      leavepolicy.push(id);
    }
  }

  if (leavepolicy.length === 0) {
    throw new BusinessRuleError(
      `At least one leave policy is required at row ${rowNumber}`,
    );
  }

  // Reporting manager
  let reportingManagerId: Types.ObjectId | undefined;
  if (values["reportingManagerId"]) {
    const fullName = (values["reportingManagerId"] ?? "") as string;
    const id = lookupMaps.managerByFullName.get(fullName.trim());
    if (!id) {
      throw new BusinessRuleError(
        `Unknown reporting manager "${fullName}" at row ${rowNumber}`,
      );
    }
    reportingManagerId = id;
  }

  const employee: Omit<Employee, "companyId" | "createdAt" | "updatedAt"> = {
    data: {
      basic: {
        employeeId: (values["employeeId"] ?? "") as string,
        firstName: (values["firstName"] ?? "") as string,
        lastName: (values["lastName"] ?? "") as string,
        email: (values["email"] ?? "") as string,
        phone: (values["phone"] ?? "") as string,
        gender: values["gender"] as any,
        dateOfBirth: values["dateOfBirth"] as Date | undefined,
      },
      job: {
        designation: designationId,
        department: departmentId,
        employmentType: values["employmentType"] as any,
        roleIds,
        dateOfJoining: (values["dateOfJoining"] as Date)!,
        reportingManagerId,
        workLocation: (values["workLocation"] ?? "") as string,
        employeeStatus: values["employeeStatus"] as any,
        shiftId,
        attendanceMode: values["attendanceMode"] as any,
        leavepolicy,
        dateOfExit: values["dateOfExit"] as Date | undefined,
        exitReason: values["exitReason"] as string | undefined,
        fullAndFinalSettled: false,
      },
      address: {
        currentAddress: (values["currentAddress"] ?? "") as string,
        permanentAddress: values["permanentAddress"] as string | undefined,
        city: (values["city"] ?? "") as string,
        state: (values["state"] ?? "") as string,
        country: (values["country"] ?? "") as string,
        postalCode: (values["postalCode"] ?? "") as string,
      },
      bank:
        values["bankName"] || values["accountNumber"]
          ? {
              bankName: (values["bankName"] ?? "") as string,
              accountNumber: (values["accountNumber"] ?? "") as string,
              ifscCode: values["ifscCode"] as string | undefined,
              branch: values["branch"] as string | undefined,
            }
          : undefined,
      legal:
        values["panNumber"] || values["aadhaarNumber"] || values["uan"]
          ? {
              panNumber: values["panNumber"] as string | undefined,
              aadhaarNumber: values["aadhaarNumber"] as string | undefined,
              uan: values["uan"] as string | undefined,
            }
          : undefined,
      payroll:
        values["payrollId"] || values["payslipPreference"]
          ? {
              payrollId: values["payrollId"] as string | undefined,
              payrollGroupId: undefined,
              payslipPreference: values["payslipPreference"] as any,
            }
          : undefined,
      tax:
        values["taxRegime"] ||
        typeof values["taxDeclarationSubmitted"] === "boolean"
          ? {
              taxRegime: values["taxRegime"] as any,
              taxDeclarationSubmitted: (values["taxDeclarationSubmitted"] ??
                false) as boolean,
            }
          : undefined,
      documents: [],
    },
    meta: {
      version: 1,
      isDeleted: false,
      auditTrail: [],
    },
  };

  return { rowNumber, employee };
}

function parseDdMmYyyy(value: string): Date | null {
  const parts = value.split("-");
  if (parts.length !== 3) return null;

  const [ddStr, mmStr, yyyyStr] = parts;
  const dd = Number(ddStr);
  const mm = Number(mmStr);
  const yyyy = Number(yyyyStr);

  if (!dd || !mm || !yyyy) return null;

  const date = new Date(yyyy, mm - 1, dd);
  if (
    date.getFullYear() !== yyyy ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }
  return date;
}
