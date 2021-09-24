import { BigInt, log } from '@graphprotocol/graph-ts';
import {
  Account,
  AccountFundPosition,
  AccountFundPositionUpdate,
  Transaction,
  Fund,
} from '../../generated/schema';
import { BIGINT_ZERO } from './constants';
import * as fundUpdateLibrary from './fund-update';

function incrementOrder(order: BigInt): BigInt {
  return order.plus(BigInt.fromI32(1));
}

export function buildIdFromAccountFundAndOrder(
  account: Account,
  fund: Fund,
  newOrder: BigInt
): string {
  return account.id.concat(
    '-'.concat(fund.id.concat('-'.concat(newOrder.toString())))
  );
}

export function createAccountFundPositionUpdate(
  id: string,
  newOrder: BigInt,
  account: Account,
  fund: Fund,
  accountFundPositionId: string,
  transaction: Transaction,
  deposits: BigInt,
  withdrawals: BigInt,
  sharesMinted: BigInt,
  sharesBurnt: BigInt,
  sharesSent: BigInt,
  sharesReceived: BigInt,
  tokensSent: BigInt,
  tokensReceived: BigInt,
  balanceShares: BigInt,
  balancePosition: BigInt
): AccountFundPositionUpdate {
  log.info(
    '[FundPositionUpdate] Creating account {} fund position update (order {}) with id {}',
    [account.id, newOrder.toString(), id]
  );
  let accountFundPositionUpdate = new AccountFundPositionUpdate(id);
  accountFundPositionUpdate.order = newOrder;
  accountFundPositionUpdate.account = account.id;
  accountFundPositionUpdate.accountFundPosition = accountFundPositionId;
  accountFundPositionUpdate.timestamp = transaction.timestamp;
  accountFundPositionUpdate.blockNumber = transaction.blockNumber;
  accountFundPositionUpdate.transaction = transaction.id;
  accountFundPositionUpdate.deposits = deposits;
  accountFundPositionUpdate.withdrawals = withdrawals;
  accountFundPositionUpdate.sharesMinted = sharesMinted;
  accountFundPositionUpdate.sharesBurnt = sharesBurnt;
  accountFundPositionUpdate.sharesSent = sharesSent;
  accountFundPositionUpdate.sharesReceived = sharesReceived;
  accountFundPositionUpdate.tokensSent = tokensSent;
  accountFundPositionUpdate.tokensReceived = tokensReceived;
  accountFundPositionUpdate.balanceShares = balanceShares;
  accountFundPositionUpdate.balancePosition = balancePosition;
  accountFundPositionUpdate.fundUpdate = fundUpdateLibrary.buildIdFromFundAndTransaction(
    fund,
    transaction
  );
  accountFundPositionUpdate.save();
  return accountFundPositionUpdate;
}

export function createFirst(
  account: Account,
  fund: Fund,
  fundPositionId: string,
  newAccountFundPositionOrder: BigInt,
  transaction: Transaction,
  depositedTokens: BigInt,
  receivedShares: BigInt,
  balanceShares: BigInt,
  balancePosition: BigInt
): AccountFundPositionUpdate {
  log.debug('[FundPositionUpdate] Create first', []);
  let id = buildIdFromAccountFundAndOrder(
    account,
    fund,
    newAccountFundPositionOrder
  );
  let accountFundPositionFirstUpdate = AccountFundPositionUpdate.load(id);
  if (accountFundPositionFirstUpdate == null) {
    // We always should create an update.
    accountFundPositionFirstUpdate = createAccountFundPositionUpdate(
      id,
      newAccountFundPositionOrder,
      account,
      fund,
      fundPositionId,
      transaction,
      depositedTokens,
      BIGINT_ZERO,
      receivedShares,
      BIGINT_ZERO,
      BIGINT_ZERO,
      BIGINT_ZERO,
      BIGINT_ZERO,
      BIGINT_ZERO,
      balanceShares,
      balancePosition
    );
  } else {
    log.warning(
      'INVALID Deposit First: update FOUND (shouldnt) UpdateID {} Account {}',
      [id, account.id]
    );
  }

  return accountFundPositionFirstUpdate!;
}

export function getNewOrder(id: string, txHash: string): BigInt {
  log.info(
    '[AccountFundPositionUpdate] Getting new order for id {} (tx: {}).',
    [id, txHash]
  );
  if (id === null) {
    log.info(
      '[AccountFundPositionUpdate] Id is null. New order value is 0 (tx: {}).',
      [txHash]
    );
    return BIGINT_ZERO;
  }
  let latestAccountFundPositionUpdate = AccountFundPositionUpdate.load(id);
  let newOrder = BIGINT_ZERO;

  if (latestAccountFundPositionUpdate !== null) {
    newOrder = incrementOrder(latestAccountFundPositionUpdate.order);
  } else {
    log.warning(
      'INVALID Deposit: latestUpdateID NOT found (shouldnt) !== LatestUpdateID {} tx: {}',
      [id, txHash]
    );
  }
  return newOrder;
}

