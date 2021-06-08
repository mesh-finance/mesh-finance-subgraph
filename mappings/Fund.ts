import { Deposit as DepositEvent, Withdraw as WithdrawEvent, HardWorkDone } from '../generated/templates/Fund/Fund'
import { Transfer as TransferEvent } from '../generated/templates/Fund/Fund'
import { Deposit, Withdrawal, HardWork, Transaction, FundUpdate } from '../generated/schema'
import { getOrCreateFund } from './FundFactory'
import { Address, log, BigInt } from '@graphprotocol/graph-ts'
import {
  getOrCreateTransactionFromEvent,
} from './utils/transaction';

import { Fund as FundContract } from '../generated/templates/Fund/Fund'

import * as tokenLibrary from './utils/token';
import * as accountLibrary from './utils/accounts';
import * as transferLibrary from './utils/transfer';
import * as fundUpdateLibrary from './utils/fund-update';
import { ZERO_ADDRESS, BIGINT_ZERO } from './utils/constants';


export function handleDeposit(event: DepositEvent): void {

    log.info(
        '[Transaction] Get or create transaction for hash {} Tx Index: {}',
        [
          event.transaction.hash.toHexString(),
          event.transaction.index.toString(),
        ]
    );
    let ethTransaction = getOrCreateTransactionFromEvent(event, 'DepositEvent');
    let to = ethTransaction.to as Address;
    let fundContract = FundContract.bind(to);
    let totalAssets = fundContract.totalValueLocked();
    let totalSupply = fundContract.totalSupply();
    let inputAmount = event.params.amount;
    let shares = 1 as BigInt;
//     let shares = totalAssets.equals(BIGINT_ZERO)
//       ? inputAmount
//       : inputAmount.times(totalSupply).div(totalAssets);

    deposit(event.params.beneficiary, ethTransaction, event.transaction.from, inputAmount, shares, ethTransaction.timestamp);

}

export function handleWithdrawal(event: WithdrawEvent): void {
    let fund = getOrCreateFund(event.address, false);

    let ethTransaction = getOrCreateTransactionFromEvent(
    event,
    'WithdrawEvent'
    );

    let requiredId = event.address.toHexString()
    .concat('_')
    .concat(event.transaction.hash.toHexString());
    let withdrawal = new Withdrawal(requiredId);
    withdrawal.fund = fund.id;
    withdrawal.account = accountLibrary.getOrCreate(event.params.beneficiary).id;
    withdrawal.amount = event.params.amount;
    withdrawal.withdrawalFee = event.params.fee;
    withdrawal.timestamp = event.block.timestamp;
    withdrawal.transaction = ethTransaction.id;
    withdrawal.save();
}

export function handleHardWork(event: HardWorkDone): void {
    let fund = getOrCreateFund(event.address, false);
    let ethTransaction = getOrCreateTransactionFromEvent(
    event,
    'HardWorkEvent'
    );

    let requiredId = event.address.toHexString()
    .concat('_')
    .concat(event.transaction.hash.toHexString())
    let hardWork = new HardWork(requiredId);
    hardWork.fund = fund.id;
    hardWork.totalValueLocked = event.params.totalValueLocked;
    hardWork.pricePerShare = event.params.pricePerShare;
    hardWork.timestamp = event.block.timestamp;
    hardWork.transaction = ethTransaction.id;
    hardWork.save();
}

export function handleTransfer(event: TransferEvent): void {
  log.info('[Fund mappings] Handle transfer: From: {} - To: {}. TX hash: {}', [
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.transaction.hash.toHexString(),
  ]);
  if (
    event.params.from.toHexString() != ZERO_ADDRESS &&
    event.params.to.toHexString() != ZERO_ADDRESS
  ) {
    log.info(
      '[Fund mappings] Processing transfer: From: {} - To: {}. TX hash: {}',
      [
        event.params.from.toHexString(),
        event.params.to.toHexString(),
        event.transaction.hash.toHexString(),
      ]
    );
    let transaction = getOrCreateTransactionFromEvent(
      event,
      'TransferEvent'
    );
    let fundContract = FundContract.bind(event.address);
    let totalAssets = fundContract.totalValueLocked();
    let totalSupply = fundContract.totalSupply();
    let sharesAmount = event.params.value;
    let amount = sharesAmount.times(totalAssets).div(totalSupply);
    // share  = (amount * totalSupply) / totalAssets
    // amount = (shares * totalAssets) / totalSupply
    transfer(
      fundContract,
      event.params.to,
      event.params.from,
      amount,
      fundContract.underlying(),
      sharesAmount,
      event.address,
      transaction
    );
  } else {
    log.info(
      '[fund mappings] Not processing transfer: From: {} - To: {}. TX hash: {}',
      [
        event.params.from.toHexString(),
        event.params.to.toHexString(),
        event.transaction.hash.toHexString(),
      ]
    );
  }
}

