import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import {
  Account,
  AccountFundPosition,
  AccountFundPositionUpdate,
  Token,
  Transaction,
  Fund,
} from '../../../generated/schema';
import { Fund as FundContract } from '../../../generated/templates/Fund';
import * as fundPositionUpdateLibrary from './fund-position-update';
import { BIGINT_ZERO, ZERO_ADDRESS } from './constants';

export function buildId(account: Account, fund: Fund): string {
  return account.id.concat('-').concat(fund.id);
}

export function getOrCreate(
  account: Account,
  fund: Fund,
  balanceShares: BigInt,
  balanceTokens: BigInt,
  balancePosition: BigInt,
  balanceProfit: BigInt,
  latestUpdateId: string,
  transaction: Transaction
): AccountFundPosition {
  let txHash = transaction.hash.toHexString();
  log.info(
    '[AccountFundPosition-getOrCreate] Getting account {} fund {} position. TX: {}',
    [account.id, fund.id, txHash]
  );
  let id = buildId(account, fund);
  let accountFundPosition = AccountFundPosition.load(id);
  if (accountFundPosition == null) {
    log.debug(
      '[AccountFundPosition-getOrCreate] Not found. Creating account {} fund {} position. TX: {}',
      [account.id, fund.id, txHash]
    );
    accountFundPosition = new AccountFundPosition(id);
    accountFundPosition.fund = fund.id;
    accountFundPosition.account = account.id;
    accountFundPosition.underlyingToken = fund.underlyingToken;
    accountFundPosition.shareToken = fund.shareToken;
    accountFundPosition.transaction = transaction.id;
    accountFundPosition.balanceTokens = balanceTokens;
    accountFundPosition.balanceShares = balanceShares;
    accountFundPosition.balancePosition = balancePosition;
    accountFundPosition.balanceProfit = balanceProfit;
    accountFundPosition.latestUpdate = latestUpdateId;
    accountFundPosition.save();
  } else {
    log.debug(
      '[AccountFundPosition-getOrCreate] Found. Returning account {} fund {} position id {}. TX: {}',
      [account.id, fund.id, txHash]
    );
  }
  return accountFundPosition!;
}

export function getBalancePosition(
  account: Account,
  fundContract: FundContract
): BigInt {
  log.info('GetBalancePosition account  {} ', [account.id]);
  let pricePerShare = fundContract.getPricePerShare();
  let decimals = fundContract.decimals();
  // (fund.balanceOf(account) * (fund.pricePerShare() / 10**fund.decimals()))
  let balanceShares = fundContract.balanceOf(Address.fromString(account.id));
  let u8Decimals = u8(decimals.toI32());
  let divisor = BigInt.fromI32(10).pow(u8Decimals);
  return balanceShares.times(pricePerShare).div(divisor);
}

export class FundPositionResponse {
  public accountFundPosition: AccountFundPosition;
  public accountFundPositionUpdate: AccountFundPositionUpdate;
  constructor(
    accountFundPosition: AccountFundPosition,
    accountFundPositionUpdate: AccountFundPositionUpdate
  ) {
    this.accountFundPosition = accountFundPosition;
    this.accountFundPositionUpdate = accountFundPositionUpdate;
  }
  static fromValue(
    accountFundPosition: AccountFundPosition,
    accountFundPositionUpdate: AccountFundPositionUpdate
  ): FundPositionResponse {
    return new FundPositionResponse(
      accountFundPosition,
      accountFundPositionUpdate
    );
  }
}

function getBalanceTokens(current: BigInt, withdraw: BigInt): BigInt {
  return withdraw.gt(current) ? BIGINT_ZERO : current.minus(withdraw);
}

