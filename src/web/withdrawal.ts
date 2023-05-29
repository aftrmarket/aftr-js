import { DepositInterface, ExtensionOrJWK, InputInterface, SDKResult } from '../common/faces';
import { warpRead, warpWrite } from '../common/warpUtils';
import Arweave from 'arweave';

const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https"
});

export async function withdrawal(repoId: string, withdrawals:{txId: string, target: string, qty: number, note: string}[], wallet: ExtensionOrJWK, env: "PROD" | "TEST" = "PROD"){
    //TODO figure out checks
    // TODO NEED help with testing, what is a withdrawal
    // repoTokens.vue doesn't have an input built, so withdrawls isn't possible currently?? code is commented out
    if (!isArweaveAddress(repoId)) {
        return { status: "error", message: "repoId is invalid." };
    }

    // if (!isArweaveAddress(depTokenId)) {
    //     return { status: "error", message: "depTokenId is invalid." };
    // }

    // if (isNaN(qty)) {
    //     return { status: "error", message: "qty is invalid." };
    // }

    let input : InputInterface = {
        function: 'propose',
        type: 'withdrawal',
        txId: '',
        target: '',
        qty: 0,
        note: ''
    };

    if(withdrawals.length  > 1){
        input.function = 'multiInteraction';
        input.key = 'multi';
        input.note = 'Multi-Interaction'

        let actions = []
        for(const obj of withdrawals){
            let multiAction = {
                input : {
                    function: 'propose',
                    type: 'set',
                    txId: obj.txId,
                    target: obj.target,
                    qty: obj.qty,
                    note: obj.note
                }
            };
            actions.push(multiAction);
        }
        input.actions = actions;

    }
    else if(withdrawals.length == 1){
        input.txId = withdrawals[0].txId;
        input.target = withdrawals[0].target;
        input.qty =  withdrawals[0].qty;
        input.note = withdrawals[0].note;
    }
    else{
        return {status: "error", message: "0 withdrawls were proposed"};
    }
}

function isArweaveAddress(addr) {
    const address = addr.toString().trim();
    if (!/[a-z0-9_-]{43}/i.test(address)) {
        return false;
    }
    return true;
}