import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rpcUrl = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
  const chainId = parseInt(process.env.MONAD_CHAIN_ID || "10143", 10);
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY is required in environment to deploy to Monad Testnet.");
    console.error("Usage: DEPLOYER_PRIVATE_KEY=0x... node scripts/deploy.js");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const deployerAddress = await wallet.getAddress();
  const balanceWei = await provider.getBalance(deployerAddress);
  const balanceMon = ethers.formatEther(balanceWei);

  console.log("==================================================================");
  console.log("ECON Protocol - Monad Testnet Deployment");
  console.log("==================================================================");
  console.log(`Deployer Wallet:    ${deployerAddress}`);
  console.log(`MON Balance:        ${balanceMon} MON`);
  console.log(`RPC URL:            ${rpcUrl}`);
  console.log(`Chain ID:           ${chainId}`);
  console.log("------------------------------------------------------------------");

  if (balanceWei === 0n) {
    console.error("ERROR: Deployer wallet has 0 MON. Please fund your wallet on Monad Testnet faucet first.");
    process.exit(1);
  }

  const artifactsDir = path.resolve(__dirname, "../src/contracts/artifacts");
  function loadArtifact(name) {
    const filePath = path.join(artifactsDir, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Artifact ${name} not found. Run "node scripts/compile.js" first.`);
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  const identityArtifact = loadArtifact("ECONIdentityRegistry");
  const objectArtifact = loadArtifact("ECONEconomicObject");
  const escrowArtifact = loadArtifact("ECONEscrow");
  const marketplaceArtifact = loadArtifact("ECONMarketplace");
  const vaultArtifact = loadArtifact("ECONCreditVault");

  const deployedRecords = {};

  // 1. Deploy ECONIdentityRegistry
  console.log("\n[1/5] Deploying ECONIdentityRegistry...");
  const IdentityFactory = new ethers.ContractFactory(identityArtifact.abi, identityArtifact.bytecode, wallet);
  const identityContract = await IdentityFactory.deploy();
  await identityContract.waitForDeployment();
  const identityAddr = await identityContract.getAddress();
  const identityReceipt = await identityContract.deploymentTransaction().wait();
  console.log(`✓ ECONIdentityRegistry deployed at: ${identityAddr}`);
  console.log(`  Tx: ${identityReceipt.hash}, Block: ${identityReceipt.blockNumber}`);
  deployedRecords.ECONIdentityRegistry = {
    address: identityAddr,
    txHash: identityReceipt.hash,
    blockNumber: identityReceipt.blockNumber,
    constructorArgs: []
  };

  // 2. Deploy ECONEconomicObject
  console.log("\n[2/5] Deploying ECONEconomicObject...");
  const ObjectFactory = new ethers.ContractFactory(objectArtifact.abi, objectArtifact.bytecode, wallet);
  const objectContract = await ObjectFactory.deploy();
  await objectContract.waitForDeployment();
  const objectAddr = await objectContract.getAddress();
  const objectReceipt = await objectContract.deploymentTransaction().wait();
  console.log(`✓ ECONEconomicObject deployed at: ${objectAddr}`);
  console.log(`  Tx: ${objectReceipt.hash}, Block: ${objectReceipt.blockNumber}`);
  deployedRecords.ECONEconomicObject = {
    address: objectAddr,
    txHash: objectReceipt.hash,
    blockNumber: objectReceipt.blockNumber,
    constructorArgs: []
  };

  // 3. Deploy ECONEscrow (with ECONEconomicObject address)
  console.log("\n[3/5] Deploying ECONEscrow...");
  const EscrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
  const escrowContract = await EscrowFactory.deploy(objectAddr);
  await escrowContract.waitForDeployment();
  const escrowAddr = await escrowContract.getAddress();
  const escrowReceipt = await escrowContract.deploymentTransaction().wait();
  console.log(`✓ ECONEscrow deployed at: ${escrowAddr}`);
  console.log(`  Tx: ${escrowReceipt.hash}, Block: ${escrowReceipt.blockNumber}`);
  deployedRecords.ECONEscrow = {
    address: escrowAddr,
    txHash: escrowReceipt.hash,
    blockNumber: escrowReceipt.blockNumber,
    constructorArgs: [objectAddr]
  };

  // 4. Deploy ECONMarketplace (with ECONEconomicObject address and feeRecipient = deployer)
  console.log("\n[4/5] Deploying ECONMarketplace...");
  const MarketplaceFactory = new ethers.ContractFactory(marketplaceArtifact.abi, marketplaceArtifact.bytecode, wallet);
  const marketplaceContract = await MarketplaceFactory.deploy(objectAddr, deployerAddress);
  await marketplaceContract.waitForDeployment();
  const marketplaceAddr = await marketplaceContract.getAddress();
  const marketplaceReceipt = await marketplaceContract.deploymentTransaction().wait();
  console.log(`✓ ECONMarketplace deployed at: ${marketplaceAddr}`);
  console.log(`  Tx: ${marketplaceReceipt.hash}, Block: ${marketplaceReceipt.blockNumber}`);
  deployedRecords.ECONMarketplace = {
    address: marketplaceAddr,
    txHash: marketplaceReceipt.hash,
    blockNumber: marketplaceReceipt.blockNumber,
    constructorArgs: [objectAddr, deployerAddress]
  };

  // 5. Deploy ECONCreditVault
  console.log("\n[5/5] Deploying ECONCreditVault...");
  const VaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, wallet);
  const vaultContract = await VaultFactory.deploy();
  await vaultContract.waitForDeployment();
  const vaultAddr = await vaultContract.getAddress();
  const vaultReceipt = await vaultContract.deploymentTransaction().wait();
  console.log(`✓ ECONCreditVault deployed at: ${vaultAddr}`);
  console.log(`  Tx: ${vaultReceipt.hash}, Block: ${vaultReceipt.blockNumber}`);
  deployedRecords.ECONCreditVault = {
    address: vaultAddr,
    txHash: vaultReceipt.hash,
    blockNumber: vaultReceipt.blockNumber,
    constructorArgs: []
  };

  // Save deployment artifact
  const deployedPath = path.resolve(__dirname, "../src/contracts/deployed.json");
  const fullDeployment = {
    network: "monadTestnet",
    chainId,
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    contracts: deployedRecords
  };
  fs.writeFileSync(deployedPath, JSON.stringify(fullDeployment, null, 2));
  console.log(`\n✓ Saved deployment manifest to ${deployedPath}`);

  // Save addresses.ts for frontend & SDK consumption
  const addressesTsPath = path.resolve(__dirname, "../src/contracts/addresses.ts");
  const addressesTs = `// Auto-generated after Monad Testnet deployment
export const MONAD_TESTNET_ADDRESSES = {
  identityRegistry: '${identityAddr}' as const,
  economicObject: '${objectAddr}' as const,
  escrow: '${escrowAddr}' as const,
  marketplace: '${marketplaceAddr}' as const,
  creditVault: '${vaultAddr}' as const,
};

export const MONAD_EXPLORER_BASE = 'https://testnet.monadexplorer.com';
`;
  fs.writeFileSync(addressesTsPath, addressesTs);
  console.log(`✓ Updated contract addresses in ${addressesTsPath}`);

  console.log("\n==================================================================");
  console.log("MONAD TESTNET EXPLORER VERIFICATION LINKS");
  console.log("==================================================================");
  for (const [name, info] of Object.entries(deployedRecords)) {
    console.log(`${name}:`);
    console.log(`  Address:  https://testnet.monadexplorer.com/address/${info.address}`);
    console.log(`  Tx Hash:  https://testnet.monadexplorer.com/tx/${info.txHash}`);
  }
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
