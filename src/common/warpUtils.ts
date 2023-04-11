import { ExtensionOrJWK, SDKResult, InputInterface } from './faces';
//@ts-ignore
import { WarpFactory } from "warp-contracts/web";

function warpInit(env: "PROD" | "TEST") {
    let warp = {};

    try {
        // Using Warp
        if (env === "PROD") {
            warp = WarpFactory.forMainnet();
        } else {
            warp = WarpFactory.forTestnet();
        }
    } catch (e) {
        console.log(e);
    }
    return warp;
};

async function warpRead(contractId: string, internalWrites = true, env: "PROD" | "TEST") : Promise<SDKResult> {
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

async function warpWrite(contractId: string, input: InputInterface, internalWrites = true, bundling = true, wallet: ExtensionOrJWK, env: "PROD" | "TEST") : Promise<SDKResult> {
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

async function warpCreateFromTx(initState: string, srcId: string, currentTags = undefined, aftr = false, wallet: ExtensionOrJWK, env: "PROD" | "TEST") : Promise<SDKResult> {
    let tags = addTags(currentTags, aftr);

    const warp = warpInit(env);
    try {
        //@ts-expect-error
        let txIds = await warp.deployFromSourceTx({
            wallet: wallet,
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


export { warpInit, warpRead, warpWrite, warpCreateFromTx };