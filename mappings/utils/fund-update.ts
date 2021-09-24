import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { Transaction, Fund, FundUpdate } from '../../generated/schema';
import { BIGINT_ZERO } from './constants';

export function buildIdFromFundTxHashAndIndex(
  fund: string,
  transactionHash: string,
  transactionIndex: string
): string {
  return fund
    .concat('-')
    .concat(transactionHash.concat('-').concat(transactionIndex));
}

export function buildIdFromFundAndTransaction(
  fund: Fund,
  transaction: Transaction
): string {
  return buildIdFromFundTxHashAndIndex(
    fund.id,
    transaction.id,
    transaction.index.toString()
  );
}

function createFundUpdate(
  id: string,
  fund: Fund,
  transaction: Transaction,
  tokensDeposited: BigInt,
  tokensWithdrawn: BigInt,
  sharesMinted: BigInt,
  sharesBurnt: BigInt,
  pricePerShare: BigInt,
  totalFees: BigInt,
  withdrawalFees: BigInt,
  totalValueLocked: BigInt,
): FundUpdate {
  log.debug('[FundUpdate] Creating fund update with id {}', [fund.id]);
  let fundUpdate = new FundUpdate(id);
  fundUpdate.timestamp = transaction.timestamp;
  fundUpdate.blockNumber = transaction.blockNumber;
  fundUpdate.transaction = transaction.id;
  fundUpdate.fund = fund.id;
  // Balances & Shares
  fundUpdate.tokensDeposited = tokensDeposited;
  fundUpdate.tokensWithdrawn = tokensWithdrawn;
  fundUpdate.sharesMinted = sharesMinted;
  fundUpdate.sharesBurnt = sharesBurnt;
  // Performance
  fundUpdate.pricePerShare = pricePerShare;
  fundUpdate.totalFees = totalFees;
  fundUpdate.withdrawalFees = withdrawalFees;
  fundUpdate.totalValueLocked = totalValueLocked;

  if (fund.balanceTokens.gt(totalValueLocked)) {
    fundUpdate.returnsGenerated = totalValueLocked;
  } else {
    fundUpdate.returnsGenerated = totalValueLocked.minus(fund.balanceTokens);
  }

  fundUpdate.save();
  return fundUpdate;
}

export function firstDeposit(
  fund: Fund,
  transaction: Transaction,
  depositedAmount: BigInt,
  sharesMinted: BigInt,
  pricePerShare: BigInt,
  totalValueLocked: BigInt
): FundUpdate {
  log.debug('[FundUpdate] First deposit', []);
  let fundUpdateId = buildIdFromFundAndTransaction(fund, transaction);
  let fundUpdate = FundUpdate.load(fundUpdateId);

  if (fundUpdate === null) {
    fundUpdate = createFundUpdate(
      fundUpdateId,
      fund,
      transaction,
      depositedAmount,
      BIGINT_ZERO,
      sharesMinted,
      BIGINT_ZERO,
      pricePerShare,
      BIGINT_ZERO,
      BIGINT_ZERO,
      totalValueLocked
    );
  }

  return fundUpdate!;
}

export function deposit(
  fund: Fund,
  transaction: Transaction,
  depositedAmount: BigInt,
  sharesMinted: BigInt,
  pricePerShare: BigInt,
  totalValueLocked: BigInt
): FundUpdate {
  log.debug('[FundUpdate] Deposit', []);
  let fundUpdateId = buildIdFromFundAndTransaction(fund, transaction);
  let fundUpdate = FundUpdate.load(fundUpdateId);
  let latestFundUpdate = FundUpdate.load(fund.latestUpdate);

  if (fundUpdate === null) {
    fundUpdate = createFundUpdate(
      fundUpdateId,
      fund,
      transaction,
      depositedAmount,
      BIGINT_ZERO, // TokensWithdrawn
      sharesMinted,
      BIGINT_ZERO, // SharesBurnt,
      pricePerShare,
      latestFundUpdate.totalFees,
      latestFundUpdate.withdrawalFees,
      totalValueLocked
    );
  }

  return fundUpdate!;
}

export function withdraw(
  fund: Fund,
  latestFundUpdate: FundUpdate,
  pricePerShare: BigInt,
  withdrawnAmount: BigInt,
  sharesBurnt: BigInt,
  transaction: Transaction,
  totalValueLocked: BigInt
): FundUpdate {
  let fundUpdateId = buildIdFromFundAndTransaction(fund, transaction);
  let newFundUpdate = createFundUpdate(
    fundUpdateId,
    fund,
    transaction,
    BIGINT_ZERO, // TokensDeposited
    withdrawnAmount,
    BIGINT_ZERO, // SharesMinted
    sharesBurnt,
    pricePerShare,
    latestFundUpdate.totalFees,
    latestFundUpdate.withdrawalFees,
    totalValueLocked
  );
  fund.sharesSupply = fund.sharesSupply.minus(sharesBurnt);
  fund.balanceTokens = fund.balanceTokens.minus(withdrawnAmount);
  fund.balanceTokensIdle = fund.balanceTokensIdle.minus(withdrawnAmount);

  fund.latestUpdate = newFundUpdate.id;
  fund.save();
  return newFundUpdate;
}


export function withdrawalFeeUpdated(
  fund: Fund,
  transaction: Transaction,
  latestFundUpdate: FundUpdate,
  totalValueLocked: BigInt,
  performanceFee: BigInt
): FundUpdate {
  let fundUpdateId = buildIdFromFundAndTransaction(fund, transaction);
  let newFundUpdate = createFundUpdate(
    fundUpdateId,
    fund,
    transaction,
    BIGINT_ZERO, // TokensDeposited
    BIGINT_ZERO, // TokensWithdrawn
    BIGINT_ZERO, // SharesMinted
    BIGINT_ZERO, // SharesBurnt
    latestFundUpdate.pricePerShare,
    latestFundUpdate.totalFees,
    BIGINT_ZERO,
    withdrawalFees,
    totalValueLocked
  );
  return newFundUpdate;
}

export function hardwork(
  fund: Fund,
  latestFundUpdate: FundUpdate,
  pricePerShare: BigInt,
  transaction: Transaction,
  totalValueLocked: BigInt
): FundUpdate {
  let fundUpdateId = buildIdFromFundAndTransaction(fund, transaction);
  let newFundUpdate = createFundUpdate(
    fundUpdateId,
    fund,
    transaction,
    BIGINT_ZERO, // TokensDeposited
    BIGINT_ZERO,
    BIGINT_ZERO, // SharesMinted
    BIGINT_ZERO,
    pricePerShare,
    latestFundUpdate.totalFees,
    latestFundUpdate.withdrawalFees,
    totalValueLocked
  );
//   fund.sharesSupply = fund.sharesSupply.minus(sharesBurnt);
//   fund.balanceTokens = fund.balanceTokens.minus(withdrawnAmount);
//   fund.balanceTokensIdle = fund.balanceTokensIdle.minus(withdrawnAmount);

  fund.latestUpdate = newFundUpdate.id;
  fund.save();
  return newFundUpdate;
}
