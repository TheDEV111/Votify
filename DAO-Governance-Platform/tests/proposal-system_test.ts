import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Test proposal creation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'create-proposal',
                [
                    types.ascii("Increase treasury allocation"),
                    types.utf8("This proposal aims to increase the treasury allocation for development"),
                    types.uint(144), // execution delay
                    types.none(), // target contract
                    types.none() // target function
                ],
                wallet1.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectUint(1);
        
        // Verify proposal was created
        let proposal = chain.callReadOnlyFn(
            'proposal-system',
            'get-proposal',
            [types.uint(1)],
            wallet1.address
        );
        
        const proposalData = proposal.result.expectOk().expectSome();
    },
});

Clarinet.test({
    name: "Test voting on proposal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        // Mint tokens to voters
        let setupBlock = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(100000), types.principal(wallet1.address)],
                deployer.address
            ),
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(50000), types.principal(wallet2.address)],
                deployer.address
            )
        ]);
        
        // Create proposal
        let block = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'create-proposal',
                [
                    types.ascii("Test Proposal"),
                    types.utf8("This is a test proposal"),
                    types.uint(144),
                    types.none(),
                    types.none()
                ],
                wallet1.address
            )
        ]);
        
        const proposalId = block.receipts[0].result.expectOk();
        
        // Vote on proposal
        block = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'vote',
                [types.uint(1), types.bool(true), types.uint(100000)],
                wallet1.address
            ),
            Tx.contractCall(
                'proposal-system',
                'vote',
                [types.uint(1), types.bool(false), types.uint(50000)],
                wallet2.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        block.receipts[1].result.expectOk().expectBool(true);
        
        // Check voting results
        let results = chain.callReadOnlyFn(
            'proposal-system',
            'get-voting-results',
            [types.uint(1)],
            wallet1.address
        );
        
        const resultsData = results.result.expectOk().expectTuple();
    },
});

Clarinet.test({
    name: "Ensure users cannot vote twice",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Setup
        let setupBlock = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(100000), types.principal(wallet1.address)],
                deployer.address
            ),
            Tx.contractCall(
                'proposal-system',
                'create-proposal',
                [
                    types.ascii("Test Proposal"),
                    types.utf8("This is a test proposal"),
                    types.uint(144),
                    types.none(),
                    types.none()
                ],
                wallet1.address
            )
        ]);
        
        // First vote
        let block = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'vote',
                [types.uint(1), types.bool(true), types.uint(50000)],
                wallet1.address
            )
        ]);
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Second vote attempt
        block = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'vote',
                [types.uint(1), types.bool(false), types.uint(50000)],
                wallet1.address
            )
        ]);
        block.receipts[0].result.expectErr().expectUint(202); // err-already-voted
    },
});

Clarinet.test({
    name: "Test proposal finalization",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Setup and create proposal
        let setupBlock = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(200000000), types.principal(wallet1.address)],
                deployer.address
            ),
            Tx.contractCall(
                'proposal-system',
                'create-proposal',
                [
                    types.ascii("Test Proposal"),
                    types.utf8("This is a test proposal"),
                    types.uint(10),
                    types.none(),
                    types.none()
                ],
                wallet1.address
            )
        ]);
        
        // Vote
        let voteBlock = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'vote',
                [types.uint(1), types.bool(true), types.uint(200000000)],
                wallet1.address
            )
        ]);
        
        // Mine blocks to pass voting period (1008 blocks)
        chain.mineEmptyBlockUntil(chain.blockHeight + 1010);
        
        // Finalize proposal
        let finalizeBlock = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'finalize-proposal',
                [types.uint(1)],
                wallet1.address
            )
        ]);
        
        finalizeBlock.receipts[0].result.expectOk().expectUint(2); // status-passed
    },
});

Clarinet.test({
    name: "Test proposal execution",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Setup, create, vote, and finalize proposal
        let setupBlock = chain.mineBlock([
            Tx.contractCall(
                'governance-token',
                'mint',
                [types.uint(200000000), types.principal(wallet1.address)],
                deployer.address
            ),
            Tx.contractCall(
                'proposal-system',
                'create-proposal',
                [
                    types.ascii("Test Proposal"),
                    types.utf8("This is a test proposal"),
                    types.uint(10),
                    types.none(),
                    types.none()
                ],
                wallet1.address
            )
        ]);
        
        let voteBlock = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'vote',
                [types.uint(1), types.bool(true), types.uint(200000000)],
                wallet1.address
            )
        ]);
        
        // Mine blocks to pass voting period
        chain.mineEmptyBlockUntil(chain.blockHeight + 1010);
        
        let finalizeBlock = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'finalize-proposal',
                [types.uint(1)],
                wallet1.address
            )
        ]);
        
        // Mine blocks to pass execution delay
        chain.mineEmptyBlockUntil(chain.blockHeight + 15);
        
        // Execute proposal
        let executeBlock = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'execute-proposal',
                [types.uint(1)],
                wallet1.address
            )
        ]);
        
        executeBlock.receipts[0].result.expectOk().expectBool(true);
    },
});

Clarinet.test({
    name: "Test proposal cancellation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const wallet1 = accounts.get('wallet_1')!;
        
        // Create proposal
        let block = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'create-proposal',
                [
                    types.ascii("Test Proposal"),
                    types.utf8("This proposal will be cancelled"),
                    types.uint(144),
                    types.none(),
                    types.none()
                ],
                wallet1.address
            )
        ]);
        
        // Cancel proposal by proposer
        block = chain.mineBlock([
            Tx.contractCall(
                'proposal-system',
                'cancel-proposal',
                [types.uint(1)],
                wallet1.address
            )
        ]);
        
        block.receipts[0].result.expectOk().expectBool(true);
        
        // Verify status is cancelled
        let status = chain.callReadOnlyFn(
            'proposal-system',
            'get-proposal-status',
            [types.uint(1)],
            wallet1.address
        );
        status.result.expectOk().expectUint(5); // status-cancelled
    },
});
