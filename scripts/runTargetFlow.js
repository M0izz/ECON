import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadArtifact(name) {
  const filePath = path.resolve(__dirname, `../src/contracts/artifacts/${name}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Artifact ${name} not found. Run "node scripts/compile.js" first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export async function runProtocolLifecycle({
  provider,
  deployerSigner,
  buyerSigner,
  sellerSigner,
  addresses
}) {
  console.log("==================================================================");
  console.log("ECON PROTOCOL — MONAD TARGET LIFECYCLE EXECUTION");
  console.log("==================================================================");
  console.log(`Deployer / Admin:  ${await deployerSigner.getAddress()}`);
  console.log(`Seller Agent:      ${await sellerSigner.getAddress()}`);
  console.log(`Buyer Agent:       ${await buyerSigner.getAddress()}`);
  console.log("------------------------------------------------------------------");

  const identityArtifact = loadArtifact("ECONIdentityRegistry");
  const objectArtifact = loadArtifact("ECONEconomicObject");
  const escrowArtifact = loadArtifact("ECONEscrow");
  const marketplaceArtifact = loadArtifact("ECONMarketplace");
  const vaultArtifact = loadArtifact("ECONCreditVault");

  const identityContract = new ethers.Contract(addresses.identityRegistry, identityArtifact.abi, sellerSigner);
  const objectContractSeller = new ethers.Contract(addresses.economicObject, objectArtifact.abi, sellerSigner);
  const objectContractBuyer = new ethers.Contract(addresses.economicObject, objectArtifact.abi, buyerSigner);
  const marketplaceContractSeller = new ethers.Contract(addresses.marketplace, marketplaceArtifact.abi, sellerSigner);
  const marketplaceContractBuyer = new ethers.Contract(addresses.marketplace, marketplaceArtifact.abi, buyerSigner);
  const escrowContractBuyer = new ethers.Contract(addresses.escrow, escrowArtifact.abi, buyerSigner);
  const escrowContractSeller = new ethers.Contract(addresses.escrow, escrowArtifact.abi, sellerSigner);
  const vaultContract = new ethers.Contract(addresses.creditVault, vaultArtifact.abi, buyerSigner);

  const timestamp = Date.now();
  const agentId = ethers.keccak256(ethers.toUtf8Bytes(`agent-seller-${timestamp}`));
  const objectId = ethers.keccak256(ethers.toUtf8Bytes(`obj-gpu-cluster-${timestamp}`));
  const listingId = ethers.keccak256(ethers.toUtf8Bytes(`listing-${timestamp}`));
  const escrowId = ethers.keccak256(ethers.toUtf8Bytes(`escrow-${timestamp}`));
  const reservationId = ethers.keccak256(ethers.toUtf8Bytes(`reservation-${timestamp}`));

  const executionLog = [];

  // -------------------------------------------------------------------------
  // STEP 1: CREATE IDENTITY
  // -------------------------------------------------------------------------
  console.log("\n[1/8] CREATE IDENTITY on ECONIdentityRegistry...");
  const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("ipfs://bafkreihdagentmetadata"));
  const agentURI = "https://econ.network/agents/agent-seller-1";
  
  const regTx = await identityContract.registerAgentWithURI(agentId, metadataHash, agentURI);
  const regReceipt = await regTx.wait();
  console.log(`✓ Agent Registered! Tx: ${regReceipt.hash} (Block #${regReceipt.blockNumber})`);
  
  const identityRecord = await identityContract.getAgent(agentId);
  if (!identityRecord.active || identityRecord.controller !== await sellerSigner.getAddress()) {
    throw new Error("Identity registration assertion failed!");
  }
  executionLog.push({ step: "CREATE IDENTITY", txHash: regReceipt.hash, blockNumber: regReceipt.blockNumber, agentId });

  // -------------------------------------------------------------------------
  // STEP 2: CREATE OBJECT
  // -------------------------------------------------------------------------
  console.log("\n[2/8] CREATE OBJECT on ECONEconomicObject...");
  const objectType = 1; // GPU_COMPUTE_CREDIT
  const objectValueWei = ethers.parseEther("0.05"); // 0.05 MON
  const expiryTimestamp = Math.floor(Date.now() / 1000) + 86400; // 24 hours
  const transferable = true;
  const objectMeta = ethers.keccak256(ethers.toUtf8Bytes("H100-8x-Dedicated-Cluster"));

  const createObjTx = await objectContractSeller.createObject(
    objectId,
    objectType,
    objectValueWei,
    expiryTimestamp,
    transferable,
    objectMeta
  );
  const createObjReceipt = await createObjTx.wait();
  console.log(`✓ Economic Object Created! Tx: ${createObjReceipt.hash} (Block #${createObjReceipt.blockNumber})`);
  
  let objState = await objectContractSeller.objects(objectId);
  if (objState.owner !== await sellerSigner.getAddress()) {
    throw new Error("Economic object owner assertion failed!");
  }
  executionLog.push({ step: "CREATE OBJECT", txHash: createObjReceipt.hash, blockNumber: createObjReceipt.blockNumber, objectId });

  // -------------------------------------------------------------------------
  // STEP 3: LIST OBJECT
  // -------------------------------------------------------------------------
  console.log("\n[3/8] LIST OBJECT on ECONMarketplace...");
  // First approve marketplace to transfer the object
  const approveTx = await objectContractSeller.approve(addresses.marketplace, objectId);
  await approveTx.wait();

  const listPriceWei = ethers.parseEther("0.05");
  const listTx = await marketplaceContractSeller.listObject(listingId, objectId, listPriceWei);
  const listReceipt = await listTx.wait();
  console.log(`✓ Object Listed on Marketplace! Tx: ${listReceipt.hash} (Block #${listReceipt.blockNumber})`);
  
  const listing = await marketplaceContractSeller.getListing(listingId);
  if (!listing.active || listing.price !== listPriceWei) {
    throw new Error("Marketplace listing assertion failed!");
  }
  executionLog.push({ step: "LIST OBJECT", txHash: listReceipt.hash, blockNumber: listReceipt.blockNumber, listingId });

  // -------------------------------------------------------------------------
  // STEP 4: BUY OBJECT (Atomic Ownership Transfer + 1% Fee)
  // -------------------------------------------------------------------------
  console.log("\n[4/8] BUY OBJECT on ECONMarketplace (atomic payment & object transfer)...");
  const buyTx = await marketplaceContractBuyer.buyObject(listingId, { value: listPriceWei });
  const buyReceipt = await buyTx.wait();
  console.log(`✓ Object Purchased! Tx: ${buyReceipt.hash} (Block #${buyReceipt.blockNumber})`);
  
  objState = await objectContractBuyer.objects(objectId);
  const buyerAddress = await buyerSigner.getAddress();
  if (objState.owner !== buyerAddress) {
    throw new Error(`Marketplace purchase failed: owner is ${objState.owner}, expected ${buyerAddress}`);
  }
  console.log(`  Atomic ownership transferred: Object ${objectId.slice(0, 10)}... -> Buyer (${buyerAddress})`);
  executionLog.push({ step: "BUY OBJECT", txHash: buyReceipt.hash, blockNumber: buyReceipt.blockNumber });

  // -------------------------------------------------------------------------
  // STEP 5: ESCROW (Conditional Value Lock linked to delivery)
  // -------------------------------------------------------------------------
  console.log("\n[5/8] ESCROW conditional value lock on ECONEscrow...");
  const escrowAmountWei = ethers.parseEther("0.02");
  const conditionHash = ethers.keccak256(ethers.toUtf8Bytes("SLA-Inference-Delivery-99.9%"));
  const deadline = Math.floor(Date.now() / 1000) + 7200; // 2 hours

  // Buyer approves escrow contract to manage the object for delivery
  const approveEscrowTx = await objectContractBuyer.approve(addresses.escrow, objectId);
  await approveEscrowTx.wait();

  const lockTx = await escrowContractBuyer.lockObjectEscrow(
    escrowId,
    await sellerSigner.getAddress(),
    conditionHash,
    deadline,
    objectId,
    { value: escrowAmountWei }
  );
  const lockReceipt = await lockTx.wait();
  console.log(`✓ Escrow Locked! Tx: ${lockReceipt.hash} (Block #${lockReceipt.blockNumber})`);
  
  const escrowRecord = await escrowContractBuyer.getEscrow(escrowId);
  if (escrowRecord.amount !== escrowAmountWei || Number(escrowRecord.status) !== 0) { // 0 = LOCKED
    throw new Error("Escrow record assertion failed!");
  }
  executionLog.push({ step: "ESCROW", txHash: lockReceipt.hash, blockNumber: lockReceipt.blockNumber, escrowId });

  // -------------------------------------------------------------------------
  // STEP 6: DELIVERY (Seller submits cryptographic proof)
  // -------------------------------------------------------------------------
  console.log("\n[6/8] DELIVERY submission by seller on ECONEscrow...");
  const deliveryProof = ethers.keccak256(ethers.toUtf8Bytes(`DeliveryProof-ResultPayload-${timestamp}`));
  const deliveryTx = await escrowContractSeller.submitDelivery(escrowId, deliveryProof);
  const deliveryReceipt = await deliveryTx.wait();
  console.log(`✓ Delivery Submitted! Tx: ${deliveryReceipt.hash} (Block #${deliveryReceipt.blockNumber})`);
  
  const escrowAfterDelivery = await escrowContractSeller.getEscrow(escrowId);
  if (Number(escrowAfterDelivery.status) !== 1) { // 1 = DELIVERED
    throw new Error("Escrow delivered state assertion failed!");
  }
  executionLog.push({ step: "DELIVERY", txHash: deliveryReceipt.hash, blockNumber: deliveryReceipt.blockNumber });

  // -------------------------------------------------------------------------
  // STEP 7: RELEASE (Buyer verifies and releases payout to seller)
  // -------------------------------------------------------------------------
  console.log("\n[7/8] RELEASE escrow payout on ECONEscrow...");
  const releaseTx = await escrowContractBuyer.verifyAndRelease(escrowId);
  const releaseReceipt = await releaseTx.wait();
  console.log(`✓ Escrow Released to Seller! Tx: ${releaseReceipt.hash} (Block #${releaseReceipt.blockNumber})`);
  
  const escrowAfterRelease = await escrowContractBuyer.getEscrow(escrowId);
  if (Number(escrowAfterRelease.status) !== 3) { // 3 = RELEASED
    throw new Error("Escrow released state assertion failed!");
  }
  executionLog.push({ step: "RELEASE", txHash: releaseReceipt.hash, blockNumber: releaseReceipt.blockNumber });

  // -------------------------------------------------------------------------
  // STEP 8: TRANSFER OWNERSHIP (Secondary protocol transfer / claim)
  // -------------------------------------------------------------------------
  console.log("\n[8/8] TRANSFER OWNERSHIP on ECONEconomicObject...");
  const finalRecipient = ethers.Wallet.createRandom().address;
  const transferTx = await objectContractBuyer.transferObject(objectId, finalRecipient);
  const transferReceipt = await transferTx.wait();
  console.log(`✓ Final Ownership Transferred! Tx: ${transferReceipt.hash} (Block #${transferReceipt.blockNumber})`);
  
  objState = await objectContractBuyer.objects(objectId);
  if (objState.owner !== finalRecipient) {
    throw new Error("Final object ownership transfer assertion failed!");
  }
  console.log(`  Final Object Owner Verified: ${finalRecipient}`);
  executionLog.push({ step: "TRANSFER OWNERSHIP", txHash: transferReceipt.hash, blockNumber: transferReceipt.blockNumber, newOwner: finalRecipient });

  // -------------------------------------------------------------------------
  // BONUS: VERIFY CREDIT VAULT RESERVATION & SETTLEMENT
  // -------------------------------------------------------------------------
  console.log("\n[+ BONUS] ECONCreditVault reservation & settlement check...");
  const creditDepositTx = await vaultContract.deposit({ value: ethers.parseEther("0.01") });
  await creditDepositTx.wait();

  const reserveTx = await vaultContract.reserveCredits(
    reservationId,
    "123", // agentId matching backend
    ethers.parseEther("0.005"),
    Math.floor(Date.now() / 1000) + 3600
  );
  await reserveTx.wait();

  const reservation = await vaultContract.getReservation(reservationId);
  console.log(`✓ CreditVault Reservation verified: ${reservation.agentId} (${ethers.formatEther(reservation.amount)} MON)`);

  console.log("\n==================================================================");
  console.log("ALL 8 TARGET FLOW STEPS COMPLETED ON EVM SUCCESSFULLY!");
  console.log("==================================================================");
  for (const item of executionLog) {
    console.log(`  ✓ ${item.step.padEnd(20)} Tx: ${item.txHash} (Block #${item.blockNumber})`);
  }
  console.log("==================================================================");

  return executionLog;
}

// CLI runner
async function cli() {
  const rpcUrl = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
  const chainId = parseInt(process.env.MONAD_CHAIN_ID || "10143", 10);
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  const deployedPath = path.resolve(__dirname, "../src/contracts/deployed.json");
  if (!fs.existsSync(deployedPath)) {
    console.error("ERROR: deployed.json not found. Run scripts/deploy.js first, or run with local network.");
    process.exit(1);
  }

  const deployedData = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const addresses = {
    identityRegistry: deployedData.contracts.ECONIdentityRegistry.address,
    economicObject: deployedData.contracts.ECONEconomicObject.address,
    escrow: deployedData.contracts.ECONEscrow.address,
    marketplace: deployedData.contracts.ECONMarketplace.address,
    creditVault: deployedData.contracts.ECONCreditVault.address,
  };

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const deployer = new ethers.Wallet(privateKey, provider);
  const seller = deployer; // can be separate or same
  const buyer = ethers.Wallet.createRandom().connect(provider);

  // Fund buyer with some MON from deployer for testing
  console.log("Funding test buyer wallet...");
  const fundTx = await deployer.sendTransaction({
    to: await buyer.getAddress(),
    value: ethers.parseEther("0.1")
  });
  await fundTx.wait();

  await runProtocolLifecycle({
    provider,
    deployerSigner: deployer,
    buyerSigner: buyer,
    sellerSigner: seller,
    addresses
  });
}

if (process.argv[1] && process.argv[1].endsWith("runTargetFlow.js")) {
  cli().catch(console.error);
}
