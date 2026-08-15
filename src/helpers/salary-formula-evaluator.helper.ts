import { Parser } from "expr-eval";
import { AppError } from "./error";

export interface SalaryFormulaVariables {
  [key: string]: number;
}

export class SalaryFormulaEvaluator {
  public static evaluate(
    formula: string,
    variables: SalaryFormulaVariables,
  ): number {
    try {
      const parser = new Parser();

      const expression = parser.parse(formula);

      const result = expression.evaluate(variables);

      if (typeof result !== "number" || !Number.isFinite(result)) {
        throw new AppError(
          "Formula did not produce a valid numeric result",
          400,
          "INVALID_FORMULA_RESULT",
        );
      }

      return Math.round(result * 100) / 100;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Unable to evaluate salary formula: ${formula}`,
        400,
        "FORMULA_EVALUATION_ERROR",
      );
    }
  }
}
