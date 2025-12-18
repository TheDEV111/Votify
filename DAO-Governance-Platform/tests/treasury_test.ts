import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Test deposit funds to treasury",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(100000)],
                wallet1.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Check treasury balance
        let balance = chain.callReadOnlyFn(
            'treasury',
            'get-balance',
            [],
            wallet1.address
        );
        
        assertEquals(balance.result, '100000');
        
        // Check total deposited
        let totalDeposited = chain.callReadOnlyFn(
            'treasury',
            'get-total-deposited',
            [],
            wallet1.address
        );
        totalDeposited.result.expectOk().expectUint(100000);
    },
});

Clarinet.test({
    name: "Test multiple deposits accumulate correctly",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(50000)],
                wallet1.address
            ),
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(75000)],
                wallet2.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        
        // Check total deposited
        let totalDeposited = chain.callReadOnlyFn(
            'treasury',
            'get-total-deposited',
            [],
            wallet1.address
        );
        totalDeposited.result.expectOk().expectUint(125000);
    },
});

Clarinet.test({
    name: "Test withdrawal requires authorization",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Deposit funds first
        let depositBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(100000)],
                wallet1.address
            )
        ]);
        
        // Try to withdraw without authorization
        let withdrawBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'withdraw-funds',
                [
                    types.uint(50000),
                    types.principal(wallet2.address),
                    types.uint(1),
                    types.utf8("Unauthorized withdrawal attempt")
                ],
                wallet1.address
            )
        ]);
        
        withdrawBlock.receipts[0].result.expectErr().expectUint(301); // err-not-authorized
    },
});

Clarinet.test({
    name: "Test authorized withdrawal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Deposit funds
        let depositBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(200000)],
                wallet1.address
            )
        ]);
        
        // Authorize proposal (simulating governance approval)
        let authorizeBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'authorize-proposal',
                [types.uint(1)],
                deployer.address
            )
        ]);
        
        // Now withdraw with authorization
        let withdrawBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'withdraw-funds',
                [
                    types.uint(50000),
                    types.principal(wallet2.address),
                    types.uint(1),
                    types.utf8("Development funding")
                ],
                wallet1.address
            )
        ]);
        
        withdrawBlock.receipts[0].result.expectOk();
        
        // Check spending history
        let spendingHistory = chain.callReadOnlyFn(
            'treasury',
            'get-spending-history',
            [types.uint(1)],
            wallet1.address
        );
        spendingHistory.result.expectOk().expectSome();
    },
});

Clarinet.test({
    name: "Test cannot withdraw more than balance",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Deposit small amount
        let depositBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(10000)],
                wallet1.address
            )
        ]);
        
        // Authorize proposal
        let authorizeBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'authorize-proposal',
                [types.uint(1)],
                deployer.address
            )
        ]);
        
        // Try to withdraw more than available
        let withdrawBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'withdraw-funds',
                [
                    types.uint(50000),
                    types.principal(wallet2.address),
                    types.uint(1),
                    types.utf8("Excessive withdrawal attempt")
                ],
                wallet1.address
            )
        ]);
        
        withdrawBlock.receipts[0].result.expectErr().expectUint(302); // err-insufficient-balance
    },
});

Clarinet.test({
    name: "Test emergency withdrawal by owner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Deposit funds
        let depositBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(100000)],
                wallet1.address
            )
        ]);
        
        // Emergency withdrawal by owner
        let emergencyBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'emergency-withdraw',
                [types.uint(30000), types.principal(deployer.address)],
                deployer.address
            )
        ]);
        
        emergencyBlock.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Test non-owner cannot do emergency withdrawal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Deposit funds
        let depositBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(100000)],
                wallet1.address
            )
        ]);
        
        // Try emergency withdrawal as non-owner
        let emergencyBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'emergency-withdraw',
                [types.uint(30000), types.principal(wallet2.address)],
                wallet1.address
            )
        ]);
        
        emergencyBlock.receipts[0].result.expectErr().expectUint(300); // err-owner-only
    },
});

Clarinet.test({
    name: "Test treasury statistics",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Multiple deposits
        let depositBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(100000)],
                wallet1.address
            ),
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(50000)],
                wallet2.address
            )
        ]);
        
        // Authorize and withdraw
        let authorizeBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'authorize-proposal',
                [types.uint(1)],
                deployer.address
            )
        ]);
        
        let withdrawBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'withdraw-funds',
                [
                    types.uint(30000),
                    types.principal(wallet2.address),
                    types.uint(1),
                    types.utf8("Project funding")
                ],
                wallet1.address
            )
        ]);
        
        // Check treasury stats
        let stats = chain.callReadOnlyFn(
            'treasury',
            'get-treasury-stats',
            [],
            wallet1.address
        );
        
        const statsData = stats.result.expectOk().expectTuple();
    },
});

Clarinet.test({
    name: "Test spending count increments",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Deposit funds
        let depositBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(200000)],
                wallet1.address
            )
        ]);
        
        // Authorize multiple proposals
        let authorizeBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'authorize-proposal',
                [types.uint(1)],
                deployer.address
            ),
            Tx.contractCall(
                'treasury',
                'authorize-proposal',
                [types.uint(2)],
                deployer.address
            )
        ]);
        
        // Multiple withdrawals
        let withdrawBlock = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'withdraw-funds',
                [
                    types.uint(30000),
                    types.principal(wallet2.address),
                    types.uint(1),
                    types.utf8("First withdrawal")
                ],
                wallet1.address
            ),
            Tx.contractCall(
                'treasury',
                'withdraw-funds',
                [
                    types.uint(20000),
                    types.principal(wallet2.address),
                    types.uint(2),
                    types.utf8("Second withdrawal")
                ],
                wallet1.address
            )
        ]);
        
        // Check spending count
        let count = chain.callReadOnlyFn(
            'treasury',
            'get-spending-count',
            [],
            wallet1.address
        );
        count.result.expectOk().expectUint(2);
    },
});

Clarinet.test({
    name: "Test deposit with zero amount fails",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'treasury',
                'deposit-funds',
                [types.uint(0)],
                wallet1.address
            )
        ]);
        
        block.receipts[0].result.expectErr().expectUint(303); // err-invalid-amount
    },
});
