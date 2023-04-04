import {BigNumber, providers, utils, Wallet, Wordlist} from "ethers";
import type {CeloProvider} from "./CeloProvider";
import {CeloTransactionRequest, serializeCeloTransaction,} from "./transactions";
import {Bytes} from "@ethersproject/bytes";
import {ProgressCallback} from "@ethersproject/json-wallets";

const logger = new utils.Logger("CeloWallet");

const forwardErrors = [
    utils.Logger.errors.INSUFFICIENT_FUNDS,
    utils.Logger.errors.NONCE_EXPIRED,
    utils.Logger.errors.REPLACEMENT_UNDERPRICED,
];

export class CeloWallet extends Wallet {
    /**
     * Override to skip checkTransaction step which rejects Celo tx properties
     * https://github.com/ethers-io/ethers.js/blob/master/packages/abstract-signer/src.ts/index.ts
     */
    async populateTransaction(
        transaction: utils.Deferrable<CeloTransactionRequest>
    ): Promise<any> {
        const tx: any = await utils.resolveProperties(transaction);

        if (tx.to != null) {
            tx.to = Promise.resolve(tx.to).then((to) => this.resolveName(to));
        }
        if (tx.gasPrice == null) {
            tx.gasPrice = this.getGasPrice();
        }
        if (tx.nonce == null) {
            tx.nonce = this.getTransactionCount("pending");
        }

        if (tx.gasLimit == null) {
            tx.gasLimit = this.estimateGas(tx).catch((error) => {
                if (forwardErrors.indexOf(error.code) >= 0) {
                    throw error;
                }

                return logger.throwError(
                    "cannot estimate gas; transaction may fail or may require manual gas limit",
                    utils.Logger.errors.UNPREDICTABLE_GAS_LIMIT,
                    {
                        error: error,
                        tx: tx,
                    }
                );
            });
        }

        if (tx.chainId == null) {
            tx.chainId = this.getChainId();
        } else {
            tx.chainId = Promise.all([
                Promise.resolve(tx.chainId),
                this.getChainId(),
            ]).then((results) => {
                if (results[1] !== 0 && results[0] !== results[1]) {
                    logger.throwArgumentError(
                        "chainId address mismatch",
                        "transaction",
                        transaction
                    );
                }
                return results[0];
            });
        }

        return utils.resolveProperties(tx);
    }

    /**
     * Override to serialize transaction using custom serialize method
     * https://github.com/ethers-io/ethers.js/blob/master/packages/wallet/src.ts/index.ts
     */
    async signTransaction(transaction: CeloTransactionRequest): Promise<string> {
        const tx = await this.populateTransaction(transaction);

        if (tx.from != null) {
            if (utils.getAddress(tx.from) !== this.address) {
                logger.throwArgumentError(
                    "transaction from address mismatch",
                    "transaction.from",
                    transaction.from
                );
            }
            delete tx.from;
        }

        const signature = this._signingKey().signDigest(
            utils.keccak256(serializeCeloTransaction(tx))
        );
        return serializeCeloTransaction(tx, signature);
    }

    /**
     * Override just for type fix
     * https://github.com/ethers-io/ethers.js/blob/master/packages/wallet/src.ts/index.ts
     */
    sendTransaction(
        transaction: utils.Deferrable<CeloTransactionRequest>
    ): Promise<providers.TransactionResponse> {
        return super.sendTransaction(transaction);
    }

    /**
     * Override to skip checkTransaction step which rejects Celo tx properties
     * https://github.com/ethers-io/ethers.js/blob/master/packages/abstract-signer/src.ts/index.ts
     */
    async estimateGas(
        transaction: utils.Deferrable<CeloTransactionRequest>
    ): Promise<BigNumber> {
        this._checkProvider("estimateGas");
        const tx = await utils.resolveProperties(transaction);
        return await this.provider.estimateGas(tx);
    }

    /**
     * Override to support alternative gas currencies
     * https://github.com/lj92458/ethers.js/blob/master/packages/abstract-signer/src.ts/index.ts
     */
    async getGasPrice(feeCurrencyAddress?: string): Promise<BigNumber> {
        this._checkProvider("getGasPrice");
        // @ts-ignore
        return await this.provider.getGasPrice(feeCurrencyAddress);
    }

    connect(provider: CeloProvider): CeloWallet {
        return new CeloWallet(this, provider);
    }

    static fromEncryptedJson(json: string, password: Bytes | string, progressCallback?: ProgressCallback): Promise<CeloWallet> {
        return super.fromEncryptedJson(json, password, progressCallback).then(wallet => {
            return new CeloWallet(wallet)
        })
    }

    static fromEncryptedJsonSync(json: string, password: Bytes | string): CeloWallet {
        return new CeloWallet(super.fromEncryptedJsonSync(json, password))
    }

    static fromMnemonic(
        mnemonic: string,
        path?: string,
        wordlist?: Wordlist
    ): CeloWallet {
        const wallet = super.fromMnemonic(mnemonic, path, wordlist);
        return new CeloWallet(wallet);
    }
}
