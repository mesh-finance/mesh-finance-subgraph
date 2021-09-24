import { Deposit as DepositEvent, Withdraw as WithdrawEvent, HardWorkDone, Transfer as TransferEvent } from '../generated/templates/Fund/Fund'
import { Deposit, Withdrawal, HardWork, Transaction, FundUpdate } from '../generated/schema'
import { getOrCreateFund } from './FundFactory'
import { log, Address, BigInt } from '@graphprotocol/graph-ts'

import * as transactionFactory from './utils/transactions'

import {getOrCreate} from './utils/accounts'

import { Fund as FundContract } from '../generated/templates/Fund/Fund'
import * as tokenLibrary from './utils/tokens'
import * as accountLibrary from './utils/accounts'
import * as fundUpdateLibrary from './utils/fund-update'
import { ZERO_ADDRESS, BIGINT_ZERO, DEFAULT_DECIMALS } from './utils/constants';
import * as depositLibrary from './utils/fund/deposit'
import * as transferLibrary from './utils/fund/transfer'
import * as withdrawLibrary from './utils/fund/withdraw'
import * as utilLibrary from './utils/util'
import * as accountFundPositionLibrary from './utils/account-fund-position'



export function handleDeposit(event: DepositEvent): void {

    let ethTransaction = transactionFactory.getOrCreateTransactionFromEvent(event, 'DepositEvent');
    let fundAddress = event.address;
    let to = event.params.beneficiary;
    let inputAmount = event.params.amount;
    let fundContract = FundContract.bind(fundAddress);
    let totalAssets = utilLibrary.getTotalAssets(fundContract);

    let totalSupply = utilLibrary.getTotalSupply(fundContract);

    let shares = totalAssets.equals(BIGINT_ZERO)
      ? inputAmount
      : inputAmount.times(totalSupply).div(totalAssets);

    depositLibrary.deposit(event.address, fundContract, ethTransaction, event.transaction.from, inputAmount, shares, ethTransaction.timestamp);
}

export function handleWithdrawal(event: WithdrawEvent): void {

    let fundAddress = event.address;
    let fromAddress = event.transaction.from;
    let toAddress = event.params.beneficiary;
    let withdrawnAmount = event.params.amount;
    let transaction = transactionFactory.getOrCreateTransactionFromEvent(event, 'withdrawEvent');
    let timestamp = event.block.timestamp;
    let fundContract = FundContract.bind(fundAddress);
    let withdrawalFee = event.params.fee;

    let totalAssets = utilLibrary.getTotalAssets(fundContract);

    let totalSupply = utilLibrary.getTotalSupply(fundContract);

    let totalSharesBurnt = totalAssets.equals(BIGINT_ZERO)
      ? withdrawnAmount
      : withdrawnAmount.times(totalSupply).div(totalAssets);


    withdrawLibrary.withdraw(fundContract, fundAddress, fromAddress, toAddress, withdrawnAmount, withdrawalFee, totalSharesBurnt, transaction);
}

export function handleHardWork(event: HardWorkDone): void {
    let fund = getOrCreateFund(event.address,null, false);
    let requiredId = event.address.toHexString()
    .concat('_')
    .concat(event.transaction.hash.toHexString())
    let hardWork = new HardWork(requiredId);
    hardWork.fund = fund.id;
    hardWork.totalValueLocked = event.params.totalValueLocked;
    hardWork.pricePerShare = event.params.pricePerShare;

    let ethTransaction = transactionFactory.getOrCreateTransactionFromEvent(event, 'HardWorkEvent');

    hardWork.transaction = ethTransaction.id;
    hardWork.timestamp = ethTransaction.timestamp;


    hardWork.fundUpdate = fundUpdateLibrary.buildIdFromFundTxHashAndIndex(
      fund.id,
      ethTransaction.id,
      ethTransaction.index.toString()
    );

    let latestFundUpdate = FundUpdate.load(fund.latestUpdate);
    // This scenario where latestFundUpdate === null shouldn't happen. One fund update should have created when user deposited the tokens.
    if (latestFundUpdate !== null) {
      fundUpdateLibrary.hardwork(
        fund,
        latestFundUpdate as FundUpdate,
        hardWork.pricePerShare,
        ethTransaction,
        hardWork.totalValueLocked
    );}


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
    let transaction = transactionFactory.getOrCreateTransactionFromEvent(
      event,
      'TransferEvent'
    );
    let fundContract = FundContract.bind(event.address);
    let totalAssets = utilLibrary.getTotalAssets(fundContract);
    let totalSupply = utilLibrary.getTotalSupply(fundContract);
    let sharesAmount = event.params.value;
    let amount = sharesAmount.times(totalAssets).div(totalSupply);

    let token = tokenLibrary.getOrCreateToken(fundContract.underlying());
    let shareToken = tokenLibrary.getOrCreateToken(event.address);

    let fromAccount = accountLibrary.getOrCreate(event.params.from);
    let toAccount = accountLibrary.getOrCreate(event.params.to);
    let fund = getOrCreateFund(event.address, null, false);

    transferLibrary.getOrCreate(
    fromAccount,
    toAccount,
    fund,
    token,
    amount,
    shareToken,
    sharesAmount,
    transaction
  );

  accountFundPositionLibrary.transfer(
    fundContract,
    fromAccount,
    toAccount,
    fund,
    amount,
    sharesAmount,
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