import { Fund as FundContract } from '../../generated/templates/Fund/Fund'
import { ZERO_ADDRESS, BIGINT_ZERO, DEFAULT_DECIMALS } from './constants';
import { log, Address, BigInt } from '@graphprotocol/graph-ts'

export function getTotalAssets(fundContract: FundContract): BigInt {
  let totalAssetsCR = fundContract.try_totalValueLocked();
  let totalAssets = BIGINT_ZERO;
  if (totalAssetsCR.reverted) {
  } else {
  totalAssets = totalAssetsCR.value;
  }
  return totalAssets;
}

export function getPricePerShare(fundContract: FundContract): BigInt {

  let pricePerShare = BIGINT_ZERO;
  let pricePerShareCR = fundContract.try_getPricePerShare();
  if (pricePerShareCR.reverted) {
  } else {
  pricePerShare = pricePerShareCR.value;
  }
  return pricePerShare;
}

export function getTotalSupply(fundContract: FundContract): BigInt {
    let totalSupplyCR = fundContract.try_totalSupply();
    let totalSupply = BIGINT_ZERO;
    if (totalSupplyCR.reverted) {
    } else {
        totalSupply = totalSupplyCR.value;
    }
    return totalSupply;
}

export function getDecimals(fundContract: FundContract): u8 {
  let decimals = DEFAULT_DECIMALS as u8;
  let decimalsCR = fundContract.try_decimals();
  if (decimalsCR.reverted) {
  } else {
  decimals = u8(decimalsCR.value);
  }
  return decimals;
}

