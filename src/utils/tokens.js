/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import store from '../store/index';
import { newTokens, removeTokenMetadata } from '../actions/index';
import wallet from './wallet';
import hathorLib from '@hathor/wallet-lib';
import LOCAL_STORE from '../storage';
import { getGlobalWallet } from '../modules/wallet';

/**
 * Methods to create and handle tokens
 *
 * @namespace Tokens
 */

const tokens = {
  /**
   * Get registered tokens from the wallet instance.
   * @param {HathorWallet} wallet
   * @param {boolean} excludeDefaultToken If we should exclude the default token.
   * @returns {Promise<ITokenData[]>}
   */
  async getRegisteredTokens(wallet, excludeDefaultToken = false) {
    const htrUid = hathorLib.constants.NATIVE_TOKEN_UID;
    const tokens = [];

    // redux-saga generator magic does not work well with the "for await..of" syntax
    // The asyncGenerator is not recognized as an iterable and it throws an exception
    // So we must iterate manually, awaiting each "next" call
    const iterator = wallet.storage.getRegisteredTokens();
    let next = await iterator.next();
    while (!next.done) {
      const token = next.value;
      if ((!excludeDefaultToken) || token.uid !== htrUid) {
        tokens.push({ uid: token.uid, name: token.name, symbol: token.symbol });
      }
      // eslint-disable-next-line no-await-in-loop
      next = await iterator.next();
    }

    return tokens;
  },

  /**
   * Add a new token to the localStorage and redux
   *
   * @param {string} uid Token uid
   * @param {string} name Token name
   * @param {string} symbol Token synbol
   *
   * @memberof Tokens
   * @inner
   */
  async addToken(uid, name, symbol) {
    const globalWallet = getGlobalWallet();
    await globalWallet.storage.registerToken({ uid, name, symbol });
    const tokens = await this.getRegisteredTokens(globalWallet);
    store.dispatch(newTokens({tokens, uid: uid}));
    wallet.fetchTokensMetadata([uid], globalWallet.conn.network);
  },

  /**
   * Unregister token from localStorage and redux
   *
   * @param {string} uid Token uid to be unregistered
   *
   * @return {Promise} promise that will be resolved if succeds and will be rejected with the error in case of failure
   *
   * @memberof Tokens
   * @inner
   */
  async unregisterToken(uid) {
    const globalWallet = getGlobalWallet();
    await globalWallet.storage.unregisterToken(uid);
    const tokens = await this.getRegisteredTokens(globalWallet);
    store.dispatch(newTokens({tokens, uid: hathorLib.constants.NATIVE_TOKEN_UID}));
    store.dispatch(removeTokenMetadata(uid));
  },

  /**
   * Returns the deposit amount in 'pretty' format
   *
   * @param {number} mintAmount Amount of tokens to mint
   * @param {number} depositPercent deposit percentage for creating tokens
   *
   * @memberof Tokens
   * @inner
   */
  getDepositAmount(mintAmount, depositPercent) {
    if (mintAmount) {
      const amountValue = wallet.decimalToInteger(mintAmount);
      const deposit = hathorLib.tokensUtils.getDepositAmount(amountValue, depositPercent);
      return hathorLib.numberUtils.prettyValue(deposit);
    } else {
      return 0;
    }
  },

  /**
   * Returns the fee in HTR for creating an NFT
   *
   * @memberof Tokens
   * @inner
   */
  getNFTFee() {
    return 1;
  },

  /**
   * Returns the token signatures on storage
   * This is only used for hw wallets.
   *
   * @return {Object} Map of token uid to signatures
   *
   * @memberof Tokens
   * @inner
   */
  getTokenSignatures() {
    return LOCAL_STORE.getTokenSignatures();
  },

  /**
   * Returns a single token signature from storage or null if not found.
   * This is only used for hw wallets.
   *
   * @param {string} uid hex value of token uid
   *
   * @memberof Tokens
   * @inner
   */
  getTokenSignature(uid) {
    const tokenSignatures = this.getTokenSignatures();
    if (!tokenSignatures.hasOwnProperty(uid)) return null;
    return tokenSignatures[uid];
  },

  /**
   * Add a token signature to storage, overwriting if exists
   * This is only used for hw wallets.
   *
   * @param {string} hex value of token uid
   * @param {string} hex value of signature
   *
   * @memberof Tokens
   * @inner
   */
  addTokenSignature(uid, signature) {
    const tokenSignatures = this.getTokenSignatures();
    tokenSignatures[uid] = signature;
    LOCAL_STORE.setTokenSignatures(tokenSignatures);
  },

  /**
   * Overwrite token signatures, deleting all of them.
   * This is only used for hw wallets.
   *
   * @memberof Tokens
   * @inner
   */
  resetTokenSignatures() {
    LOCAL_STORE.resetTokenSignatures();
  },

  /**
   * Remove a token signature from storage
   * This is only used for hw wallets.
   *
   * @param {string} uid hex value of the token uid to be removed
   *
   * @memberof Tokens
   * @inner
   */
  removeTokenSignature(uid) {
    const tokenSignatures = this.getTokenSignatures();
    delete tokenSignatures[uid];
    LOCAL_STORE.setTokenSignatures(tokenSignatures);
  },
}

export default tokens;
