import { ExtensionOrJWK, InputInterface, SDKResult } from './../common/faces';
import { warpWrite } from '../__tests__/utils/warpUtils.js';

export async function evolve(repoId: string, newContractSourceId: string, wallet: ExtensionOrJWK, env: "PROD" | "TEST" = "PROD") {
    // TODO how to validate new contract source id
    if(!(isArweaveAddress(repoId)))
        return {status: "error", message: "Not a valid repoId"};

    let input : InputInterface = {
        function: "propose",
        type: "evolve",
        recipient: "",
        qty: 0,
        key: "",
        value: newContractSourceId,
        note: ""
    }

    const txid = await warpWrite(wallet, repoId, input); // arlocal version
    return {status: "success", data: txid};
}
function isArweaveAddress(addr) {
    const address = addr.toString().trim();
    if (!/[a-z0-9_-]{43}/i.test(address)) {
        return false;
    }
    return true;
}