export function deposit(
  fundContract: FundContract,
  account: Account,
  fund: Fund,
  transaction: Transaction,
  depositedTokens: BigInt,
  receivedShares: BigInt
): FundPositionResponse {
  log.debug('[FundPosition] Deposit', []);
  // TODO Use getOrCreate function
  let fundPositionId = buildId(account, fund);
  let txHash = transaction.hash.toHexString();
  let accountFundPosition = AccountFundPosition.load(fundPositionId);
  let accountFundPositionUpdate: AccountFundPositionUpdate;
  // TODO Use tokenLibrary.getOrCreate
  let token = Token.load(fund.token) as Token;
  let balanceShares = fundContract.balanceOf(Address.fromString(account.id));
  let balancePosition = getBalancePosition(account, fundContract);
  if (accountFundPosition == null) {
    log.info('Tx: {} Account fund position {} not found. Creating it.', [
      txHash,
      fundPositionId,
    ]);
    accountFundPosition = new AccountFundPosition(fundPositionId);
    accountFundPosition.fund = fund.id;
    accountFundPosition.account = account.id;
    accountFundPosition.token = fund.token;
    accountFundPosition.shareToken = fund.shareToken;
    accountFundPosition.transaction = transaction.id;
    accountFundPosition.balanceTokens = depositedTokens;
    accountFundPosition.balanceShares = receivedShares;
    accountFundPosition.balanceProfit = BIGINT_ZERO;
    accountFundPositionUpdate = fundPositionUpdateLibrary.createFirst(
      account,
      fund,
      fundPositionId,
      BIGINT_ZERO,
      transaction,
      depositedTokens,
      receivedShares,
      balanceShares,
      balancePosition
    );
  } else {
    log.info('Tx: {} Account fund position {} found. Using it.', [
      txHash,
      fundPositionId,
    ]);
    accountFundPosition.balanceTokens = accountFundPosition.balanceTokens.plus(
      depositedTokens
    );
    accountFundPosition.balanceShares = accountFundPosition.balanceShares.plus(
      receivedShares
    );
    accountFundPositionUpdate = fundPositionUpdateLibrary.deposit(
      account,
      fund,
      fundPositionId,
      accountFundPosition.latestUpdate,
      transaction,
      depositedTokens,
      receivedShares,
      balanceShares,
      balancePosition
    );
  }
  accountFundPosition.balancePosition = balancePosition;
  accountFundPosition.latestUpdate = accountFundPositionUpdate.id;
  accountFundPosition.save();

  return FundPositionResponse.fromValue(
    accountFundPosition!,
    accountFundPositionUpdate!
  );
}

export function withdraw(
  fundContract: FundContract,
  accountFundPosition: AccountFundPosition,
  withdrawnAmount: BigInt,
  sharesBurnt: BigInt,
  transaction: Transaction
): AccountFundPositionUpdate {
  let account = Account.load(accountFundPosition.account) as Account;
  let fund = Fund.load(accountFundPosition.fund) as Fund;
  let token = Token.load(fund.token) as Token;
  let balanceShares = fundContract.balanceOf(Address.fromString(account.id));
  let balancePosition = getBalancePosition(account, fundContract);
  let newAccountFundPositionOrder = fundPositionUpdateLibrary.getNewOrder(
    accountFundPosition.latestUpdate,
    transaction.hash.toHexString()
  );

  let accountFundPositionUpdateId = fundPositionUpdateLibrary.buildIdFromAccountFundAndOrder(
    account,
    fund,
    newAccountFundPositionOrder
  );
  let newAccountFundPositionUpdate = fundPositionUpdateLibrary.createAccountFundPositionUpdate(
    accountFundPositionUpdateId,
    newAccountFundPositionOrder,
    account,
    fund,
    accountFundPosition.id,
    transaction,
    BIGINT_ZERO, // deposits
    withdrawnAmount,
    BIGINT_ZERO, // sharesMinted
    sharesBurnt,
    BIGINT_ZERO, // sharesSent
    BIGINT_ZERO, // sharesReceived
    BIGINT_ZERO, // tokensSent
    BIGINT_ZERO, // tokensReceived,
    balanceShares,
    balancePosition
  );
  accountFundPosition.balanceShares = accountFundPosition.balanceShares.minus(
    sharesBurnt
  );
  accountFundPosition.balanceTokens = getBalanceTokens(
    accountFundPosition.balanceTokens,
    withdrawnAmount
  );
  accountFundPosition.balancePosition = balancePosition;
  accountFundPosition.latestUpdate = newAccountFundPositionUpdate.id;
  accountFundPosition.save();
  return newAccountFundPositionUpdate;
}

