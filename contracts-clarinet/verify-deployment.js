#!/usr/bin/env node
/**
 * Verify DAO Governance Platform Mainnet Deployment
 * This script checks if contracts are deployed and retrieves their info
 */

const CONTRACT_ADDRESS = 'SPVQ61FEWR6M4HVAT3BNE07D4BNW6A1C2ACCNQ6F';
const STACKS_API = 'https://api.mainnet.hiro.so';

const contracts = [
  'governance-token',
  'proposal-system',
  'treasury'
];

async function getContractInfo(contractName) {
  const url = `${STACKS_API}/v2/contracts/interface/${CONTRACT_ADDRESS}/${contractName}`;
  
  try {
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      return { deployed: true, data };
    } else if (response.status === 404) {
      return { deployed: false, error: 'Contract not found' };
    } else {
      return { deployed: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { deployed: false, error: error.message };
  }
}

async function getContractSource(contractName) {
  const url = `${STACKS_API}/v2/contracts/source/${CONTRACT_ADDRESS}/${contractName}`;
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    return null;
  }
}

async function callReadOnly(contractName, functionName, args = []) {
  const url = `${STACKS_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${contractName}/${functionName}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: CONTRACT_ADDRESS,
        arguments: args
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    return null;
  }
}

async function verifyContracts() {
  console.log('🔍 Verifying DAO Governance Platform Deployment on Mainnet\n');
  console.log(`Contract Address: ${CONTRACT_ADDRESS}\n`);
  console.log('=' .repeat(70));
  
  for (const contractName of contracts) {
    console.log(`\n📄 Contract: ${contractName}`);
    console.log('-'.repeat(70));
    
    const info = await getContractInfo(contractName);
    
    if (info.deployed) {
      console.log('✅ Status: DEPLOYED');
      
      // Get contract source
      const source = await getContractSource(contractName);
      if (source) {
        console.log(`📝 Source code length: ${source.source.length} characters`);
        console.log(`🔗 Publish height: ${source.publish_height || 'N/A'}`);
      }
      
      // Show available functions
      if (info.data.functions) {
        console.log(`\n🔧 Functions (${info.data.functions.length} total):`);
        
        const publicFuncs = info.data.functions.filter(f => f.access === 'public');
        const readOnlyFuncs = info.data.functions.filter(f => f.access === 'read_only');
        
        console.log(`   - Public: ${publicFuncs.length}`);
        console.log(`   - Read-only: ${readOnlyFuncs.length}`);
        
        // Test some read-only functions
        if (contractName === 'governance-token') {
          console.log('\n📊 Testing read-only functions:');
          
          const name = await callReadOnly(contractName, 'get-name');
          if (name?.okay) {
            console.log(`   ✓ Token Name: ${name.result}`);
          }
          
          const symbol = await callReadOnly(contractName, 'get-symbol');
          if (symbol?.okay) {
            console.log(`   ✓ Token Symbol: ${symbol.result}`);
          }
          
          const totalSupply = await callReadOnly(contractName, 'get-total-supply');
          if (totalSupply?.okay) {
            console.log(`   ✓ Total Supply: ${totalSupply.result}`);
          }
        }
        
        if (contractName === 'proposal-system') {
          console.log('\n📊 Testing read-only functions:');
          
          const count = await callReadOnly(contractName, 'get-proposal-count');
          if (count?.okay) {
            console.log(`   ✓ Proposal Count: ${count.result}`);
          }
        }
        
        if (contractName === 'treasury') {
          console.log('\n📊 Testing read-only functions:');
          
          const balance = await callReadOnly(contractName, 'get-balance');
          if (balance?.okay) {
            console.log(`   ✓ Treasury Balance: ${balance.result}`);
          }
          
          const stats = await callReadOnly(contractName, 'get-treasury-stats');
          if (stats?.okay) {
            console.log(`   ✓ Treasury Stats: ${stats.result}`);
          }
        }
      }
      
      // Explorer links
      console.log(`\n🔗 Explorer: https://explorer.hiro.so/txid/${CONTRACT_ADDRESS}.${contractName}?chain=mainnet`);
      
    } else {
      console.log(`❌ Status: NOT DEPLOYED (${info.error})`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Verification complete!\n');
  
  console.log('📌 Useful Links:');
  console.log(`   • Stacks Explorer: https://explorer.hiro.so/address/${CONTRACT_ADDRESS}?chain=mainnet`);
  console.log(`   • API Endpoint: ${STACKS_API}`);
  console.log(`   • Hiro Platform: https://platform.hiro.so/projects`);
}

// Run verification
verifyContracts().catch(console.error);
