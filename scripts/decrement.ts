import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

const main = async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Counter as anchor.Program<any>;

  const [counterPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    program.programId
  );

  console.log("Counter PDA:", counterPDA.toBase58());

  const tx = await program.methods.decrement()
    .accounts({
      counter: counterPDA,
      authority: provider.wallet.publicKey,
    })
    .rpc();

  console.log("✅ Transaction signature:", tx);
};

main().catch((err) => {
  console.error(err);
});
