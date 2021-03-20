import { NewFund } from '../generated/FundFactory/FundFactory'
import { Fund } from '../generated/schema'
import { Fund as FundTemplate } from '../generated/templates'
import { Address, log } from '@graphprotocol/graph-ts'


export function getOrCreateFund(address: Address): Fund {
  let fund = Fund.load(address.toHexString());
  log.info('getOrCreateFund: Initial Fund is {}', [fund.id]);
  
  if (fund == null) {
      fund = new Fund(address.toHexString());
      FundTemplate.create(address);
      log.info('getOrCreateFund: Final Fund is {}', [fund.id]);
  }
  
  return fund as Fund;
}

export function handleNewFund(event: NewFund): void {
  getOrCreateFund(event.params.fundProxy);
}