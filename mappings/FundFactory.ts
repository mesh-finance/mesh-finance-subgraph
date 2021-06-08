import { NewFund, CreateFundCall } from '../generated/FundFactory/FundFactory'
import { Fund } from '../generated/schema'
import { Fund as FundTemplate } from '../generated/templates'
import { Fund as FundContract } from '../generated/templates/Fund/Fund'
import { Address, log } from '@graphprotocol/graph-ts'
import { getOrCreateToken } from './utils/token';
import {
  getOrCreateTransactionFromEvent,
} from './utils/transaction';

import { ZERO_ADDRESS, BIGINT_ZERO} from './utils/constants';



export function getOrCreateFund(address: Address, createTemplate: boolean): Fund {
  let fund = Fund.load(address.toHexString());
  log.info('getOrCreateFund: Initial Fund is {}', [fund.id]);

  if (fund == null) {
      fund = new Fund(address.toHexString());
      if (createTemplate) {
       FundTemplate.create(address);

      }
      let fundContract = FundContract.bind(address);
      fund.symbol = fundContract.symbol();
      fund.name = fundContract.name();
      fund.underlyingToken = getOrCreateToken(fundContract.underlying()).id;
      fund.shareToken = getOrCreateToken(address).id;
//       fund.transaction = getOrCreateTransactionFromEvent(event, "CreateFund").id;
//       fund.balanceTokens = BIGINT_ZERO;
//       fund.balanceTokensIdle = BIGINT_ZERO;
//       fund.balanceTokensInvested = BIGINT_ZERO;
//       fund.tokensDepositLimit = BIGINT_ZERO;
//       fund.sharesSupply = BIGINT_ZERO;
//       fund.withdrawalFeeBps = fundContract.withdrawalFee().toI32();


      log.info('getOrCreateFund: Final Fund is {}', [fund.id]);
      fund.save();
  }

  return fund as Fund;
}


export function handleNewFund(event: NewFund): void {
  log.info('handleNewFund: Final Fund is {}', [event.params.fundProxy.toHexString()]);
  getOrCreateFund(event.params.fundProxy, true);
}




