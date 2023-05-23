import fetch from 'cross-fetch'
import Arweave from 'arweave';
import ArLocal from 'arlocal';
import { JWKInterface } from "arweave/node/lib/wallet";
import { warpRead, warpWrite, warpCreateContract, arweaveInit, PORT } from './utils/warpUtils.js';

import fs from 'fs';
import path from 'path';

let arweave = <Arweave>arweaveInit();
interface TxIds {
    contractTxId: string,
    srcTxId: string
};

// Set to true to use the `contractSourcePath` as the contract source
// Set to false to use the AFTR contract source, via warp
const USE_LOCAL_CONTRACT_SOURCE = false
const contractSourcePath = './files/contract.js'
const aftrContractSourceId = 'LtdnLZJ1wfVXqGZKTgZPB3zzo3oUQxifpQeYIDDEFhU'

describe('AFTR-JS Tests', () => {
    let arlocal: ArLocal
    let jwk: JWKInterface;
    let address: string;
    let REPO_ID: string;
    let REPO_CONTRACT_SRC_ID: string;

    // Runs before all tests
    beforeAll(async () => {
        // Initialize and start ArLocal
        arlocal = new ArLocal(PORT, false);
        await arlocal.start()
        console.log('ArLocal started.')

        // Generate a wallet
        jwk = await arweave.wallets.generate();
        // Obtain its address
        address = await arweave.wallets.getAddress(jwk);

        // Mint wallet some AR
        const server = "http://localhost:" + arweave.getConfig().api.port;
        const route = '/mint/' + address + '/100000000000000';     // Amount in Winstons
        const mintResult = await fetch(server + route)

        // AFTR contract source file
        let contractSource: string
        if (USE_LOCAL_CONTRACT_SOURCE) {
            // get contract source code from local file
            contractSource = fs.readFileSync(path.join(__dirname, contractSourcePath), "utf8");
        } else {
            // get contract source code from AFTR contract source
            contractSource = await getSource(aftrContractSourceId)
        }

        /*
            Create AFTR Repo using warp
        */
        const repoInitState = setInitState(address)

        // Create the AFTR Vehicle, and store its contract ID
        const txIds: TxIds = await warpCreateContract(jwk, contractSource, repoInitState, undefined, true);
        REPO_ID = txIds.contractTxId;
        REPO_CONTRACT_SRC_ID = txIds.srcTxId;
    })

    it('should add a new member to the vehicle and mint them 9000 tokens', async () => {
        // Create a wallet for a second member
        let newMember = await createWallet()
        try {
            const jwk = await arweave.wallets.generate();
            const address = await arweave.wallets.getAddress(jwk)
            newMember = { jwk, address }
        } catch (error) {
            console.log('Unable to generate new member wallet\n' + error)
        }

        const mintAmt = 9000;

        // Use warp to write the change to the contract
        const input = {
            "function": "propose",
            "type": "addMember",
            "recipient": newMember.address,
            "qty": mintAmt
        };
        const result = await warpWrite(jwk, REPO_ID, input);

        // Read the contract after writing the change
        const state = (await warpRead(REPO_ID)).state;
        const balance = state.balances[newMember.address];

        // Check to see if the contract changed! 
        expect(mintAmt > 0).toBeTruthy()
        expect(balance).toBe(mintAmt)
    });

    describe('changeState tests', () => {
        let newMember = createWallet()
        let anotherMember = createWallet()

        test('add a new member', async () => {
            // import your change state function
            // use the change state function to add a member
            // use the expect() function to check if that member is now in the balances
        })

        test('change the balance of the new member', async () => {
        })

        test('change the name of the repo', async () => {
        })

        test('execute a multi-interaction', async () => {
            // 1. add a new member, 
            // 2. set ownership to 'multi', 
            // 3. change settings.support to 35%
        })
    })

    afterAll(async () => {
        await arlocal.stop();
        console.log('ArLocal stopped.')
    })
})

async function getSource(contractSrcId: string) {
    let route = 'https://gw.warp.cc/gateway/contract-source?id=' + contractSrcId
    let response = await fetch(route);
    let data: any = await response.json();
    return data.src;
}

function setInitState(owner: string): string {
    const repoInitState = fs.readFileSync(path.join(__dirname, './files/initState.json'), "utf8");
    const stateObj = JSON.parse(repoInitState);
    // If no owner is set, set the owner to the wallet used to create the repo.
    stateObj.owner = stateObj.owner === '' ? owner : stateObj.owner
    // If balances object is empty, add the repo owner to the balances object.
    stateObj.balances = Object.keys(stateObj.balances).length === 0 ? { [stateObj.owner]: 1 } : stateObj.balances
    console.log(stateObj)
    return JSON.stringify(stateObj);
}

async function createWallet() {
    try {
        const jwk = await arweave.wallets.generate();
        const address = await arweave.wallets.getAddress(jwk)
        return { jwk, address }
    } catch (error) {
        console.log('Unable to generate new wallet\n' + error)
    }
}