export function transferForAccount(
  fundContract: FundContract,
  account: Account,
  fund: Fund,
  receivingTransfer: boolean,
  tokenAmount: BigInt,
  shareAmount: BigInt,
  transaction: Transaction
): void {
  let accountFundPositionId = buildId(account, fund);
  let accountFundPosition = AccountFundPosition.load(accountFundPositionId);
  let balanceShares = fundContract.balanceOf(Address.fromString(account.id));
  let balancePosition = getBalancePosition(account, fundContract);
  let latestUpdateId: string;
  let newAccountFundPositionOrder: BigInt;
  if (accountFundPosition == null) {
    newAccountFundPositionOrder = BIGINT_ZERO;
    log.info(
      'GETTING tx {} new order {} for account {} fund position (first latest update)',
      [
        transaction.hash.toHexString(),
        newAccountFundPositionOrder.toString(),
        account.id,
      ]
    );
  } else {
    log.info(
      'GETTING tx {} new order for account {} fund position id {} (latest update {})',
      [
        transaction.hash.toHexString(),
        account.id,
        accountFundPosition.id,
        accountFundPosition.latestUpdate,
      ]
    );
    newAccountFundPositionOrder = fundPositionUpdateLibrary.getNewOrder(
      accountFundPosition.latestUpdate,
      transaction.hash.toHexString()
    );
    log.info(
      'GETTING tx {} new order {} for account {} fund position id {} (latest update {})',
      [
        transaction.hash.toHexString(),
        newAccountFundPositionOrder.toString(),
        account.id,
        accountFundPosition.id,
        accountFundPosition.latestUpdate,
      ]
    );
  }
  latestUpdateId = fundPositionUpdateLibrary.buildIdFromAccountFundAndOrder(
    account,
    fund,
    newAccountFundPositionOrder
  );
  fundPositionUpdateLibrary.createAccountFundPositionUpdate(
    latestUpdateId,
    newAccountFundPositionOrder,
    account,
    fund,
    accountFundPositionId,
    transaction,
    BIGINT_ZERO,
    BIGINT_ZERO,
    BIGINT_ZERO,
    BIGINT_ZERO,
    receivingTransfer ? BIGINT_ZERO : shareAmount,
    receivingTransfer ? shareAmount : BIGINT_ZERO,
    receivingTransfer ? BIGINT_ZERO : tokenAmount,
    receivingTransfer ? tokenAmount : BIGINT_ZERO,
    balanceShares,
    balancePosition
  );

  if (accountFundPosition == null) {
    accountFundPosition = getOrCreate(
      account,
      fund,
      receivingTransfer ? shareAmount : BIGINT_ZERO,
      receivingTransfer ? tokenAmount : BIGINT_ZERO,
      balancePosition,
      BIGINT_ZERO,
      latestUpdateId,
      transaction
    );
  } else {
    accountFundPosition.balanceTokens = getBalanceTokens(
      accountFundPosition.balanceTokens,
      tokenAmount
    );
    accountFundPosition.balanceShares = receivingTransfer
      ? accountFundPosition.balanceShares.plus(shareAmount)
      : accountFundPosition.balanceShares.minus(shareAmount);
    accountFundPosition.balancePosition = balancePosition;
    accountFundPosition.latestUpdate = latestUpdateId;
    accountFundPosition.save();
  }
}

export function transfer(
  fundContract: FundContract,
  fromAccount: Account,
  toAccount: Account,
  fund: Fund,
  tokenAmount: BigInt,
  shareAmount: BigInt,
  transaction: Transaction
): void {
  log.info('[AccountFundPosition] Transfer {} from {} to {} ', [
    tokenAmount.toString(),
    fromAccount.id,
    toAccount.id,
  ]);
  let token = Token.load(fund.token) as Token;

  transferForAccount(
    fundContract,
    fromAccount,
    fund,
    false,
    tokenAmount,
    shareAmount,
    transaction
  );

  transferForAccount(
    fundContract,
    toAccount,
    fund,
    true,
    tokenAmount,
    shareAmount,
    transaction
  );
}
