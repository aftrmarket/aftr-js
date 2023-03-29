declare module 'aftr-js' {
    import { RepoInterface, ExtensionOrJWK, SDKResult } from '../common/faces';
    export function createRepo(repo: RepoInterface, wallet: ExtensionOrJWK, tags?: any, env?: "PROD" | "TEST"): Promise<SDKResult>;
    export function deposit(wallet: ExtensionOrJWK, contract: string, amount: string, env?: "PROD" | "TEST"): Promise<SDKResult>;
}