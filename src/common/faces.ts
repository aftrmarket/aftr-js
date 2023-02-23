import { JWKInterface } from "arweave/node/lib/wallet";

export type ExtensionOrJWK = "use_wallet" | JWKInterface;

export type SDKResult = { status: "success", data: string  } | { status: "error", message: string }

export interface RepoInterface {
    name: string,
    ticker: string,
    balances: {
        [addr: string]: number;
    };
    owner: string;
    ownership: 'single' | 'multi';
    votingSystem: 'equal' | 'weighted';
    status: 'stopped' | 'started' | 'expired';
    vault: {
        [key: string]: [{
            balance: number,
            end: number,
            start: number
        }]
    }  | {},
    votes: VoteInterface[]  | [],
    tokens?: [
        TokenInterface,
    ] | [],
    leases?: {
        [lessee: string]: [
            {
                start: number,
                end: number,
            }
        ],
    },    
    claimable: ClaimableInterface[],
    claims: string[],
    evolve?: string,
    settings?: Map<string, any>
}

export interface InputInterface {
    function: 'balance' | 'lease' | 'propose' | 'vote' | 'transfer' | 'multiInteraction' | 'allow' | 'claim' | 'evolve' | 'finalize' | 'sync',
    type?: string,
    recipient?: string,
    target?: string,
    qty?: number,
    key?: string,
    value?: string,
    note?: string,
    actions?: InputInterface[]
}

export interface DepositInterface {
    function: 'deposit',
    txID: string,
    tokenId: string,
    qty: number,
    lockLength?: number,
}

export interface VoteInterface {
    status?: 'active' | 'quorumFailed' | 'passed' | 'failed';
    statusNote?: string;
    type?: 'addBalance' | 'subractBalance' | 'indicative' | 'set' | 'addMember' | 'incLocked' | 'removeMember' | 'withdrawal' | 'externalInteraction' | 'evolve';
    id?: string;
    totalWeight?: number;
    recipient?: string;
    target?: string;
    qty?: number;
    key?: string;
    value?: any;
    note?: string;
    votingPower?: {
        [addr: string]: number
    };
    quorum?: number;
    support?: number;
    yays?: number;
    nays?: number;
    voted?: string[];
    start?: number;
    voteLength?: number;
    lockLength?: number;
    txID?: string;
}

export interface TokenInterface {
    txID: string,
    tokenId: string,
    source: string,
    balance: number,
    start: number,
    lockLength?: number,
}

export interface ClaimableInterface {
    from: string;
    to: string;
    qty: number;
    txID: string;
}