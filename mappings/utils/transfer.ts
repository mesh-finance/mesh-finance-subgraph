import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import {
  Account,
  Token,
  Transaction,
  Transfer,
  Fund,
} from '../../generated/schema';

export function buildIdFromAccountToAccountAndTransaction(
  fromAccount: Account,
  toAccount: Account,
  transaction: Transaction
): string {
  return fromAccount.id
    .concat('-')
    .concat(toAccount.id.concat('-').concat(transaction.id));
}

export function getOrCreate(
  fromAccount: Account,
  toAccount: Account,
  fund: Fund,
  underlying: Token,
  underlyingAmount: BigInt,
  shareToken: Token,
  shareAmount: BigInt,
  transaction: Transaction
): Transfer {
  log.debug('[Transfer] Get or create', []);
  let id = buildIdFromAccountToAccountAndTransaction(
    fromAccount,
    toAccount,
    transaction
  );

//   let isProtocolFee = false;
//   if (toAccount.id === vault.rewards.toHexString()) {
//     isProtocolFee = true;
//   }
//
//   if (isProtocolFee === false) {
//     let stragey = Strategy.load(toAccount.id);
//     if (stragey !== null) {
//       isProtocolFee = true;
//     }
//   }
//
//   if (isProtocolFee) {
//     yearn.addProtocolFee(tokenAmountUsdc);
//   }

  let transfer = Transfer.load(id);
  if (transfer === null) {
    transfer = new Transfer(id);
    transfer.timestamp = transaction.timestamp;
    transfer.blockNumber = transaction.blockNumber;
    transfer.from = fromAccount.id;
    transfer.to = toAccount.id;
    transfer.fund = fund.id;
    transfer.underlyingAmount = underlyingAmount;
    transfer.underlyingToken = underlying.id;
    transfer.shareToken = shareToken.id;
    transfer.shareAmount = shareAmount;
    transfer.transaction = transaction.id;
//     transfer.isProtocolFee = isProtocolFee;
    transfer.save();
  }

  return transfer!;
}
