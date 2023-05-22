import { RepoInterface, ExtensionOrJWK, SDKResult } from './../common/faces';
import { warpCreateFromTx } from '../common/warpUtils';
import Arweave from 'arweave';

const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https"
});

export async function createRepo(repo: RepoInterface, wallet: ExtensionOrJWK, tags?: any, env: "PROD" | "TEST" = "PROD") : Promise<SDKResult> {
    const AFTR_CONTRACT_SOURCE_ID = (env === "PROD") ? "00elNGZCnqSfVIBUUOBeFB8VGg0nX8vCiDyZed0Zdys" : "LtdnLZJ1wfVXqGZKTgZPB3zzo3oUQxifpQeYIDDEFhU";
    const walletAddress = await arweave.wallets.jwkToAddress(wallet);

    if (!walletAddress || typeof walletAddress !== "string" || !isArweaveAddress(walletAddress)) {
        return { status: "error", message: "Invalid owner supplied." };
    }

    const vResult = validateRepo(repo);
    if (!vResult.validation) {
        return { status: "error", message: vResult.error };
    }

    if (tags && !areTagsValid(tags)) {
        return { status: "error", message: "Tags are invalid" };
    }

    const functions = repo.functions ? repo.functions : ["transfer", "deposit", "allow", "claim", "multiInteraction"];

    let repoTemplate = {
        "name": repo.name,
        "ticker": repo.ticker,
        "balances": {},
        "tokens": [],
        "vault": {},
        "votes": [],
        "status": "started",
        "owner": walletAddress,
        "ownership": "single",
        "votingSystem": "weighted",
        "claims": [],
        "claimable": [],
        "functions": functions,
        "evolve": "",
        "settings": [
            ["quorum", 0.5],
            ["support", 0.51],
            ["voteLength", 2160],
            ["communityLogo", ""]
        ]
    }

    repoTemplate.balances[walletAddress] = 1;

    try {
        const result = await warpCreateFromTx(JSON.stringify(repoTemplate), AFTR_CONTRACT_SOURCE_ID, tags, true, wallet, env);

        if (result.status === "success") {
            //@ts-expect-error
            return { status: "success", data: result.data.contractTxId };
        } else {
            return { status: "error", message: result.message };
        }
    } catch (e) {
        return { status: "error", message: e };
    }
}

function validateRepo(repo: RepoInterface) {
    // Function to look for invalid repo data

    if (!repo.name || typeof repo.name !== "string" || repo.name === "") {
        return { validation: false, error: "Invalid name supplied." };
    }
    if (!repo.ticker || typeof repo.ticker !== "string" || repo.ticker === "") {
        return { validation: false, error: "Invalid ticker supplied." };
    }

    if (typeof repo.functions !== "undefined") {
        if (!Array.isArray(repo.functions)) {
            return { validation: false, error: "The functions property must be an array." }
        }

        const validFunctions = ["transfer", "deposit", "allow", "claim", "multiInteraction"];
        if ( repo.functions.length !== 0 && !(repo.functions.every(item => validFunctions.includes(item))) ) {
            return { validation: false, error: "Values for the functions parameter can only be 'transfer', 'deposit', 'allow', 'claim', and/or 'multiInteraction'." }
        }

    }

    /*** Defaulting values to make it easier on partners for now
    const settings: Map<string, any> = new Map(repo.settings);

    if (repo.ownership && repo.ownership !== "single" && repo.ownership !== "multi") {
        return { validation: false, error: "ownership can only be 'single' or 'multi'" };
    }

    if (repo.votingSystem && repo.votingSystem !== "weighted" && repo.votingSystem !== "equal") {
        return { validation: false, error: "votingSystem can only be 'weighted' or 'single'" };
    }

    const quorum = settings.get("quorum");
    if (quorum && (quorum < 0 || quorum > 1)) {
        return { validation: false, error: "quorum must be between 0 and 1" };
    }

    const support = settings.get("support");
    if (support && (support < 0 || support > 1)) {
        return { validation: false, error: "support must be between 0 and 1" };
    }
    ***/

    return { validation: true, error: "" }
}

function isArweaveAddress(addr: string) : boolean {
    const address = addr.toString().trim();
    if (!/[a-z0-9_-]{43}/i.test(address)) {
        return false;
    }
    return true;
  }

function areTagsValid(tags: []) {
    if (!Array.isArray(tags)) {
        return false;
    }

    for (let i = 0; i < tags.length; i++) {
        const obj = tags[i];
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
          return false;
        }
        if (!('name' in obj) || !('value' in obj)) {
          return false;
        }
    }

    return true; 
}