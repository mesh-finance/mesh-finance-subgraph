import { Deposit as DepositEvent, Withdraw as WithdrawEvent, HardWorkDone } from '../generated/templates/Fund/Fund'
import { Deposit, Withdrawal, HardWork } from '../generated/schema'
import { getOrCreateFund } from './FundFactory'
import { log } from '@graphprotocol/graph-ts'

export function handleDeposit(event: DepositEvent): void {
    let fund = getOrCreateFund(event.address, false);
    log.info('handleDeposit: Fund is {}', [fund.id]);
    let requiredId = event.address.toHexString()
    .concat('_')
    .concat(event.transaction.hash.toHexString());
    let deposit = new Deposit(requiredId);
    deposit.fund = fund.id;
    deposit.account = event.params.beneficiary;
    deposit.amount = event.params.amount;
    deposit.timestamp = event.block.timestamp;
    deposit.save();
    log.info('handleDeposit: Fund in deposit {}', [deposit.fund]);
}

export function handleWithdrawal(event: WithdrawEvent): void {
    let fund = getOrCreateFund(event.address, false);
    let requiredId = event.address.toHexString()
    .concat('_')
    .concat(event.transaction.hash.toHexString());
    let withdrawal = new Withdrawal(requiredId);
    withdrawal.fund = fund.id;
    withdrawal.account = event.params.beneficiary;
    withdrawal.amount = event.params.amount;
    withdrawal.withdrawalFee = event.params.fee;
    withdrawal.timestamp = event.block.timestamp;
    withdrawal.save();
}

export function handleHardWork(event: HardWorkDone): void {
    let fund = getOrCreateFund(event.address, false);
    let requiredId = event.address.toHexString()
    .concat('_')
    .concat(event.transaction.hash.toHexString())
    let hardWork = new HardWork(requiredId);
    hardWork.fund = fund.id;
    hardWork.totalValueLocked = event.params.totalValueLocked;
    hardWork.pricePerShare = event.params.pricePerShare;
    hardWork.timestamp = event.block.timestamp;
    hardWork.save();
}