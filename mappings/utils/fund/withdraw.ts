import {Transaction, Withdrawal, FundUpdate, AccountFundPosition, AccountFundPositionUpdate } from '../../../generated/schema'

import * as fundFactoryLibrary from '../../FundFactory'
import { log, Address, BigInt } from '@graphprotocol/graph-ts'
import { Fund as FundContract } from '../../../generated/templates/Fund/Fund'
import * as accountLibrary from '../accounts'
import * as fundUpdateLibrary from '../fund-update'
import { ZERO_ADDRESS, BIGINT_ZERO, DEFAULT_DECIMALS, ROPSTEN_CHAIN_ID } from '../constants';
import * as utilLibrary from '../util'
import * as accountFundPositionLibrary from '../account-fund-position'


export function withdraw(
  fundContract: FundContract,
  eventAddress: Address,
  from: Address,
  to: Address,
  withdrawnAmount: BigInt,
  withdrawalFee: BigInt,
  sharesBurnt: BigInt,
  transaction: Transaction
): void {

  let pricePerShare = utilLibrary.getPricePerShare(fundContract);
  let account = accountLibrary.getOrCreate(to);
  let totalValueLocked = utilLibrary.getTotalAssets(fundContract);

  let fund = fundFactoryLibrary.getOrCreateFund(eventAddress, null, false);
  let chain = fundFactoryLibrary.getOrCreateChain(ROPSTEN_CHAIN_ID);

  let requiredId = eventAddress.toHexString()
    .concat('_')
    .concat(transaction.hash.toHexString());
    let withdrawal = new Withdrawal(requiredId);
    withdrawal.fund = fund.id;
    withdrawal.account = account.id;
    withdrawal.amount = withdrawnAmount;
    withdrawal.withdrawalFee = withdrawalFee;
    withdrawal.timestamp = transaction.timestamp;
    withdrawal.transaction = transaction.id;
    withdrawal.sharesBurnt = sharesBurnt;
    withdrawal.fundUpdate = fundUpdateLibrary.buildIdFromFundTxHashAndIndex(
      fund.id,
      transaction.id,
      transaction.index.toString()
    );
    withdrawal.save();

  // Updating Account Fund Position Update
  let accountFundPositionId = accountFundPositionLibrary.buildId(
    account,
    fund
  );
  let accountFundPosition = AccountFundPosition.load(accountFundPositionId);
  // This scenario where accountFundPosition === null shouldn't happen. Account fund position should have been created when the account deposited the tokens.
  if (accountFundPosition !== null) {
    let latestAccountFundPositionUpdate = AccountFundPositionUpdate.load(
      accountFundPosition.latestUpdate
    );
    // The scenario where latestAccountFundPositionUpdate === null shouldn't happen. One account fund position update should have created when user deposited the tokens.
    if (latestAccountFundPositionUpdate !== null) {
      accountFundPositionLibrary.withdraw(
        fundContract,
        accountFundPosition as AccountFundPosition,
        withdrawnAmount,
        sharesBurnt,
        transaction
      );
    } else {
      log.warning(
        'INVALID withdraw: Account fund position update NOT found. ID {} Fund {} TX {} from {}',
        [
          accountFundPosition.latestUpdate,
          eventAddress.toHexString(),
          transaction.hash.toHexString(),
          from.toHexString(),
        ]
      );
    }
  } else {
    /*
      This case should not exist because it means an user already has share tokens without having deposited before.
      BUT due to some funds were deployed, and registered in the registry after several blocks, there are cases were some users deposited tokens before the fund were registered (in the registry).
      Example:
        Account:  0x557cde75c38b2962be3ca94dced614da774c95b0
        Fund:    0xbfa4d8aa6d8a379abfe7793399d3ddacc5bbecbb

        Fund registered at tx (block 11579536): https://etherscan.io/tx/0x6b51f1f743ec7a42db6ba1995e4ade2ba0e5b8f1fec03d3dd599a90da66d6f69

        Account transfers:
        https://etherscan.io/token/0xbfa4d8aa6d8a379abfe7793399d3ddacc5bbecbb?a=0x557cde75c38b2962be3ca94dced614da774c95b0

        The first two deposits were at blocks 11557079 and 11553285. In both cases, some blocks after registering the fund.

        As TheGraph doesn't support to process blocks before the fund was registered (using the template feature), these cases are treated as special cases (pending to fix).
    */
//     if (withdrawnAmount.isZero()) {
//       log.warning(
//         'INVALID zero amount withdraw: Account fund position NOT found. ID {} Fund {} TX {} from {}',
//         [
//           accountFundPositionId,
//           eventAddress.toHexString(),
//           transaction.hash.toHexString(),
//           from.toHexString(),
//         ]
//       );
//       accountFundPositionLibrary.withdrawZero(account, fund, transaction);
//     } else {
      log.warning(
        'INVALID withdraw: Account fund position NOT found. ID {} Fund {} TX {} from {}',
        [
          accountFundPositionId,
          eventAddress.toHexString(),
          transaction.hash.toHexString(),
          from.toHexString(),
        ]
      );
//     }
  }

  // Updating Fund Update
  let latestFundUpdate = FundUpdate.load(fund.latestUpdate);
  // This scenario where latestFundUpdate === null shouldn't happen. One fund update should have created when user deposited the tokens.
  if (latestFundUpdate !== null) {
    fundUpdateLibrary.withdraw(
      fund,
      latestFundUpdate as FundUpdate,
      pricePerShare,
      withdrawnAmount,
      sharesBurnt,
      transaction,
      totalValueLocked
    );

    chain.TVL = chain.TVL.minus(withdrawnAmount);

// //     updateFundDayData(
// //       fund,
// //       fundContract.token(),
// //       timestamp,
// //       pricePerShare,
// //       BIGINT_ZERO,
// //       withdrawnAmount,
// //       latestFundUpdate.returnsGenerated
// //     );
  }
}