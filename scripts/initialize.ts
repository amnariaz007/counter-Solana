import anchor from "@project-serum/anchor";
import { SystemProgram, Connection, PublicKey, Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import idl from "../target/idl/counter.json" with { type: "json" };

const main = async () => {
  const PROGRAM_ID = new PublicKey("6XE9zPNoqsu2ngVQAy6xdTpogLAuXHoya8NwR2d1Qa8r");
 
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  try {
    const blockhash = await connection.getLatestBlockhash();
    console.log("Latest blockhash:", blockhash);
  } catch (e) {
    console.error("Failed to get blockhash:", e);
  }


  // Load the secret key from your anchor wallet file and create a Keypair
  const secretKey = Uint8Array.from(
    JSON.parse(readFileSync(process.env.ANCHOR_WALLET!, "utf-8"))
  );
  const keypair = Keypair.fromSecretKey(secretKey);

  // Create wallet from the keypair
  const wallet = new anchor.Wallet(keypair);

  // Create provider using this wallet
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  // Derive the counter PDA
  const [counterPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    program.programId
  );

  console.log("Counter PDA:", counterPDA.toBase58());

  try {
    const existing = await program.account.counter.fetch(counterPDA);
    console.log("❗ Counter already initialized:", existing);
    return;
  } catch {
    console.log("✅ Initializing counter...");
  }

 await program.methods
  .initialize()
  .accounts({
    counter: counterPDA,
    authority: wallet.publicKey,
    system_program: SystemProgram.programId,
  })
  .signers([wallet.payer])
  .rpc();


  console.log("✅ Counter initialized");
};

main().catch((err) => {
  console.error("❌ Error initializing counter:", err);
});
