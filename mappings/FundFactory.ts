import { NewFund } from '../generated/FundFactory/FundFactory'

import { Fund } from '../generated/schema'
import { Fund as FundTemplate } from '../generated/templates'
import { Address, log } from '@graphprotocol/graph-ts'
import { Fund as FundContract } from '../generated/templates/Fund/Fund'
import * as tokenLibrary from './utils/tokens'
import * as transactionLibrary from './utils/transactions'
import {ZERO_ADDRESS, BIGINT_ZERO} from './utils/constants';


export function getOrCreateFund(address: Address, event: NewFund, createTemplate: boolean): Fund {
  let fund = Fund.load(address.toHexString());

  if (fund == null) {
      fund = new Fund(address.toHexString());
      if (createTemplate) {
        FundTemplate.create(address);
        let fundContract = FundContract.bind(address);
        fund.symbol = fundContract.symbol();
        fund.name = fundContract.name();
        fund.underlyingToken = tokenLibrary.getOrCreateToken(fundContract.underlying()).id;
        fund.shareToken = tokenLibrary.getOrCreateToken(address).id;
        fund.transaction = transactionLibrary.getOrCreateTransactionFromEvent(event, "CreateFund").id;
        fund.balanceTokens = BIGINT_ZERO;
        fund.balanceTokensIdle = BIGINT_ZERO;
        fund.balanceTokensInvested = BIGINT_ZERO;
        fund.tokensDepositLimit = BIGINT_ZERO;
        fund.sharesSupply = BIGINT_ZERO;
        let withdrawalFee = fundContract.try_withdrawalFee();
        fund.withdrawalFeeBps = withdrawalFee.reverted ? 0 : withdrawalFee.value.toI32();

      }
      log.info('getOrCreateFund: Final Fund is {}', [fund.id]);
      fund.save();
  }
  
  return fund as Fund;
}


export function handleNewFund(event: NewFund): void {
  getOrCreateFund(event.params.fundProxy, event, true);
}