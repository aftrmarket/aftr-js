var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
        var fulfilled = (value) => {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        };
        var rejected = (value) => {
            try {
                step(generator.throw(value));
            } catch (e) {
                reject(e);
            }
        };
        var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
        step((generator = generator.apply(__this, __arguments)).next());
    });
};

// contract/vehicle/contract.ts
var multiLimit = 10;
var multiIteration = 0;
function handle(state, action) {
    return __async(this, null, function* () {
        var _a;
        const balances = state.balances;
        const input = action.input;
        const caller = action.caller;
        const settings = new Map(state.settings);
        const votes = state.votes;
        let target = "";
        let balance = 0;
        let functions = state.functions ? state.functions : ["transfer", "deposit", "allow", "claim", "multiInteraction"];
        if (!Array.isArray(functions)) {
            functions = ["transfer", "deposit", "allow", "claim", "multiInteraction"];
        }
        const votingSystem = state.votingSystem ? state.votingSystem : "weighted";
        if (typeof input.iteration !== "undefined") {
            if (isNaN(input.iteration)) {
                throw new ContractError("Invalid value for iteration.");
            } else {
                multiIteration = input.iteration;
            }
        }
        const block = +SmartWeave.block.height;
        if (input.function === "balance") {
            target = isArweaveAddress(input.target || caller);
            if (typeof target !== "string") {
                throw new ContractError("Must specificy target to get balance for.");
            }
            balance = 0;
            if (target in balances) {
                balance = balances[target];
            }
        }
        if (input.function === "propose") {
            const voteType = input.type;
            let note = input.note;
            let target2 = input.target;
            let qty = +input.qty;
            let key = input.key;
            let value = input.value;
            let voteLength = input.voteLength;
            let lockLength = input.lockLength;
            let start = input.start;
            let txID = input.txID;
            if (!(caller in balances) || !(balances[caller] > 0)) {
                let totalBalance = 0;
                if (state.vault[caller]) {
                    for (let bal of state.vault[caller]) {
                        totalBalance += bal.balance;
                    }
                }
                if (totalBalance === 0) {
                    throw new ContractError("Caller is not allowed to propose vote.");
                }
            }
            let totalWeight = 0;
            let votingPower = JSON.parse(JSON.stringify(balances));
            if (state.ownership === "single") {
                if (caller !== state.owner) {
                    throw new ContractError("Caller is not the owner of the repo.");
                }
                votingPower = { [caller]: 1 };
                totalWeight = 1;
            } else if (votingSystem === "equal") {
                for (let addr in votingPower) {
                    if (votingPower[addr] > 0) {
                        votingPower[addr] = 1;
                        totalWeight++;
                    } else {
                        delete votingPower[addr];
                    }
                }
                for (let addr in state.vault) {
                    if (!(addr in votingPower)) {
                        let totalLockedBalance = 0;
                        for (let bal of state.vault[addr]) {
                            totalLockedBalance += bal.balance;
                        }
                        if (totalLockedBalance > 0) {
                            totalWeight++;
                            votingPower[addr] = 1;
                        }
                    }
                }
            } else if (votingSystem === "weighted") {
                for (let member in balances) {
                    totalWeight += balances[member];
                }
                for (let addr in state.vault) {
                    let totalLockedBalance = 0;
                    for (let bal of state.vault[addr]) {
                        totalLockedBalance += bal.balance;
                        totalWeight += bal.balance;
                    }
                    if (votingPower[addr]) {
                        votingPower[addr] += totalLockedBalance;
                    } else {
                        votingPower[addr] = totalLockedBalance;
                    }
                }
            } else {
                throw new ContractError("Invalid voting system.");
            }
            let recipient = "";
            if (state.ownership === "single") {
                voteLength = 0;
            } else if (!voteLength || typeof voteLength === "undefined") {
                voteLength = settings.get("voteLength");
            } else if (voteLength < 0) {
                throw new ContractError("Invalid Vote Length.");
            }
            if (lockLength || typeof lockLength !== "undefined") {
                if (lockLength < 0) {
                    throw new ContractError("Invalid Lock Length.");
                }
            } else {
                lockLength = 0;
            }
            if (!start || typeof start === "undefined") {
                start = block;
            } else if (start < 0 || typeof start !== "number") {
                throw new ContractError("Invalid Start value.");
            }
            if (voteType === "evolve") {
                if (!input.value) {
                    throw new ContractError("Error in input.  No value exists.");
                }
                const evolveSrcId = isArweaveAddress(input.value);
                note = "Evolve contract to " + evolveSrcId + ". Make sure you understand the proposed contract changes before voting to evolve.";
            } else if (voteType === "addBalance" || voteType === "subtractBalance" || voteType === "addLocked" || voteType === "addMember" || voteType === "removeMember") {
                if (!input.recipient) {
                    throw new ContractError("Error in input.  Recipient not supplied.");
                }
                recipient = isArweaveAddress(input.recipient);
                if (!qty || !(qty > 0)) {
                    throw new ContractError("Error in input.  Quantity not supplied or is invalid.");
                }
                if (voteType === "addBalance" || voteType === "addMember" || voteType === "addLocked") {
                    let totalTokens = 0;
                    for (let wallet in balances) {
                        totalTokens += balances[wallet];
                    }
                    if (totalTokens + qty > Number.MAX_SAFE_INTEGER) {
                        throw new ContractError("Proposed quantity is too large.");
                    }
                }
                if (voteType === "subtractBalance") {
                    if (!balances[recipient]) {
                        throw new ContractError("Request to decrease for recipient not in balances.");
                    }
                    if (qty > balances[recipient]) {
                        throw new ContractError("Invalid quantity.  Can't decrease more than recipient has.");
                    }
                    if (state.ownership === "single" && balances[recipient] - qty < 1 && recipient === state.owner) {
                        throw new ContractError("Invalid quantity.  Can't decrease all the owner's balance.  The owner must have at least a balance of 1 or the repo will be rendered useless.");
                    }
                }
                if (voteType === "removeMember") {
                    if (recipient === state.owner) {
                        throw new ContractError("Can't remove owner from balances.");
                    }
                }
                if (voteType === "addMember") {
                    if (recipient === SmartWeave.contract.id) {
                        throw new ContractError("Can't add the repo as a member.");
                    }
                }
                if (!isProposedOwnershipValid(state, voteType, qty, recipient)) {
                    throw new ContractError("The proposed change is not allowed as it would leave the ownership of the repo with no balance thus rendering the repo useless.");
                }
                if (voteType === "addBalance") {
                    note = "Add balance of " + String(qty) + " to " + recipient;
                } else if (voteType === "addLocked") {
                    note = "Add and Lock a balance of " + String(qty) + " for " + recipient;
                } else if (voteType === "subtractBalance") {
                    note = "Subtract balance of " + String(qty) + " for " + recipient;
                } else if (voteType === "addMember") {
                    note = "Add new member, " + recipient + ", with a balance of " + String(qty);
                } else if (voteType === "removeMember") {
                    note = "Remove member, " + recipient + ", with a balance of " + String(qty);
                }
            } else if (voteType === "set") {
                if (!key || key === "") {
                    throw new ContractError("Invalid Key.");
                }
                if (!value || value === "") {
                    throw new ContractError("Invalid Value.");
                }
                const validationResponce = validateProperties(key, value);
                if (validationResponce !== "") {
                    throw new ContractError(validationResponce);
                }
                if (key === "owner") {
                    if (!isProposedOwnershipValid(state, voteType, qty, value)) {
                        throw new ContractError("The proposed change is not allowed as it would leave the ownership of the repo with no balance thus rendering the repo useless.");
                    }
                }
                let currentValue = String(getStateValue(state, key));
                note = "Change " + getStateProperty(key) + " from " + currentValue + " to " + String(value);
            } else if (voteType === "withdrawal") {
                if (!qty || !(qty > 0)) {
                    throw new ContractError("Error in input.  Quantity not supplied or is invalid.");
                }
                if (!input.txID) {
                    throw new ContractError("Error in input.  No Transaction ID found.");
                }
                txID = input.txID;
                if (!target2) {
                    throw new ContractError("Error in input.  Target not supplied.");
                }
                target2 = isArweaveAddress(target2);
                const tokenObj = (_a = state.tokens) == null ? void 0 : _a.find((token) => token.txID === txID);
                if (tokenObj && tokenObj.balance < qty) {
                    throw new ContractError("Not enough " + tokenObj.tokenId + " tokens to withdrawal.");
                }
            } else if (voteType === "externalInteraction") {
                if (value == "" || typeof value !== "string") {
                    throw new ContractError("Invalid input value.");
                }
                if (!state.tokens || !state.tokens.find((token) => token.tokenId === target2)) {
                    throw new ContractError("Invalid target.");
                }
                note = "External Interaction on contract " + target2;
            } else {
                throw new ContractError("Vote Type not supported.");
            }
            let voteId = String(SmartWeave.block.height) + SmartWeave.transaction.id + String(multiIteration);
            let vote = {
                status: "active",
                type: voteType,
                id: voteId,
                totalWeight,
                votingPower,
                yays: 0,
                nays: 0,
                voted: [],
                start,
                lockLength,
                voteLength,
                quorum: settings.get("quorum"),
                support: settings.get("support")
            };
            if (recipient !== "") {
                vote.recipient = recipient;
            }
            if (target2 && target2 !== "") {
                vote.target = target2;
            }
            if (qty) {
                vote.qty = qty;
            }
            if (key && key !== "") {
                vote.key = key;
            }
            if (value && value !== "") {
                vote.value = value;
            }
            if (note && note !== "") {
                vote.note = note;
            }
            if (txID && txID !== "") {
                vote.txID = txID;
            }
            votes.push(vote);
        }
        if (input.function === "vote") {
            const voteId = input.voteId;
            const cast = input.cast;
            const vote = votes.find((vote2) => vote2.id === voteId);
            if (typeof vote === "undefined") {
                throw new ContractError("Vote does not exist.");
            }
            let voterBalance = 0;
            if (state.ownership === "single" && caller !== state.owner) {
                throw new ContractError("Caller is not the owner of the repo.");
            } else if (!(caller in vote.votingPower)) {
                throw new ContractError("Caller isn't a member of the repo and therefore isn't allowed to vote.");
            } else {
                voterBalance = vote.votingPower[caller];
            }
            if (voterBalance == 0) {
                throw new ContractError("Caller's balance is 0 and therefore isn't allowed to vote.");
            }
            if (vote.status !== "active") {
                throw new ContractError("Vote is not active.");
            }
            if (vote.voted.includes(caller)) {
                throw new ContractError("Caller has already voted.");
            }
            if (cast === "yay") {
                vote.yays += voterBalance;
            } else if (cast === "nay") {
                vote.nays += voterBalance;
            } else {
                throw new ContractError("Invalid vote cast.");
            }
            vote.voted.push(caller);
        }
        if (input.function === "finalize") {
            if (state.ownership !== "multi") {
                throw new ContractError("Only multi-owned repos can use the finalize function.");
            }
        }
        if (input.function === "transfer") {
            const target2 = input.target;
            const qty = input.qty;
            const callerAddress = isArweaveAddress(caller);
            const targetAddress = isArweaveAddress(target2);
            if (!functions.includes("transfer")) {
                throw new ContractError("The transfer function is not allowed in this repo.");
            }
            if (!Number.isInteger(qty)) {
                throw new ContractError('Invalid value for "qty". Must be an integer.');
            }
            if (!targetAddress) {
                throw new ContractError("No target specified.");
            }
            if (qty <= 0 || callerAddress === targetAddress) {
                throw new ContractError("Invalid token transfer.");
            }
            if (!balances[callerAddress] || balances[callerAddress] == void 0 || balances[callerAddress] == null || isNaN(balances[callerAddress])) {
                throw new ContractError("Caller doesn't own a balance in the Repo.");
            }
            if (balances[callerAddress] < qty) {
                throw new ContractError(`Caller balance not high enough to send ${qty} token(s)!`);
            }
            if (SmartWeave.contract.id === target2) {
                throw new ContractError("A repo token cannot be transferred to itself because it would add itself the balances object of the repo, thus changing the membership of the repo without a vote.");
            }
            if (state.ownership === "single" && callerAddress === state.owner && balances[callerAddress] - qty <= 0) {
                throw new ContractError("Invalid transfer because the owner's balance would be 0.");
            }
            balances[callerAddress] -= qty;
            if (targetAddress in balances) {
                balances[targetAddress] += qty;
            } else {
                balances[targetAddress] = qty;
            }
        }
        if (input.function === "deposit") {
            if (!functions.includes("deposit")) {
                throw new ContractError("The deposit function is not allowed in this repo.");
            }
            if (!input.txID) {
                throw new ContractError("The transaction is not valid.  Tokens were not transferred to the repo.");
            }
            if (!input.tokenId) {
                throw new ContractError("No token supplied. Tokens were not transferred to the repo.");
            }
            if (input.tokenId === SmartWeave.contract.id) {
                throw new ContractError("Deposit not allowed because you can't deposit an asset of itself.");
            }
            if (!input.qty || typeof +input.qty !== "number" || +input.qty <= 0) {
                throw new ContractError("Qty is invalid.");
            }
            let lockLength = input.lockLength ? input.lockLength : 0;
            const transferResult = yield SmartWeave.contracts.write(input.tokenId, {
                function: "claim",
                txID: input.txID,
                qty: input.qty
            });
            if (transferResult.type !== "ok") {
                throw new ContractError("Unable to deposit token " + input.tokenId);
            }
            const tokenInfo = yield getTokenInfo(transferResult.state);
            const txObj = {
                txID: input.txID,
                tokenId: input.tokenId,
                source: caller,
                balance: input.qty,
                start: SmartWeave.block.height,
                name: tokenInfo.name,
                ticker: tokenInfo.ticker,
                logo: tokenInfo.logo,
                lockLength
            };
            if (!state.tokens) {
                state["tokens"] = [];
            }
            state.tokens.push(txObj);
        }
        if (input.function === "allow") {
            if (!functions.includes("allow")) {
                throw new ContractError("The allow function is not allowed in this repo.");
            }
            target = input.target;
            const quantity = input.qty;
            if (!Number.isInteger(quantity) || quantity === void 0) {
                throw new ContractError("Invalid value for quantity. Must be an integer.");
            }
            if (!target) {
                throw new ContractError("No target specified.");
            }
            if (target === SmartWeave.contract.id) {
                throw new ContractError("Can't setup claim to transfer a balance to itself.");
            }
            if (quantity <= 0 || caller === target) {
                throw new ContractError("Invalid balance transfer.");
            }
            if (balances[caller] < quantity || !balances[caller] || balances[caller] == void 0 || balances[caller] == null || isNaN(balances[caller])) {
                throw new ContractError("Caller balance not high enough to make a balance of " + quantity + "claimable.");
            }
            balances[caller] -= quantity;
            state.claimable.push({
                from: caller,
                to: target,
                qty: quantity,
                txID: SmartWeave.transaction.id
            });
        }
        if (input.function === "claim") {
            if (!functions.includes("claim")) {
                throw new ContractError("The claim function is not allowed in this repo.");
            }
            const txID = input.txID;
            const qty = input.qty;
            if (!state.claimable.length) {
                throw new ContractError("Contract has no claims available.");
            }
            let obj;
            let index = -1;
            for (let i = 0; i < state.claimable.length; i++) {
                if (state.claimable[i].txID === txID) {
                    index = i;
                    obj = state.claimable[i];
                }
            }
            if (obj === void 0) {
                throw new ContractError("Unable to find claim.");
            }
            if (obj.to !== caller) {
                throw new ContractError("Claim not addressed to caller.");
            }
            if (obj.qty !== qty) {
                throw new ContractError("Claiming incorrect quantity of tokens.");
            }
            for (let i = 0; i < state.claims.length; i++) {
                if (state.claims[i] === txID) {
                    throw new ContractError("This claim has already been made.");
                }
            }
            if (!balances[caller]) {
                balances[caller] = 0;
            }
            balances[caller] += obj.qty;
            state.claimable.splice(index, 1);
            state.claims.push(txID);
        }
        if (input.function === "multiInteraction") {
            if (!functions.includes("multiInteraction")) {
                throw new ContractError("Multiple changes to this repo at once are not allowed.");
            }
            if (typeof input.actions === "undefined") {
                throw new ContractError("Invalid Multi-interaction input.");
            }
            const multiActions = input.actions;
            if (multiActions.length > multiLimit) {
                throw new ContractError("The Multi-interactions call exceeds the maximum number of interations.");
            }
            let iteration = 1;
            let updatedState = state;
            for (let nextAction of multiActions) {
                nextAction.input.iteration = iteration;
                if (nextAction.input.function === "multiInteraction") {
                    throw new ContractError("Nested Multi-interactions are not allowed.");
                }
                nextAction.caller = caller;
                let result = yield handle(updatedState, nextAction);
                updatedState = result.state;
                iteration++;
            }
            state = updatedState;
        }
        if (Array.isArray(votes)) {
            const concludedVotes = votes.filter((vote) => (block > vote.start + vote.voteLength || state.ownership === "single" || vote.yays / vote.totalWeight >= vote.support && (vote.yays + vote.nays) / vote.totalWeight >= vote.quorum || vote.nays / vote.totalWeight > vote.support || vote.totalWeight === vote.yays + vote.nays) && vote.status === "active");
            if (concludedVotes.length > 0) {
                yield finalizeVotes(state, concludedVotes, block);
            }
        }
        if (multiIteration <= 1) {
            if (state.vault && typeof state.vault === "object") {
                scanVault(state, block);
            }
            if (state.tokens) {
                yield returnLoanedTokens(state, block);
            }
        }
        if (input.function === "balance") {
            let vaultBal = 0;
            try {
                for (let bal of state.vault[caller]) {
                    vaultBal += bal.balance;
                }
            } catch (e) {
            }
            return { result: { target, balance, vaultBal } };
        } else {
            return { state };
        }
    });
}
function isArweaveAddress(addy) {
    const address = addy.toString().trim();
    if (!/[a-z0-9_-]{43}/i.test(address)) {
        throw new ContractError("Invalid Arweave address.");
    }
    return address;
}
function scanVault(repo, block) {
    for (const [key, arr] of Object.entries(repo.vault)) {
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].end <= block) {
                if (key in repo.balances) {
                    repo.balances[key] += arr[i].balance;
                } else {
                    repo.balances[key] = arr[i].balance;
                }
                repo.vault[key].splice(i, 1);
                i--;
            }
            if (repo.vault[key].length == 0) {
                delete repo.vault[key];
            }
        }
    }
}
function returnLoanedTokens(repo, block) {
    return __async(this, null, function* () {
        if (Array.isArray(repo.tokens)) {
            const unlockedTokens = repo.tokens.filter((token) => token.lockLength !== 0 && token.start + token.lockLength <= block);
            for (let token of unlockedTokens) {
                const wdResult = yield SmartWeave.contracts.write(token.tokenId, {
                    function: "transfer",
                    target: token.source,
                    qty: token.balance
                });
            }
        }
    });
}
function getStateProperty(key) {
    if (key.substring(0, 9) === "settings.") {
        key = key.substring(9);
    }
    return key;
}
function getStateValue(repo, key) {
    const settings = new Map(repo.settings);
    let value = "";
    if (key.substring(0, 9) === "settings.") {
        let setting = key.substring(9);
        value = settings.get(setting);
    } else {
        value = repo[key];
    }
    return value;
}
function validateProperties(key, value) {
    let response = "";
    if (key === "settings.quorum" && (value < 0 || value > 1)) {
        response = "Quorum must be between 0 and 1.";
    }
    if (key === "settings.support" && (value < 0 || value > 1)) {
        response = "Support must be between 0 and 1.";
    }
    if (key === "owner" && !/[a-z0-9_-]{43}/i.test(value)) {
        response = "Proposed owner is invalid.";
    }
    return response;
}
function finalizeVotes(repo, concludedVotes, block) {
    return __async(this, null, function* () {
        for (let vote of concludedVotes) {
            const quorum = (vote.yays + vote.nays) / vote.totalWeight;
            const support = vote.yays / vote.totalWeight;
            const opposition = vote.nays / vote.totalWeight;
            if (repo.ownership === "single") {
                vote.statusNote = "Single owner, no vote required.";
                vote.status = "passed";
                yield modifyRepo(repo, vote);
            } else if (support >= vote.support && quorum >= quorum) {
                vote.statusNote = "Total Support achieved prior to vote completion.";
                vote.status = "passed";
                yield modifyRepo(repo, vote);
            } else if (opposition > vote.support) {
                const finalOpposition = String(opposition * 100);
                vote.statusNote = "Total Opposition of " + finalOpposition + "% achieved prior to vote completion. No number of yays can exceed the total number of nays.";
                vote.status = "failed";
            } else if (vote.totalWeight === vote.yays + vote.nays || block > vote.start + vote.voteLength) {
                const finalSupport = String(support * 100);
                const finalQuorum = String(quorum * 100);
                if (support >= vote.support && quorum >= vote.quorum) {
                    vote.status = "passed";
                    vote.statusNote = "The proposal passed with " + String(finalSupport) + "% support and a " + String(finalQuorum) + "% quorum.";
                    yield modifyRepo(repo, vote);
                } else if (quorum < vote.quorum) {
                    vote.status = "quorumFailed";
                    vote.statusNote = "The proposal failed to reach quorum. The proposal's quorum was " + String(finalQuorum) + "%.";
                } else if (support < vote.support) {
                    vote.status = "failed";
                    vote.statusNote = "The proposal failed due to lack of support. The proposal's support was " + String(finalSupport) + "%.";
                }
            } else {
                vote.status = "failed";
                vote.statusNote = "The proposal result could not be determined.";
            }
        }
    });
}
function modifyRepo(repo, vote) {
    return __async(this, null, function* () {
        if (vote.type === "addBalance" || vote.type === "addMember") {
            if (vote.recipient in repo.balances) {
                repo.balances[vote.recipient] += vote.qty;
            } else {
                repo.balances[vote.recipient] = vote.qty;
            }
        } else if (vote.type === "addLocked") {
            let vaultObj = {
                balance: vote.qty,
                start: vote.start,
                end: vote.start + vote.lockLength
            };
            if (vote.recipient in repo.vault) {
                repo.vault[vote.recipient].push(vaultObj);
            } else {
                repo.vault[vote.recipient] = [vaultObj];
            }
        } else if (vote.type === "subtractBalance") {
            if (!isProposedOwnershipValid(repo, vote.type, vote.qty, vote.recipient)) {
                throw new ContractError("The proposed change is not allowed as it would leave the ownership of the repo with no balance thus rendering the repo useless.");
            }
            repo.balances[vote.recipient] -= vote.qty;
        } else if (vote.type === "removeMember") {
            if (!isProposedOwnershipValid(repo, vote.type, vote.qty, vote.recipient)) {
                throw new ContractError("The proposed change is not allowed as it would leave the ownership of the repo with no balance thus rendering the repo useless.");
            }
            delete repo.balances[vote.recipient];
        } else if (vote.type === "set") {
            if (vote.key.substring(0, 9) === "settings.") {
                let key = getStateProperty(vote.key);
                updateSetting(repo, key, vote.value);
            } else {
                if (vote.key === "owner" && !isProposedOwnershipValid(repo, vote.type, vote.qty, vote.value)) {
                    throw new ContractError("The proposed change is not allowed as it would leave the ownership of the repo with no balance thus rendering the repo useless.");
                }
                repo[vote.key] = vote.value;
            }
        } else if (vote.type === "evolve") {
            repo.evolve = vote.value;
        } else if (vote.type === "withdrawal") {
            const tokenObj = repo.tokens.find((token) => token.txID === vote.txID);
            const contractId = tokenObj.tokenId;
            const wdResult = yield SmartWeave.contracts.write(contractId, {
                function: "transfer",
                target: vote.target,
                qty: vote.qty
            });
            if (wdResult.type !== "ok") {
                throw new ContractError("Unable to withdrawal " + contractId + " for " + vote.target + ".");
            }
            tokenObj.balance -= vote.qty;
        } else if (vote.type === "externalInteraction") {
            const eiResult = yield SmartWeave.contracts.write(vote.target, JSON.parse(vote.value));
            if (eiResult.type !== "ok") {
                throw new ContractError("Unable to run External Interaction on contract " + vote.target);
            }
        }
    });
}
function updateSetting(repo, key, value) {
    let found = false;
    for (let setting of repo.settings) {
        if (setting[0] === key) {
            setting[1] = value;
            found = true;
            break;
        }
    }
    if (!found) {
        repo.settings.push([key, value]);
    }
}
function getTokenInfo(assetState) {
    return __async(this, null, function* () {
        const settings = new Map(assetState.settings);
        return {
            name: assetState.name,
            ticker: assetState.ticker,
            logo: settings.get("communityLogo")
        };
    });
}
function isProposedOwnershipValid(repo, proposalType, qty, member) {
    let valid = true;
    if (proposalType === "subtractBalance" && !Number.isInteger(qty)) {
        valid = false;
    }
    if (proposalType === "removeMember") {
        if (repo.ownership === "single" && repo.owner === member) {
            valid = false;
        } else if (repo.ownership === "multi") {
            let newBalances = JSON.parse(JSON.stringify(repo.balances));
            delete newBalances[member];
            for (let addr in newBalances) {
                if (newBalances[addr] > 0 && Number.isInteger(newBalances[addr])) {
                    valid = true;
                    break;
                } else {
                    valid = false;
                }
            }
        }
    } else if (proposalType === "subtractBalance") {
        if (repo.ownership === "single" && repo.owner === member && repo.balances[member] - qty < 1) {
            valid = false;
        }
        if (repo.ownership === "multi") {
            let newBalances = JSON.parse(JSON.stringify(repo.balances));
            newBalances[member] -= qty;
            for (let addr in newBalances) {
                if (newBalances[addr] > 0 && Number.isInteger(newBalances[addr])) {
                    valid = true;
                    break;
                } else {
                    valid = false;
                }
            }
        }
    } else if (proposalType === "set") {
        if (repo.ownership === "single" && (repo.balances[member] < 1 || !repo.balances[member])) {
            valid = false;
        }
    }
    return valid;
}
