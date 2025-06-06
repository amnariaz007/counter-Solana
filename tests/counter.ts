import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Counter } from "../target/types/counter";
import { expect } from "chai";

describe("counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Counter as Program<Counter>;

  // Derive PDA for counter account
  const [counterPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    program.programId
  );

  it("Initializes the counter", async () => {
    await program.methods
      .initialize()
      .accounts({
        counter: counterPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const counterAccount = await program.account.counter.fetch(counterPda);
    expect(counterAccount.count.toNumber()).to.equal(0);
    expect(counterAccount.authority.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
  });

  it("Increments the counter", async () => {
    await program.methods
      .increment()
      .accounts({
        counter: counterPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const counterAccount = await program.account.counter.fetch(counterPda);
    expect(counterAccount.count.toNumber()).to.equal(1);
  });

  it("Decrements the counter", async () => {
    await program.methods
      .decrement()
      .accounts({
        counter: counterPda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const counterAccount = await program.account.counter.fetch(counterPda);
    expect(counterAccount.count.toNumber()).to.equal(0);
  });

  it("Fails to decrement below 0", async () => {
    try {
      await program.methods
        .decrement()
        .accounts({
          counter: counterPda,
          authority: provider.wallet.publicKey,
        })
        .rpc();
      throw new Error("Decrement should have failed");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("Underflow");
    }
  });

  it("Fails if unauthorized user tries to increment", async () => {
    const newKeypair = anchor.web3.Keypair.generate();

    const airdropSig = await provider.connection.requestAirdrop(
      newKeypair.publicKey,
      2e9 // 2 SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    const unauthorizedProvider = new anchor.AnchorProvider(
      provider.connection,
      new anchor.Wallet(newKeypair),
      provider.opts
    );
    const unauthorizedProgram = new Program(
      program.idl,
      program.programId,
      unauthorizedProvider
    );

    try {
      await unauthorizedProgram.methods
        .increment()
        .accounts({
          counter: counterPda,
          authority: newKeypair.publicKey,
        })
        .signers([newKeypair])
        .rpc();
      throw new Error("Unauthorized increment should have failed");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("Unauthorized");
    }
  });
});
