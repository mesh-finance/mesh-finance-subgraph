import { log, Address, BigInt } from '@graphprotocol/graph-ts'
import { Fund as FundContract } from '../../../generated/templates/Fund/Fund'
import { Deposit, Withdrawal, HardWork, Transaction, FundUpdate } from '../../../generated/schema'
import { ZERO_ADDRESS, BIGINT_ZERO, DEFAULT_DECIMALS, ROPSTEN_CHAIN_ID } from '../constants';
import { getOrCreateFund, getOrCreateChain} from '../../FundFactory'
import * as fundUpdateLibrary from '../fund-update'
import * as accountLibrary from '../accounts'
import * as utilLibrary from '../util'
import * as accountFundPositionLibrary from '../account-fund-position'


export function deposit(
  eventAddress: Address,
  fundContract: FundContract,
  transaction: Transaction,
  receiver: Address,
  depositedAmount: BigInt,
  sharesMinted: BigInt,
  timestamp: BigInt
): void {


  let account = accountLibrary.getOrCreate(receiver);
  let pricePerShare = utilLibrary.getPricePerShare(fundContract);

  let fund = getOrCreateFund(eventAddress, null, false);
  let chain = getOrCreateChain(ROPSTEN_CHAIN_ID);


  accountFundPositionLibrary.deposit(
    fundContract,
    account,
    fund,
    transaction,
    depositedAmount,
    sharesMinted
  );

  chain.TVL = chain.TVL.plus(depositedAmount);
  chain.save();


    let requiredId = eventAddress.toHexString()
    .concat('_')
    .concat(transaction.hash.toHexString());
    let deposit = new Deposit(requiredId);
    deposit.fund = fund.id;
    deposit.account = account.id;
    deposit.amount = depositedAmount;
    deposit.timestamp = timestamp;
    deposit.transaction = transaction.id;
    deposit.sharesMinted = sharesMinted;
    let fundUpdateId = fundUpdateLibrary.buildIdFromFundTxHashAndIndex(
      fund.id,
      transaction.id,
      transaction.index.toString()
    );
    deposit.fundUpdate = fundUpdateId;
    deposit.save();

    log.info('handleDeposit: Fund in deposit {}', [deposit.fund]);

  let fundUpdate: FundUpdate;
  let totalValueLocked = utilLibrary.getTotalAssets(fundContract);
  if (fund.latestUpdate == null) {
    fundUpdate = fundUpdateLibrary.firstDeposit(
      fund,
      transaction,
      depositedAmount,
      sharesMinted,
      pricePerShare,
      totalValueLocked
    );
  } else {
    fundUpdate = fundUpdateLibrary.deposit(
      fund,
      transaction,
      depositedAmount,
      sharesMinted,
      pricePerShare,
      totalValueLocked
    );
  }

//   updatefundDayData(
//     fund,
//     fundContract.token(),
//     timestamp,
//     pricePerShare,
//     depositedAmount,
//     BIGINT_ZERO,
//     fundUpdate.returnsGenerated
//   );

  fund.latestUpdate = fundUpdate.id;

  fund.balanceTokens = fund.balanceTokens.plus(depositedAmount);
  fund.balanceTokensIdle = fund.balanceTokensIdle.plus(depositedAmount);
  fund.sharesSupply = fund.sharesSupply.plus(sharesMinted);

  fund.save();
}
