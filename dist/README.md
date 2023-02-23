# AFTR-JS
AFTR JS is an SDK that gives dApps the ability to work with AFTR Repos.  The current functionality allows developers to quickly create AFTR Repos and deposit assets into AFTR Repos.  Users will then be able to manage their AFTR Repos on the [AFTR.Market](https://aftr.market) (Mainnet or Testnet) site.

## Installation
```console
npm i aftr-js
```

## Usage
All calls to AFTR JS asynchronously return an SDKReturn object (Don't forget await!):
```typescript
{ status: "success", data: string | object  } | { status: "error", message: string }
```

### Create Repo
To create an AFTR Repo, you'll need to define the following parameters:
1. repo (object)
The repo is an object requires 2 parameters, name and ticker.
```typescript
{
    name: "NAME",
    ticker: "TICKER"
}
```
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
// Method Definition
async function createRepo(repo: RepoInterface, wallet: ExtensionOrJWK, tags?: any, env: "PROD" | "TEST" = "PROD") : Promise<SDKResult>

// Example Call
const repo = {
    name: "My Repo",
    ticker: "MR"
};

const tags = [
    { name: "My dApp", value: "CustomerID"}
];

const env = "TEST";  // "PROD" for Mainnet

let response = await createRepo(repo, "use_wallet", tags, "TEST");
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
```
{ status: "success", data: { repoTxId: <TX-ID-REPO-INTERACTION>, depTokenTxId: <TX-ID-TOKEN-INTERACTION>} } | { status: "error", message: string }
```

```typescript
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