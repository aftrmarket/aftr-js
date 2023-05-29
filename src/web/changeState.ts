import { ExtensionOrJWK, InputInterface, SDKResult } from './../common/faces';
// import { warpWrite } from '../common/warpUtils';
import { warpWrite } from '../__tests__/utils/warpUtils.js';
import Arweave from 'arweave';

const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https"
});

export async function changeState(repoId: string, changes: { key: string, value: string | number | object, note: string }[], wallet: ExtensionOrJWK, env: "PROD" | "TEST" = "PROD") {
    // TODO checks, look at aftr contract/market in RepoInfo
    if(changes.length > 10)
        return {status: "error", message: "Too many changes. You can only do 10 or less changes at once."};
    // TODO check if key is a string in the 
    if(!(isArweaveAddress(repoId)))
        return {status: "error", message: "Not a valid repoId"};


    let input : InputInterface = {
        function: 'propose',
        type: 'set',
        recipient: '',
        target: '',
        qty: 0,
        key: '',
        value: '',
        note: ''
    };
    
    if(changes.length > 1){
        input.function = 'multiInteraction';
        input.key = 'multi';
        input.note = 'Multi-Interaction'

        let actions = []
        for(const obj of changes){
            let multiAction = {
                input : {
                    function: 'propose',
                    type: 'set',
                    key: obj.key,
                    value: obj.value,
                    note: obj.note
                }
            };
            actions.push(multiAction);
        }
        input.actions = actions;
    }
    else if(changes.length == 1){
        input.key = changes[0].key;
        input.value = changes[0].value.toString();
        input.note = changes[0].note;
    }
    else{
        // do nothing because there are 0 changes
        return {status: "error", message: "0 changes were proposed"};
    }
    console.log(repoId)
    console.log(input)
    // const txid = await warpWrite(repoId, input, true, true, wallet, env);
    const txid = await warpWrite(wallet, repoId, input); // arlocal version
    // upon successful change
    return { status: "success", data: txid }
}

function isArweaveAddress(addr) {
    const address = addr.toString().trim();
    if (!/[a-z0-9_-]{43}/i.test(address)) {
        return false;
    }
    return true;
}