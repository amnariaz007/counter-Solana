import { AnchorProvider, Program, Wallet } from "@project-serum/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
//import idl from "../target/idl/counter.json" assert { type: "json" };
import idl from "../target/idl/counter.json" with { type: "json" }; // Try this with modern Node

import { readFileSync } from "fs";

const PROGRAM_ID = new PublicKey("6XE9zPNoqsu2ngVQAy6xdTpogLAuXHoya8NwR2d1Qa8r");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const wallet = new Wallet(JSON.parse(readFileSync(process.env.ANCHOR_WALLET!, "utf-8")));
const provider = new AnchorProvider(connection, wallet, {});

const program = new Program(idl as any, PROGRAM_ID, provider);

const [counterPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("counter")],
  PROGRAM_ID
);

async function main() {
  const counter = await program.account.counter.fetch(counterPda);
  console.log("Counter state:", counter);
}

main().catch(console.error);