export function transfer(
  fundContract: FundContract,
  from: Address,
  to: Address,
  amount: BigInt,
  tokenAddress: Address,
  shareAmount: BigInt,
  fundAddress: Address,
  transaction: Transaction
): void {
  let token = tokenLibrary.getOrCreateToken(tokenAddress);
  let shareToken = tokenLibrary.getOrCreateToken(fundAddress);

  let fromAccount = accountLibrary.getOrCreate(from);
  let toAccount = accountLibrary.getOrCreate(to);
  let fund = getOrCreateFund(fundAddress, false);
  transferLibrary.getOrCreate(
    fromAccount,
    toAccount,
    fund,
    token,
    amount,
    shareToken,
    shareAmount,
    transaction
  );

//   accountfundPositionLibrary.transfer(
//     fundContract,
//     fromAccount,
//     toAccount,
//     fund,
//     amount,
//     shareAmount,
//     transaction
//   );
}

function deposit(
  fundAddress: Address,
  transaction: Transaction,
  receiver: Address,
  depositedAmount: BigInt,
  sharesMinted: BigInt,
  timestamp: BigInt
): void {
  log.debug('[Fund] Deposit', []);
  let fundContract = FundContract.bind(fundAddress);
  let account = accountLibrary.getOrCreate(receiver);
//   let pricePerShare = fundContract.getPricePerShare();
  let fund = getOrCreateFund(fundAddress, false);


//   accountfundPositionLibrary.deposit(
//     fundContract,
//     account,
//     fund,
//     transaction,
//     depositedAmount,
//     sharesMinted
//   );


    let requiredId = fundAddress.toHexString()
    .concat('_')
    .concat(transaction.hash.toHexString());
    let deposit = new Deposit(requiredId);
    deposit.fund = fund.id;
    deposit.account = account.id;
    deposit.amount = depositedAmount;
    deposit.timestamp = timestamp;
    deposit.transaction = transaction.id;
    deposit.sharesMinted = sharesMinted;
    deposit.save();
    log.info('handleDeposit: Fund in deposit {}', [deposit.fund]);

//   let fundUpdate: FundUpdate;
//   let balancePosition = getBalancePosition(fundContract);
//   if (fund.latestUpdate == null) {
//     fundUpdate = fundUpdateLibrary.firstDeposit(
//       fund,
//       transaction,
//       depositedAmount,
//       sharesMinted,
//       pricePerShare,
//       balancePosition
//     );
//   } else {
//     fundUpdate = fundUpdateLibrary.deposit(
//       fund,
//       transaction,
//       depositedAmount,
//       sharesMinted,
//       pricePerShare,
//       balancePosition
//     );
//   }

//   updatefundDayData(
//     fund,
//     fundContract.token(),
//     timestamp,
//     pricePerShare,
//     depositedAmount,
//     BIGINT_ZERO,
//     fundUpdate.returnsGenerated
//   );

//   fund.latestUpdate = fundUpdate.id;
//   fund.balanceTokens = fund.balanceTokens.plus(depositedAmount);
//   fund.balanceTokensIdle = fund.balanceTokensIdle.plus(depositedAmount);
//   fund.sharesSupply = fund.sharesSupply.plus(sharesMinted);

  fund.save();
}

function getBalancePosition(fundContract: FundContract): BigInt {
  let totalAssets = fundContract.totalValueLocked();
  let pricePerShare = fundContract.getPricePerShare();
  let decimals = u8(fundContract.decimals());
  return totalAssets.times(pricePerShare).div(BigInt.fromI32(10).pow(decimals));
}