# celo-ethers-wrapper

A minimal wrapper to make Ethers.JS compatible with the Celo network. I have added function fromEncryptedJson and fromEncryptedJsonSync to CeloWallet.ts

## Install

`npm i @lj92458/celo-ethers-wrapper`

or

`yarn add @lj92458/celo-ethers-wrapper`

Note this wrapper has Ethers v5 as a peer dependency. Your project must include a dependency on that as well.

## Basic Usage

Connect to the network by creating a `CeloProvider`, which is based on [JsonRpc-Provider](https://docs.ethers.io/v5/api/providers/jsonrpc-provider/):

```js
import { CeloProvider } from '@lj92458/celo-ethers-wrapper'

// Connecting to Alfajores testnet
const provider = new CeloProvider('https://alfajores-forno.celo-testnet.org')
await provider.ready
```

Note: for a more efficient provider based on [StaticJsonRpcProvider](https://docs.ethers.io/v5/api/providers/jsonrpc-provider/#StaticJsonRpcProvider) you can use `StaticCeloProvider` instead.

Next, Create a CeloWallet, which is based on [Wallet](https://docs.ethers.io/v5/api/signer/#Wallet) :

```js
import { CeloWallet } from '@lj92458/celo-ethers-wrapper'

const wallet = new CeloWallet(YOUR_PK, provider)
```

Use the provider or wallet to make calls or send transactions:

```js
const txResponse = await wallet.sendTransaction({
    to: recipient,
    value: amountInWei,
  })
const txReceipt = await txResponse.wait()
console.info(`CELO transaction hash received: ${txReceipt.transactionHash}`)
```

## Contract Interaction

`CeloWallet` can be used to send transactions.

Here's an example of sending cUSD with the StableToken contract. For interacting with contracts you need the ABI and address. Addresses for Celo core contracts can be found with the CLI's `network:contracts` command. The ABIs can be built from the solidity code or extracted in ContractKit's `generated` folder.

```js
import { Contract, ethers, utils, providers } from 'ethers'

const stableToken = new ethers.Contract(address, abi, wallet)
console.info(`Sending ${amountInWei} cUSD`)
const txResponse: providers.TransactionResponse = await stableToken.transferWithComment(recipient, amountInWei, comment)
const txReceipt = await txResponse.wait()
console.info(`cUSD payment hash received: ${txReceipt.transactionHash}`)
```

## Alternative gas fee currencies

The Celo network supports paying for transactions with the native asset (CELO) but also with the stable token (cUSD).

This wrapper currently has partial support for specifying feeCurrency in transactions.

```js
const gasPrice = await wallet.getGasPrice(stableTokenAddress)
const gasLimit = await wallet.estimateGas(tx)

// Gas estimation doesn't currently work properly for non-CELO currencies
// The gas limit must be padded to increase tx success rate
// TODO: Investigate more efficient ways to handle this case
const adjustedGasLimit = gasLimit.mul(10)

const txResponse = await signer.sendTransaction({
  ...tx,
  gasPrice,
  gasLimit: adjustedGasLimit,
  feeCurrency: stableTokenAddress,
})
```

## Getting transaction history with CeloscanProvider

You can also rely on EthersProviders functionality, such as getting an account's transaction history, using our alternative CeloscanProvider

```js
import { CeloscanProvider } from '@lj92458/celo-ethers-wrapper'

// You can use 'celo', 'alfajores' or 'baklava'.
// Default is 'celo' (mainnet)
const scanProvider = new CeloscanProvider('alfajores');

const history = await provider.getHistory(YOUR_ACCOUNT);
console.info("History:", history);
```

## Examples

See the tests under `/test` for more detailed examples.
