#!/bin/bash

# Mainnet Deployment Verification Script
# This script verifies that the deployed contracts are working correctly on mainnet

DEPLOYER_ADDRESS="SPVQ61FEWR6M4HVAT3BNE07D4BNW6A1C2ACCNQ6F"
MAINNET_API="https://api.hiro.so"

echo "=================================="
echo "DAO Governance Platform - Mainnet Deployment Verification"
echo "=================================="
echo ""

# Function to check contract deployment
check_contract() {
    local contract_name=$1
    echo "Checking $contract_name..."
    
    response=$(curl -s "${MAINNET_API}/v2/contracts/interface/${DEPLOYER_ADDRESS}/${contract_name}")
    
    if echo "$response" | grep -q "functions"; then
        echo "✅ $contract_name is deployed and accessible"
        return 0
    else
        echo "❌ $contract_name not found or not accessible"
        echo "Response: $response"
        return 1
    fi
}

# Function to get contract source
get_contract_source() {
    local contract_name=$1
    echo ""
    echo "Fetching $contract_name source..."
    curl -s "${MAINNET_API}/v2/contracts/source/${DEPLOYER_ADDRESS}/${contract_name}" | jq -r '.source' | head -20
    echo "..."
}

# Function to call read-only function
call_readonly() {
    local contract=$1
    local function=$2
    local args=$3
    
    echo ""
    echo "Testing read-only function: $contract.$function"
    
    curl -s -X POST "${MAINNET_API}/v2/contracts/call-read/${DEPLOYER_ADDRESS}/${contract}/${function}" \
        -H "Content-Type: application/json" \
        -d "{
            \"sender\": \"${DEPLOYER_ADDRESS}\",
            \"arguments\": [${args}]
        }" | jq '.'
}

echo "Step 1: Checking Contract Deployments"
echo "--------------------------------------"
check_contract "governance-token"
check_contract "proposal-system"
check_contract "treasury"

echo ""
echo "Step 2: Testing Governance Token Functions"
echo "-------------------------------------------"
call_readonly "governance-token" "get-name" ""
call_readonly "governance-token" "get-symbol" ""
call_readonly "governance-token" "get-decimals" ""
call_readonly "governance-token" "get-total-supply" ""
call_readonly "governance-token" "get-balance" "\"${DEPLOYER_ADDRESS}\""

echo ""
echo "Step 3: Testing Proposal System Functions"
echo "------------------------------------------"
call_readonly "proposal-system" "get-proposal-count" ""

echo ""
echo "Step 4: Testing Treasury Functions"
echo "-----------------------------------"
call_readonly "treasury" "get-balance" ""
call_readonly "treasury" "get-treasury-stats" ""

echo ""
echo "=================================="
echo "Verification Complete!"
echo "=================================="
echo ""
echo "Next Steps:"
echo "1. Verify contract addresses on Stacks Explorer:"
echo "   https://explorer.hiro.so/address/${DEPLOYER_ADDRESS}?chain=mainnet"
echo ""
echo "2. Test governance token minting (contract owner only)"
echo "3. Create a test proposal"
echo "4. Test voting functionality"
echo "5. Test treasury deposits"
echo ""
