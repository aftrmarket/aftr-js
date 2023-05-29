import { ExtensionOrJWK, InputInterface, SDKResult } from './../common/faces';
import { warpWrite } from '../__tests__/utils/warpUtils.js';
import Arweave from 'arweave';

const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https"
});

export async function castVote(repoId: string, voteId: number, cast: "yay" | "nay", wallet: ExtensionOrJWK, env: "PROD" | "TEST" = "PROD"){
    if(!(isArweaveAddress(repoId)))
        return {status: "error", message: "Not a valid repoId"};
    
    let input : InputInterface = {
        function: 'vote',
        voteId: voteId,
        cast: cast
    }

    // const txid = await warpWrite(this.repoId, input, true, true, wallet, env);
    const txid = await warpWrite(wallet, repoId, input); // arlocal version
    // upon successful cast
    return { status: "success", data: txid }
}

function isArweaveAddress(addr) {
    const address = addr.toString().trim();
    if (!/[a-z0-9_-]{43}/i.test(address)) {
        return false;
    }
    return true;
}