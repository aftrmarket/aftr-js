import { ExtensionOrJWK, SDKResult, InputInterface } from './faces';
//@ts-ignore
import { WarpFactory } from "warp-contracts/web";
import { DeployPlugin, InjectedArweaveSigner } from 'warp-contracts-plugin-deploy';
import Arweave from 'arweave';

function warpInit(env: "PROD" | "TEST" | "DEV") {
    let warp = {};

    try {
        if (env === "PROD") {
            warp = WarpFactory.forMainnet().use(new DeployPlugin());
        } else if (env === "TEST") {
            warp = WarpFactory.forTestnet().use(new DeployPlugin());
        } else {
            warp = WarpFactory.forLocal().use(new DeployPlugin());
        }
    } catch (e) {
        console.log(e);
    }
    return warp;
};

async function warpRead(contractId: string, internalWrites = true, env: "PROD" | "TEST" | "DEV") : Promise<SDKResult> {
    const warp = warpInit(env);

    try {
        //@ts-expect-error
        const contract = warp.contract(contractId)
            .setEvaluationOptions({
                internalWrites: internalWrites,
            });
        const result = await contract.readState();
        return { status: "success", data: result.cachedValue };
    } catch (e) {
        return { status: "error", message: e};
    }
};

async function warpWrite(contractId: string, input: InputInterface, internalWrites = true, bundling = true, wallet: ExtensionOrJWK, env: "PROD" | "TEST" | "DEV") : Promise<SDKResult> {
    const warp = warpInit(env);
    try {
        //@ts-expect-error
        const contract = warp.contract(contractId)
            .setEvaluationOptions({
                internalWrites: internalWrites,
                disableBundling: !bundling
            })
            .connect(wallet);
        const { originalTxId } = await contract.writeInteraction(input);
        return { status: "success", data: originalTxId };
    } catch (e) {
        return { status: "error", message: e};
    }
};

async function warpCreateFromTx(initState: string, srcId: string, currentTags = undefined, aftr = false, wallet: ExtensionOrJWK, env: "PROD" | "TEST" | "DEV") : Promise<SDKResult> {
    //@ts-expect-error
    if (window.arweaveWallet) {
        //@ts-expect-error
        await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION', 'ACCESS_PUBLIC_KEY', 'SIGNATURE']);
    }
    //@ts-expect-error
    const userSigner = new InjectedArweaveSigner(window.arweaveWallet);
    await userSigner.setPublicKey();

    let tags = addTags(currentTags, aftr);
    const warp = warpInit(env);
    try {
        //@ts-expect-error
        let txIds = await warp.deployFromSourceTx({
            wallet: userSigner,
            initState: initState,
            srcTxId: srcId,
            tags
        });
        return { status: "success", data: txIds };
    } catch (e) {
        return { status: "error", message: "ERROR deploying AFTR contract: " + e};
    }
};

function addTags(currentTags, aftr = false) {
    let tags = [];
    if (currentTags) {
        tags = currentTags;
    }
    if (aftr) {
        tags.push({ name: "Protocol", value: "AFTR" });
    }

    return tags;
};

function arweaveInit (env: "PROD" | "TEST" | "DEV") {
    let arweave = {};

    if (env === "DEV") {
        arweave = Arweave.init({
            host: "localhost",
            port: 1984,
            protocol: "http"
        });
    } else {
        arweave = Arweave.init({
            host: "arweave.net",
            port: 443,
            protocol: "https"
        });
    }

    return arweave;
};

export { warpInit, warpRead, warpWrite, warpCreateFromTx, arweaveInit };