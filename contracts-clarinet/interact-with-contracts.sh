#!/bin/bash
# Interactive script to verify and interact with deployed DAO contracts

CONTRACT_ADDR="SPVQ61FEWR6M4HVAT3BNE07D4BNW6A1C2ACCNQ6F"
API_BASE="https://api.mainnet.hiro.so"

echo "🎯 DAO Governance Platform - Contract Interaction Tool"
echo "========================================================"
echo ""
echo "Contract Address: $CONTRACT_ADDR"
echo ""

# Function to check contract status
check_contract() {
    local contract_name=$1
    echo "Checking $contract_name..."
    
    response=$(curl -s "${API_BASE}/v2/contracts/interface/${CONTRACT_ADDR}/${contract_name}")
    
    if echo "$response" | grep -q "functions"; then
        echo "✅ $contract_name is DEPLOYED"
        return 0
    else
        echo "❌ $contract_name is NOT DEPLOYED"
        return 1
    fi
}

# Function to get contract source
get_source() {
    local contract_name=$1
    echo ""
    echo "📄 Fetching source code for $contract_name..."
    curl -s "${API_BASE}/v2/contracts/source/${CONTRACT_ADDR}/${contract_name}" | jq '.'
}

# Function to call read-only function
call_readonly() {
    local contract_name=$1
    local function_name=$2
    
    echo ""
    echo "📞 Calling ${contract_name}.${function_name}..."
    
    curl -s -X POST "${API_BASE}/v2/contracts/call-read/${CONTRACT_ADDR}/${contract_name}/${function_name}" \
        -H "Content-Type: application/json" \
        -d "{\"sender\":\"${CONTRACT_ADDR}\",\"arguments\":[]}" | jq '.'
}

# Main verification
echo "1️⃣  Verifying Contract Deployments"
echo "-----------------------------------"

check_contract "governance-token"
check_contract "proposal-system"
check_contract "treasury"

echo ""
echo "2️⃣  Testing Read-Only Functions"
echo "--------------------------------"

echo ""
echo "🪙 Governance Token Functions:"
call_readonly "governance-token" "get-name"
call_readonly "governance-token" "get-symbol"
call_readonly "governance-token" "get-total-supply"
call_readonly "governance-token" "get-decimals"

echo ""
echo "📋 Proposal System Functions:"
call_readonly "proposal-system" "get-proposal-count"

echo ""
echo "💰 Treasury Functions:"
call_readonly "treasury" "get-balance"
call_readonly "treasury" "get-treasury-stats"
call_readonly "treasury" "get-total-deposited"
call_readonly "treasury" "get-spending-count"

echo ""
echo "3️⃣  Useful Commands"
echo "-------------------"
echo ""
echo "View contracts in Explorer:"
echo "  https://explorer.hiro.so/address/${CONTRACT_ADDR}?chain=mainnet"
echo ""
echo "View individual contracts:"
echo "  governance-token: https://explorer.hiro.so/txid/${CONTRACT_ADDR}.governance-token?chain=mainnet"
echo "  proposal-system:  https://explorer.hiro.so/txid/${CONTRACT_ADDR}.proposal-system?chain=mainnet"
echo "  treasury:         https://explorer.hiro.so/txid/${CONTRACT_ADDR}.treasury?chain=mainnet"
echo ""
echo "Use Clarinet console to interact:"
echo "  clarinet console --mainnet"
echo ""
echo "✨ Done!"
