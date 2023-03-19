import { DepositInterface, ExtensionOrJWK, SDKResult } from './../common/faces';
import { warpRead, warpWrite } from '../common/warpUtils';
import Arweave from 'arweave';

const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https"
});

export async function deposit(repoId: string, depTokenId: string, qty: number, wallet: ExtensionOrJWK, env: "PROD" | "TEST" = "PROD") {
    const walletAddress = await arweave.wallets.jwkToAddress(wallet);

    if (!isArweaveAddress(repoId)) {
        return { status: "error", message: "repoId is invalid." };
    }

    if (!isArweaveAddress(depTokenId)) {
        return { status: "error", message: "depTokenId is invalid." };
    }

    if (isNaN(qty)) {
        return { status: "error", message: "qty is invalid." };
    }

    const allowResult = await isDepositAllowed(repoId, depTokenId, walletAddress, qty, env);
    if (allowResult.status === "error") {
        return { status: "error", message: allowResult.message };
    }

    const inputAllow = {
        function: "allow",
        target: repoId,
        qty: qty
    };

    //@ts-ignore
    const aiResult = await warpWrite(depTokenId, inputAllow, true, true, wallet, env);
    if (aiResult.status === "error") {
        return aiResult;
    }

    const inputDep = {
        function: "deposit",
        tokenId: depTokenId,
        qty: qty,
        txID: aiResult.data
    };

    //@ts-ignore
    const depResult = await warpWrite(repoId, inputDep, true, true, wallet, env);
    if (depResult.status === "error") {
        return depResult;
    }

    return { status: "success", data: { repoTxId: depResult.data, depTokenTxId: aiResult.data} };
}

function isArweaveAddress(addr) {
    const address = addr.toString().trim();
    if (!/[a-z0-9_-]{43}/i.test(address)) {
        return false;
    }
    return true;
}

async function isDepositAllowed(repoId: string, tokenId: string, caller: string, qty: number, env: "PROD" | "TEST") : Promise<SDKResult> {
    // Make sure user isn't trying to deposit asset of itself
    if (repoId === tokenId) {
        return { status: "error", message: "You can't deposit an asset to itself." };
    }

    // Is internalWrite Supported?
    const readResult = await warpRead(tokenId, true, env);
    if (readResult.status === "error") {
        return { status: "error", message: readResult.message };
    }

    const stateInteractions = readResult.data;

    if (!stateInteractions || Object.keys(stateInteractions).length === 0) {
        return { status: "error", message: "This asset can't be found on the Permaweb." };
    }

    // Repo must have 'deposit' enabled in its functions list
    //@ts-expect-error
    const functions = stateInteractions.state.functions ? stateInteractions.state.functions : [];
    if (!(functions.includes("deposit"))) {
        return { status: "error", message: "This repo does not support deposits." };
    }

    // Token must have claims and claimable objects to support FCP
    //@ts-expect-error
    if (!stateInteractions.state.claims || !stateInteractions.state.claimable) {
        return { status: "error", message: "This asset doesn't support cross-contract communication so it can't be deposited into an AFTR repo." };
    }

    // Test to see if owner's balance would be 0
    //@ts-expect-error
    if ((stateInteractions.state.ownership === "single") && (caller === stateInteractions.state.owner) && (stateInteractions.state.balances[caller] - qty <= 0)) {
        return { status: "error", message: "Can't deposit this asset because the owner's balance of a single-owner repo would become 0." };
    }

    // Test to see if user has enough balance on the contract
    //@ts-expect-error
    if (!stateInteractions.state.balances[caller]) {
        return { status: "error", message: "Can't deposit this asset because caller doesn't appear to have a balance on this contract." };
    }

    //@ts-expect-error
    if (stateInteractions.state.balances[caller] - qty < 0) {
        return { status: "error", message: "Can't deposit this asset because your balance is too low on the token contract." };
    }

    return { status: "success", data: "" };
}