export function deposit(
  account: Account,
  fund: Fund,
  fundPositionId: string,
  latestUpdateId: string,
  transaction: Transaction,
  depositedTokens: BigInt,
  receivedShares: BigInt,
  balanceShares: BigInt,
  balancePosition: BigInt
): AccountFundPositionUpdate {
  log.debug(
    '[FundPositionUpdate] Deposit. Creating new account fund position update. Account {} Fund {}',
    [account.id, fund.id]
  );
  let newAccountFundPositionUpdateOrder = getNewOrder(
    latestUpdateId,
    transaction.hash.toHexString()
  );

  let id = buildIdFromAccountFundAndOrder(
    account,
    fund,
    newAccountFundPositionUpdateOrder
  );
  let accountFundPositionUpdate = AccountFundPositionUpdate.load(id);
  if (accountFundPositionUpdate == null) {
    accountFundPositionUpdate = createAccountFundPositionUpdate(
      id,
      newAccountFundPositionUpdateOrder,
      account,
      fund,
      fundPositionId,
      transaction,
      depositedTokens,
      BIGINT_ZERO,
      receivedShares,
      BIGINT_ZERO,
      BIGINT_ZERO,
      BIGINT_ZERO,
      BIGINT_ZERO,
      BIGINT_ZERO,
      balanceShares,
      balancePosition
    );
  } else {
    log.warning(
      'INVALID Deposit: update FOUND (shouldnt) UpdateID {} Account {} TX {}',
      [id, account.id, transaction.hash.toHexString()]
    );
  }

  return accountFundPositionUpdate!;
}

export function transfer(
  accountFundPositionUpdateId: string,
  newAccountFundPositionOrder: BigInt,
  createFirstAccountFundPositionUpdate: boolean,
  accountFundPosition: AccountFundPosition,
  account: Account,
  receivingTransfer: boolean,
  fund: Fund,
  tokenAmount: BigInt,
  shareAmount: BigInt,
  balanceShares: BigInt,
  balancePosition: BigInt,
  transaction: Transaction
): void {
  log.info(
    '[AccountFundPositionUpdate] Transfer. Processing account {} for fund position {} and order {} in TX {}',
    [
      account.id,
      accountFundPosition.id,
      newAccountFundPositionOrder.toString(),
      transaction.hash.toHexString(),
    ]
  );
  if (createFirstAccountFundPositionUpdate) {
    log.info(
      '[AccountFundPositionUpdate] Transfer. Account fund position (first time - latestUpdate is null -). Account fund position id {}',
      [accountFundPosition.id]
    );
    createAccountFundPositionUpdate(
      accountFundPositionUpdateId,
      newAccountFundPositionOrder,
      account,
      fund,
      accountFundPosition.id,
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
  } else {
    log.info(
      '[AccountFundPositionUpdate] Transfer. Account fund position {}. Latest update is {}.',
      [accountFundPosition.id, accountFundPosition.latestUpdate]
    );
    let latestAccountFundPositionUpdate = AccountFundPositionUpdate.load(
      accountFundPosition.latestUpdate
    );
    if (latestAccountFundPositionUpdate !== null) {
      let id = buildIdFromAccountFundAndOrder(
        account,
        fund,
        newAccountFundPositionOrder
      );
      log.info(
        '[AccountFundPositionUpdate] Transfer. Creating account fund position update (id {}) for position id {}',
        [id, accountFundPosition.id]
      );
      createAccountFundPositionUpdate(
        id,
        newAccountFundPositionOrder,
        account,
        fund,
        accountFundPosition.id,
        transaction,
        BIGINT_ZERO, // deposits
        BIGINT_ZERO, // withdrawals
        BIGINT_ZERO, // sharesMinted
        BIGINT_ZERO, // sharesBurnt
        receivingTransfer ? BIGINT_ZERO : shareAmount,
        receivingTransfer ? shareAmount : BIGINT_ZERO,
        receivingTransfer ? BIGINT_ZERO : tokenAmount,
        receivingTransfer ? tokenAmount : BIGINT_ZERO,
        balanceShares,
        balancePosition
      );
    } else {
      log.warning('INVALID Transfer: update FOUND (shouldnt) {} Account {}', [
        accountFundPosition.latestUpdate,
        account.id,
      ]);
    }
  }
}
