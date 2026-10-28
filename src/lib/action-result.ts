export interface OperationResult {
  success: boolean;
  error: string | null;
}

export interface ActionResult<T = null> extends OperationResult {
  data: T;
}
