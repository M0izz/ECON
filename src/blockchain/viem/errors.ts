import { BaseError, ContractFunctionRevertedError } from 'viem';

export interface DecodedEconError {
  isEconError: boolean;
  code: string;
  message: string;
  reason?: string;
}

export function decodeMonadTxError(error: unknown): DecodedEconError {
  if (error instanceof BaseError) {
    const revertError = error.walk((err) => err instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName || 'Reverted';
      const reason = revertError.reason || revertError.shortMessage;
      return {
        isEconError: true,
        code: `MONAD_${errorName.toUpperCase()}`,
        message: `Monad EVM transaction reverted: ${reason}`,
        reason,
      };
    }
    return {
      isEconError: false,
      code: 'VIEM_EXECUTION_ERROR',
      message: error.shortMessage || error.message,
    };
  }

  if (error instanceof Error) {
    return {
      isEconError: false,
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  return {
    isEconError: false,
    code: 'GENERIC_FAILURE',
    message: String(error),
  };
}
