import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that governance token can be minted by owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(1000), types.principal(wallet1.address)],
                deployer.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Verify balance
        let balanceCall = chain.callReadOnlyFn(
            'governance-token',
            'get-balance',
            [types.principal(wallet1.address)],
            deployer.address
        );
        balanceCall.result.expectOk().expectUint(1000);
    },
});

Clarinet.test({
    name: "Ensure that non-owner cannot mint tokens",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(1000), types.principal(wallet2.address)],
                wallet1.address
            )
        ]);
        
        block.receipts[0].result.expectErr().expectUint(100); // err-owner-only
    },
});

Clarinet.test({
    name: "Test token transfer functionality",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Mint tokens to wallet1
        let block = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(5000), types.principal(wallet1.address)],
                deployer.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Transfer from wallet1 to wallet2
        block = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'transfer',
                [
                    types.uint(2000),
                    types.principal(wallet1.address),
                    types.principal(wallet2.address),
                    types.none()
                ],
                wallet1.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Verify balances
        let balance1 = chain.callReadOnlyFn(
            'governance-token',
            'get-balance',
            [types.principal(wallet1.address)],
            deployer.address
        );
        balance1.result.expectOk().expectUint(3000);
        
        let balance2 = chain.callReadOnlyFn(
            'governance-token',
            'get-balance',
            [types.principal(wallet2.address)],
            deployer.address
        );
        balance2.result.expectOk().expectUint(2000);
    },
});

Clarinet.test({
    name: "Test vote delegation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Mint tokens to wallet1
        let block = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(5000), types.principal(wallet1.address)],
                deployer.address
            )
        ]);
        
        // Delegate votes from wallet1 to wallet2
        block = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'delegate-votes',
                [types.principal(wallet2.address)],
                wallet1.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Check delegation
        let delegate = chain.callReadOnlyFn(
            'governance-token',
            'get-delegate',
            [types.principal(wallet1.address)],
            deployer.address
        );
        delegate.result.expectOk().expectSome().expectPrincipal(wallet2.address);
    },
});

Clarinet.test({
    name: "Test vote delegation revocation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Mint tokens and delegate
        let block = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(5000), types.principal(wallet1.address)],
                deployer.address
            ),
            Tx.contractCall(
                'governance-token',
                'delegate-votes',
                [types.principal(wallet2.address)],
                wallet1.address
            )
        ]);
        
        // Revoke delegation
        block = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'revoke-delegation',
                [],
                wallet1.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Check delegation is removed
        let delegate = chain.callReadOnlyFn(
            'governance-token',
            'get-delegate',
            [types.principal(wallet1.address)],
            deployer.address
        );
        delegate.result.expectOk().expectNone();
    },
});

Clarinet.test({
    name: "Test SIP-010 read-only functions",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Get name
        let name = chain.callReadOnlyFn(
            'governance-token',
            'get-name',
            [],
            deployer.address
        );
        name.result.expectOk().expectAscii("DAO Governance Token");
        
        // Get symbol
        let symbol = chain.callReadOnlyFn(
            'governance-token',
            'get-symbol',
            [],
            deployer.address
        );
        symbol.result.expectOk().expectAscii("DAOG");
        
        // Get decimals
        let decimals = chain.callReadOnlyFn(
            'governance-token',
            'get-decimals',
            [],
            deployer.address
        );
        decimals.result.expectOk().expectUint(6);
        
        // Get total supply
        let totalSupply = chain.callReadOnlyFn(
            'governance-token',
            'get-total-supply',
            [],
            deployer.address
        );
        totalSupply.result.expectOk().expectUint(1000000000000);
    },
});
