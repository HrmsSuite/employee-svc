export class SalaryFormulaHelper {
  /**
   * Allowed formula variables.
   *
   * Component codes such as BASIC, HRA, PF etc.
   * are also allowed and are validated separately
   * against existing salary components.
   */
  private static readonly ALLOWED_VARIABLES = new Set([
    "BASIC",
    "GROSS",
    "CTC",
    "NET",
    "WORKING_DAYS",
    "PAID_DAYS",
    "ABSENT_DAYS",
    "OVERTIME_HOURS",
  ]);

  /**
   * Validate basic formula syntax.
   *
   * This intentionally does NOT use eval().
   */
  public static validateSyntax(formula: string): void {
    const value = formula.trim();

    if (!value) {
      throw new Error("Formula cannot be empty");
    }

    if (value.length > 500) {
      throw new Error("Formula cannot exceed 500 characters");
    }

    // Only allow:
    // A-Z
    // numbers
    // spaces
    // decimal point
    // arithmetic operators
    // parentheses
    // underscore
    const invalidCharacters = /[^A-Z0-9_+\-*/().%\s]/i;

    if (invalidCharacters.test(value)) {
      throw new Error(
        "Formula contains invalid characters. Only variables, numbers, operators and parentheses are allowed.",
      );
    }

    // Basic balanced-parentheses check
    let depth = 0;

    for (const char of value) {
      if (char === "(") depth++;

      if (char === ")") {
        depth--;

        if (depth < 0) {
          throw new Error("Formula contains unmatched parentheses");
        }
      }
    }

    if (depth !== 0) {
      throw new Error("Formula contains unmatched parentheses");
    }
  }

  /**
   * Extract variable names from a formula.
   */
  public static extractVariables(formula: string): string[] {
    const variables = formula.match(/[A-Z_][A-Z0-9_]*/gi) ?? [];

    return [...new Set(variables.map((value) => value.toUpperCase()))];
  }
}
