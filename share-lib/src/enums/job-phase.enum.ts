export enum JobPhaseEnum {
  WAITING_DISPATCH = 'waiting_dispatch',
  WAITING_WORKER = 'waiting_worker',
  WAITING_RETRY = 'waiting_retry',
  CALLING_AI = 'calling_ai',
  SAVING_RESULT = 'saving_result',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
