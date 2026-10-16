import type { AccessAction } from '../services/access';
import { roleAction } from '../../shared/app-roles.mjs';
import { useAppRole } from './useAppRole';
export function useAccess(action: AccessAction) {
  return roleAction(useAppRole(), action);
}
