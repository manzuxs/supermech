import { validateState as validateSchemaState } from '@supermech/schema';
import type { ValidationResult } from '@supermech/schema';

export type { ValidationResult } from '@supermech/schema';

export function validateState(data: unknown): ValidationResult {
  return validateSchemaState(data);
}
