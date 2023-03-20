# AFTR-JS
AFTR JS is an SDK that gives dApps the ability to work with AFTR Repos.  The current functionality allows developers to quickly create AFTR Repos and deposit assets into AFTR Repos.  Users will then be able to manage their AFTR Repos on the [AFTR.Market](https://aftr.market) (Mainnet or Testnet) site.

## Installation
```console
npm i aftr-js
```

## Requirements
**Disclaimer:**  The AFTR protocol, libraries, and websites are beta versions. They are all provided "as is." While Arceum Inc. will do its best to resolve any issue encountered in these platforms, Arceum Inc. will not be liable for any loss as a result from usage of any of these platforms.

### Supported Assets ###
AFTR is a multi-sig for Arweave assets.  As such, an asset must support internal writes to be deposited into an AFTR Repo.  This means that an asset must include the following parameters and functions to be deposited into an AFTR Repo:

**Parameters**
1. claimable[]
2. claims[]

**Functions**
1. allow
2. claim

To read more about cross contract communication, please see the following:
- Warp's documentation on [Internal Writes](https://academy.warp.cc/docs/sdk/advanced/internal-calls)
- Warp's [tutorial on DEXs](https://academy.warp.cc/tutorials/dex/introduction/intro)

## Usage
All calls to AFTR JS asynchronously return an SDKReturn object (Don't forget await!):
```typescript
{ status: "success", data: string | object  } | { status: "error", message: string }
```

### Create Repo
To create an AFTR Repo, you'll need to define the following parameters:
1. repo (object)
The repo is an object requiring 2 parameters, name and ticker.
```typescript
{
    name: "NAME",
    ticker: "TICKER"
}
```
A repo will be created with the following default state:
```typescript
{
    name: "<NAME set in the required parameters>",
    ticker: "<TICKER set in the required parameters>",
    balances: { "<OWNER WALLET ADDR>" : 1 },
    tokens: [],
    vault: {},
    votes: [],
    status: "started",
    owner: "<OWNER WALLET ADDR>",
    ownership: "single",
    votingSystem: "weighted",
    claims: [],
    claimable: [],
    evolve: "",
    functions: ["transfer", "deposit", "allow", "claim", "multiInteraction"],
    settings: [
        ["quorum", 0.5],
        ["support", 0.51],
        ["voteLength", 2160],
        ["communityLogo", ""]
    ]
}
```
You can set any of the parameters above to meet your needs.

There are several optional functions that may be turned off in a repo contract.  By default, these will be turned on, so if you have a use case where you want to restrict these capabilities, you can define **functions** parameter in your initial state.  For example, if you setup a repo to act as a multi-sig where you and several others have rights to sign transactions, you may not want signers of this repo to be able to transfer their membership.  In this case, you would add the **functions** array to your repo state leaving out the "transfer" value.  Just remember, if you add the **functions** array to your state, you'll need to supply all the optional functions that you want to include in the repo contract.  You can also edit these settings later on [AFTR.Market](https://aftr.market).


Valid values for the **functions** array include the following:
```typescript
["transfer", "deposit", "allow", "claim", "multiInteraction"] | []
```

- **Transfer** - Gives the repo the ability to transfer membership balances.
- **Deposit** - Allows anyone to deposit supported Arweave assets into the repo.
- **Allow** - Required for tradability protocols such as Verto Flex.
- **Claim** - Required for tradability protocols such as Verto Flex.
- **Multi-Interactions** - Gives the repo the ability to perform more than one change at a time.

2. wallet (JWK)
The wallet is Arweave wallet that will be the owner of the newly created repo. If you use a wallet like ArConnect, you can simply pass in "use_wallet".
3. tags (optional)
Tags allow you add additional tags to the newly created repo. This can be a good idea if you'd like to be able to query for these in your dApp. Tags is an array of name/value objects:
```typescript
[
    { name: "TAG_NAME1", value: "TAG_VALUE1" },
    { name: "TAG_NAME2", value: "TAG_VALUE2" }
]
```
4. env (optional, defaults to mainnet) - "PROD" | "TEST"
The env parameter allows you to create repos on the Arweave Mainnet (default) or the Arweave Testnet. Mainnet repos can be found on [aftr.market](https://aftr.market) and Testnet repos can be found on [test.aftr.market](https://test.aftr.market).  


**Response**
```typescript
{ status: "success", data: <NEW-REPO-CONTRACT-ID>  } | { status: "error", message: string }
```

```typescript
import { createRepo } from "aftr-js";

// Method Definition
async function createRepo(repo: RepoInterface, wallet: ExtensionOrJWK, tags?: any, env: "PROD" | "TEST" = "PROD") : Promise<SDKResult>

// Example Call with a quorum setting that's different from the default
const repo = {
    name: "My Repo",
    ticker: "MR",
    settings: [
        ["quorum", 0.3]
    ]
};

const tags = [
    { name: "My dApp", value: "CustomerID"}
];

const env = "TEST";  // "PROD" for Mainnet

let response = await createRepo(repo, "use_wallet", tags, env);
if (response.status === "success") {
    console.log("NEW REPO ID: " + response.data);
} else {
    console.log("ERROR: " + response.message);
}

```

### Deposit
A desposit call for a repo performs 2 operations. First, it makes a call to the contract of the asset being deposited. Then, it makes a call to the repo being deposited into. It requires the following parameters:
1. repoId (string)
The repoId is the contract ID of the repo being deposited into.
2. depTokenId (string)
The depTokenId is the contract ID of the asset being deposited into the repo.
3. qty (number)
The qty is the amount of tokens being deposited into the repo.
4. wallet (JWK)
The wallet is Arweave wallet that is depositing tokens into the repo. If you use a wallet like ArConnect, you can simply pass in "use_wallet". The deposit validates this wallet (the caller) to make sure they have the appropriate balance on the depositing token.
5. env (optional, defaults to mainnet) - "PROD" | "TEST"

**Response**
```typescript
{ status: "success", data: { repoTxId: <TX-ID-REPO-INTERACTION>, depTokenTxId: <TX-ID-TOKEN-INTERACTION>} } | { status: "error", message: string }
```

```typescript
import { deposit } from "aftr-js";

// Method Definition
async function deposit(repoId: string, depTokenId: string, qty: number, wallet: ExtensionOrJWK, env: "PROD" | "TEST" = "PROD") : Promise<SDKResult>

// Example Call
const response = await deposit(repoId, depTokenId, qty, "use_wallet", "TEST");
if (response.status === "success") {
    console.log("Deposit Successful: " + response.data.repoTxId + " & " + response.data.depTokenTxId);
} else {
    console.log("Deposit Failed: " + response.message);
}
```