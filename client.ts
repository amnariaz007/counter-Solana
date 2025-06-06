import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Counter } from "./target/types/counter";
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * Counter Client - Demonstrates how to interact with the Counter smart contract
 * This file shows the typical structure of a client.ts in Solana Playground
 */

// Configuration
const NETWORK = "devnet"; // or "mainnet-beta" for production
const connection = new Connection(
  NETWORK === "devnet" 
    ? "https://api.devnet.solana.com" 
    : "https://api.mainnet-beta.solana.com"
);

// Program ID (from your smart contract)
const PROGRAM_ID = new PublicKey("Ek9xYYpeP8wMvtepDrFRUxaz6MktuQPPuV9TCGK7b622");

export class CounterClient {
  private program: Program<Counter>;
  private provider: anchor.AnchorProvider;
  private authority: Keypair;
  private counterPDA: PublicKey;
  private counterBump: number;

  constructor(authority: Keypair) {
    this.authority = authority;
    
    // Create provider
    const wallet = new anchor.Wallet(authority);
    this.provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    
    // Set provider
    anchor.setProvider(this.provider);
    
    // Create program instance
    this.program = new Program(
      // You would need to provide the IDL here
      {} as any, // IDL would go here
      PROGRAM_ID,
      this.provider
    );

    // Calculate PDA
    [this.counterPDA, this.counterBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("counter")],
      PROGRAM_ID
    );
  }

  /**
   * Initialize the counter account
   */
  async initialize(): Promise<string> {
    try {
      console.log("Initializing counter...");
      console.log("Counter PDA:", this.counterPDA.toString());
      console.log("Authority:", this.authority.publicKey.toString());

      const tx = await this.program.methods
        .initialize()
        .accounts({
          counter: this.counterPDA,
          authority: this.authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([this.authority])
        .rpc();

      console.log("✅ Counter initialized successfully!");
      console.log("Transaction signature:", tx);
      return tx;
    } catch (error) {
      console.error("❌ Failed to initialize counter:", error);
      throw error;
    }
  }

  /**
   * Increment the counter
   */
  async increment(): Promise<string> {
    try {
      console.log("Incrementing counter...");

      const tx = await this.program.methods
        .increment()
        .accounts({
          counter: this.counterPDA,
          authority: this.authority.publicKey,
        })
        .signers([this.authority])
        .rpc();

      console.log("✅ Counter incremented successfully!");
      console.log("Transaction signature:", tx);
      
      // Show updated count
      const newCount = await this.getCount();
      console.log("New count:", newCount);
      
      return tx;
    } catch (error) {
      console.error("❌ Failed to increment counter:", error);
      throw error;
    }
  }

  /**
   * Decrement the counter
   */
  async decrement(): Promise<string> {
    try {
      console.log("Decrementing counter...");

      const tx = await this.program.methods
        .decrement()
        .accounts({
          counter: this.counterPDA,
          authority: this.authority.publicKey,
        })
        .signers([this.authority])
        .rpc();

      console.log("✅ Counter decremented successfully!");
      console.log("Transaction signature:", tx);
      
      // Show updated count
      const newCount = await this.getCount();
      console.log("New count:", newCount);
      
      return tx;
    } catch (error) {
      console.error("❌ Failed to decrement counter:", error);
      throw error;
    }
  }

  /**
   * Get current counter value
   */
  async getCount(): Promise<number> {
    try {
      const counterAccount = await this.program.account.counter.fetch(this.counterPDA);
      return counterAccount.count.toNumber();
    } catch (error) {
      console.error("❌ Failed to fetch counter:", error);
      throw error;
    }
  }

  /**
   * Get full counter account data
   */
  async getCounterAccount(): Promise<any> {
    try {
      const counterAccount = await this.program.account.counter.fetch(this.counterPDA);
      return {
        authority: counterAccount.authority.toString(),
        count: counterAccount.count.toNumber(),
        bump: counterAccount.bump,
        address: this.counterPDA.toString(),
      };
    } catch (error) {
      console.error("❌ Failed to fetch counter account:", error);
      throw error;
    }
  }

  /**
   * Check if counter is initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      await this.program.account.counter.fetch(this.counterPDA);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<number> {
    const balance = await connection.getBalance(this.authority.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Airdrop SOL to authority (devnet only)
   */
  async airdrop(amount: number = 1): Promise<void> {
    if (NETWORK !== "devnet") {
      throw new Error("Airdrop only available on devnet");
    }

    console.log(`Requesting ${amount} SOL airdrop...`);
    const signature = await connection.requestAirdrop(
      this.authority.publicKey,
      amount * LAMPORTS_PER_SOL
    );
    
    await connection.confirmTransaction(signature);
    console.log("✅ Airdrop successful!");
  }
}

/**
 * Example usage and demonstration
 */
async function main() {
  console.log("🚀 Counter Client Demo");
  console.log("=".repeat(50));

  // Generate a new keypair for testing
  const authority = Keypair.generate();
  console.log("Authority pubkey:", authority.publicKey.toString());

  // Create client instance
  const client = new CounterClient(authority);

  try {
    // Airdrop some SOL for testing (devnet only)
    if (NETWORK === "devnet") {
      await client.airdrop(2);
      console.log("Balance after airdrop:", await client.getBalance(), "SOL");
    }

    // Check if counter is already initialized
    const isInitialized = await client.isInitialized();
    console.log("Counter initialized:", isInitialized);

    // Initialize if not already done
    if (!isInitialized) {
      await client.initialize();
    }

    // Display initial state
    console.log("\n📊 Initial Counter State:");
    const initialState = await client.getCounterAccount();
    console.log(JSON.stringify(initialState, null, 2));

    // Demonstrate increment operations
    console.log("\n⬆️ Incrementing counter 3 times...");
    for (let i = 0; i < 3; i++) {
      await client.increment();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }

    // Demonstrate decrement operations
    console.log("\n⬇️ Decrementing counter 1 time...");
    await client.decrement();

    // Display final state
    console.log("\n📊 Final Counter State:");
    const finalState = await client.getCounterAccount();
    console.log(JSON.stringify(finalState, null, 2));

    console.log("\n✅ Demo completed successfully!");

  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

// Utility functions for interactive testing
export const utils = {
  /**
   * Create a new counter client with a random authority
   */
  createClient: () => {
    const authority = Keypair.generate();
    return new CounterClient(authority);
  },

  /**
   * Create a client with a specific authority
   */
  createClientWithAuthority: (authority: Keypair) => {
    return new CounterClient(authority);
  },

  /**
   * Generate a new keypair
   */
  generateKeypair: () => {
    return Keypair.generate();
  },

  /**
   * Convert base58 string to Keypair (for testing with existing keys)
   */
  keypairFromBase58: (base58: string) => {
    return Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(base58, 'base64'))
    );
  }
};

// Export for use in Solana Playground
export {  main };

// Uncomment the line below to run the demo
// main().catch(console.error);