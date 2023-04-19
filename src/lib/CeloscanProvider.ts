import {BigNumber, logger, providers, utils} from "ethers";
import {getNetwork} from "./networks";
import {parseCeloTransaction} from "./transactions";

export class CeloscanProvider extends providers.EtherscanProvider {
    constructor(
        networkish: providers.Networkish = 'celo',
        apiKey?: string
    ) {
        const network = getNetwork(networkish);
        if (network == null) {
            return logger.throwError(
                `unknown network: ${JSON.stringify(network)}`,
                utils.Logger.errors.UNSUPPORTED_OPERATION,
                {
                    operation: 'getNetwork',
                    value: networkish,
                },
            );
        }
        super(network, apiKey);

        // Override certain block formatting properties that don't exist on Celo blocks
        // Reaches into https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/formatter.ts
        const blockFormat = this.formatter.formats.block;
        blockFormat.gasLimit = () => BigNumber.from(0);
        blockFormat.nonce = () => "";
        blockFormat.difficulty = () => 0;

        const blockWithTransactionsFormat =
            this.formatter.formats.blockWithTransactions;
        blockWithTransactionsFormat.gasLimit = () => BigNumber.from(0);
        blockWithTransactionsFormat.nonce = () => "";
        blockWithTransactionsFormat.difficulty = () => 0;
    }

    getBaseUrl(): string {
        switch (this.network ? this.network.name : "invalid") {
            case "celo":
                return "https://api.celoscan.io";
            case "alfajores":
                return "https://alfajores.celoscan.io";
            case "baklava":
                // baklava is currently not supported by celoscan.io, so we use Blockscout
                return "https://explorer.celo.org/baklava";
            default:
        }

        return logger.throwArgumentError("unsupported network", "network", this.network.name);
    }

    async sendTransaction(
        signedTransaction: string | Promise<string>
    ): Promise<providers.TransactionResponse> {
        await this.getNetwork();
        const signedTx = await signedTransaction;
        const hexTx = utils.hexlify(signedTx);
        const tx = parseCeloTransaction(signedTx);
        try {
            const hash = await this.perform("sendTransaction", {
                signedTransaction: hexTx,
            });
            return this._wrapTransaction(tx, hash);
        } catch (error: any) {
            error.transaction = tx;
            error.transactionHash = tx.hash;
            throw error;
        }
    }

    /**
     * Override to handle alternative gas currencies
     * getGasPrice in https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/base-provider.ts
     */
    async getGasPrice(feeCurrencyAddress?: string) {
        await this.getNetwork();
        const params = feeCurrencyAddress ? {feeCurrencyAddress} : {};
        return BigNumber.from(await this.perform("getGasPrice", params));
    }

}
