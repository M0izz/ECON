import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const deployedPath = path.resolve(__dirname, "../src/contracts/deployed.json");
  if (!fs.existsSync(deployedPath)) {
    console.error("ERROR: src/contracts/deployed.json not found. Run scripts/deploy.js first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  console.log("==================================================================");
  console.log("ECON Protocol - Monad Explorer Contract Verification");
  console.log("==================================================================");
  console.log(`Network:   ${deployment.network} (Chain ID: ${deployment.chainId})`);
  console.log(`Deployer:  ${deployment.deployer}`);
  console.log("------------------------------------------------------------------");

  const explorerApiUrl = "https://testnet.monadexplorer.com/api";
  const apiKey = process.env.MONAD_EXPLORER_API_KEY || "none";

  for (const [name, contractData] of Object.entries(deployment.contracts)) {
    console.log(`\nVerifying ${name} at ${contractData.address}...`);

    const sourceFile = `${name}.sol`;
    const sourcePath = path.resolve(__dirname, `../contracts/${sourceFile}`);
    const sourceCode = fs.readFileSync(sourcePath, "utf8");

    const standardInput = {
      language: "Solidity",
      sources: {
        [sourceFile]: {
          content: sourceCode
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    const verifyPayload = new URLSearchParams({
      module: "contract",
      action: "verifysourcecode",
      contractaddress: contractData.address,
      sourceCode: JSON.stringify(standardInput),
      codeformat: "solidity-standard-json-input",
      contractname: `${sourceFile}:${name}`,
      compilerversion: "v0.8.20+commit.a1b79de6",
      optimizationUsed: "1",
      runs: "200",
      apikey: apiKey
    });

    try {
      const response = await fetch(explorerApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyPayload.toString()
      });

      const result = await response.json();
      console.log(`Response for ${name}:`, result);

      console.log(`Explorer Link: https://testnet.monadexplorer.com/address/${contractData.address}#code`);
    } catch (err) {
      console.warn(`Could not automatically submit verification for ${name}:`, err.message);
      console.log(`Manual verification link: https://testnet.monadexplorer.com/address/${contractData.address}#code`);
    }
  }

  console.log("\n==================================================================");
  console.log("Contract verification requests dispatched to Monad Explorer.");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
