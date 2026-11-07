# Crypt

**Sell a secret on the Tari Ootle without trusting anyone.** The buyer pays into escrow, the seller
delivers the secret encrypted to the buyer's key, and if the buyer says it is wrong, **the template
decrypts it and decides**. No arbiter, no oracle, no account: the money comes from stealth coins and
goes back into stealth outputs.

Built for the Tari Ootle "Spooky Secrets" showcase (October 2026).

## Play it

![A seller delivers a fake: the crypt decrypts it, compares it to the seal, and curses the cheater](demo/media/crypt-verdict.gif)

**[lrifton92.github.io/crypt](https://lrifton92.github.io/crypt/)**: a two-minute game in the browser, no wallet. Take a side (seller or buyer), play honest or cheat; a ghost plays the other side. Every step runs the real `crypt_core` client code compiled to WebAssembly, and the verdict comes from a port of the template's rules (`crypt_core::rules`) that CI checks against the template itself (`tests/equivalence.rs`): same calls, same accept or refuse, same split, after every call. The verdict screen shows what was checked: the seal, the keys, the shared point, the DLEQ proof, the hashes, the split. [Watch a 100-second game](https://lrifton92.github.io/crypt/media/crypt-demo.mp4).

## Live on esmeralda

The template is published on the Tari Ootle testnet and two sales were played for real with the same client code (`onchain/`). Links go to [Veil](https://explorer.tari.mw), an independent Ootle explorer.

* Template [`template_466c4da9938489b61b66ae0abbc39e850f162b540b76a29e88941c4d96deacbb`](https://explorer.tari.mw/template/466c4da9938489b61b66ae0abbc39e850f162b540b76a29e88941c4d96deacbb), [published](https://explorer.tari.mw/tx/641e7def14dd62894cfc2f448c8fb14bed7c0b6f969cb1ce0c734236e72434ce) on 7 November 2026 (rebuilt against `tari_template_lib 0.38` for Ootle 0.50.1) from commit `742208d`; CI's `crypt.wasm` sha256 `74c50156b53057d0e8bb325c31cc5063ff9e165f708e6f5bd5b00d4f2ff5c008` (CI run 42376687680; the wallet daemon re-optimises the wasm before publishing, so the on-chain bytes differ slightly).
* The sales below were played on the previous build, template [`template_ed8116a0633c05c27ec588ca2fcaa7b2b105c5caca52a77fc7b3453003496c82`](https://explorer.tari.mw/template/ed8116a0633c05c27ec588ca2fcaa7b2b105c5caca52a77fc7b3453003496c82), [published](https://explorer.tari.mw/tx/983bae990662462285f0d12564155f9d93a68612a821f65c0d834ae4bc7113b3) on 3 November 2026 (after the Ootle 0.49 testnet reset).

| Sale | Transactions | Component |
|---|---|---|
| Honest: accepted, both sides paid | [list](https://explorer.tari.mw/tx/88a45a909ebd4648b67c102d1b68e96a11471fb59078a3e3d1fab1007fc91ffa) → [buy](https://explorer.tari.mw/tx/a3e387decb876ac88af7199fff2da80b0c0dc987d985e234000c2d9ec65b8e88) → [deliver](https://explorer.tari.mw/tx/f63b11eed0559dd1f3fa9f68d9cf901bc5e7877e1ddf8ea33f1a9c92b7f12be9) → [accept](https://explorer.tari.mw/tx/9396c462000ab1d56ceab63321e7e1e70c5147dd5ae60b8bdc7c420b605ce27b) → [pay_seller](https://explorer.tari.mw/tx/01aa87e98f64e09e9dccb7dda353454082650a88f0c00330539a68526e02ede5) → [pay_buyer](https://explorer.tari.mw/tx/3b64ee57d7d8008ab3fc32cbb9df12c13ead395c24721c5a159c0dbff0c071e4) | [component_c27c3f73…](https://explorer.tari.mw/substate/component_c27c3f73e7c31fbc984004331e2dcaa2ba7710cf6cc88609e9166b0db0923fcb) |
| Fake delivery: disputed, ruled `Fraud`, buyer paid everything | [list](https://explorer.tari.mw/tx/3073c81775a029566e52db73df22d45eff52b87e891078b678af4b1a6d3a2d39) → [buy](https://explorer.tari.mw/tx/72941a69085f5d95e98114b60798a756c1cb686755df5b9323c0d17bb8656332) → [deliver](https://explorer.tari.mw/tx/47694beb86510577d6cbbb3e9ea2fd614d52d4d00f5174765eaac66171147f4b) → [dispute](https://explorer.tari.mw/tx/690f7cc4ef658fcc7533a90d0176b2fc75985dd7f7b774b3dbe5c2f35edbfafa) → [pay_buyer](https://explorer.tari.mw/tx/d7ccc340f2db1af3fd5951edcd9503a96aede8e3d0b631e1ea43b0273f5d083e) | [component_54358adf…](https://explorer.tari.mw/substate/component_54358adf639d5ee5d6c4fa9d9428a8cdd0f96f5d083bba8c4f18215c8ce8ce4d) |

Both sides of each sale used fresh Crypt keys; the transaction fees and the stealth coins came from one demo wallet, so this shows the contract working, not two independent people.

## Tari's privacy, end to end

| What stays secret | How | Tari capability |
|---|---|---|
| The secret itself, on a public ledger | Encrypted to a per-sale key with a keystream from a Ristretto Diffie-Hellman point; only the buyer can derive it | Ristretto255 + SHA-512 engine intrinsics |
| Whether a delivery is honest, without an arbiter | The buyer reveals the shared point with a Chaum-Pedersen DLEQ proof; the template re-derives the key, decrypts, re-hashes and rules | Group arithmetic inside the template (`ristretto_mul`, `scalar_from_uniform_bytes`, …) |
| Who funds a sale | Both sides spend stealth UTXOs (hidden value, one-time spend key) into the escrow; no account is involved | Stealth XTM (TIP-0006), transaction-level `StealthTransfer` |
| Where the money goes | Each side is paid into fresh Pedersen-committed stealth outputs, signed for over the exact transfer, so nobody can redirect it | `Bucket::stealth_transfer` from inside the template |
| Who is acting | No action is authorised by the transaction signer: buy, deliver, accept, cancel and payouts each carry a Schnorr proof by a key derived for this listing or this purchase only | Schnorr over Ristretto, verified on-chain |
| The secret's length, and short secrets | Fixed 320-byte blocks with a 32-byte random salt under the commitment | |

## How a sale works

```
seller                              template                               buyer
  | list(commitment, terms, K,         |                                      |
  |      proof by K, bond) ----------->|  bond from a stealth coin            |
  |                                    |<-- buy(B', proof by B', payment)     |
  |                                    |    payment from a stealth coin       |
  | deliver(R, proof of r,             |                                      |
  |         C, proof by K) ----------->|  C = block XOR stream(S), S = r·B'   |
  |                                    |  R and C public, S is not            |
  |                                    |                    open with S = b'·R
  |                                    |<----------- accept(proof by B')      |   or
  |                                    |<----------- dispute(S, DLEQ proof)   |
  |                                    |  verify, decrypt C, hash, compare    |
  | pay_seller(stealth transfer,       |                                      |
  |            proof by K) ----------->|<---- pay_buyer(stealth transfer, proof by B')
  |        fresh stealth outputs <-----|-----> fresh stealth outputs          |
```

`K` is the seller's key for this listing, `B'` the buyer's key for this purchase. Both are derived
client-side from a base key by hashing, so no two listings or purchases share a key.

| Ending | Seller gets | Buyer gets |
|---|---|---|
| `accept`, or no dispute before the deadline | price + seller bond | buyer bond |
| Dispute, delivery matches the commitment | price + both bonds | nothing |
| Dispute, delivery does not match or is not decodable | nothing | price + both bonds |
| No delivery before the deadline | nothing | price + both bonds |
| Seller cancels before a sale | seller bond | |

## What is proven, what is hidden, what is not

* **Proven by the template:** the secret delivered is exactly the one committed to when listing. It
  cannot prove the secret is worth the price.
* **Hidden:** the secret (until a dispute), its length, the parties' accounts (there are none), the
  link between a seller's listings or a buyer's purchases (fresh keys each time), and who receives
  each payout.
* **A dispute makes the secret public.** That is what lets anyone re-check the verdict.
* **Still visible**, as on any UTXO ledger without decoys: the amounts of the sale, the commitments of
  the coins spent into it and of the outputs paying out of it (which link to their holders' other
  transactions), and whoever signs and pays fees for each transaction. To keep that link weak: fund
  from fresh coins, pay fees from a coin used for nothing else, and split payouts into several outputs.

## Security

Four adversarial review passes; every finding is fixed with a test or listed as a limit in
[THREAT_MODEL.md](THREAT_MODEL.md), which maps each attack to the test that plays it. The second pass
found a real cross-sale leak in an earlier design (an additive key tweak let a seller pull another
sale's secret through a dispute); the fix is the proof of knowledge of `r` at delivery, and the
attack is replayed in `tests/attacks.rs`. The fourth pass found that a listing never expired (anyone
could buy a seller's forgotten listing and claim the bond), that a listing could reuse another seller's
key at a price of 1, and that terms could be set to make delivering noise pay; listings now expire,
`list` takes a proof by the seller key over every term, and the bonds and windows are bounded.

CI runs on every commit, from the committed `Cargo.lock`:

* `crypt_core`: unit and property tests of the client cryptography;
* `crypt` CLI: a whole sale driven through the binary;
* the template: wasm build and clippy with warnings denied;
* `tests/end_to_end.rs`: every way a sale can end, each payout actually spent afterwards to prove the
  payee controls exactly what it was owed;
* `tests/attacks.rs`: the attack battery, including a hostile template (`tests/templates/evil`) and a
  scan of everything the ledger shows for the secret, its salt, the shared point and accounts;
* formatting, and a RustSec audit of the dependency tree.

**Your Crypt key is the only way to collect what a sale owes you.** Back it up.

## Using it: the `crypt` CLI

`cli/` builds `crypt`, the offline half of a sale. It computes every value a transaction needs and
prints `name=hex` lines; your wallet submits them. It never touches the network, never takes a secret
on the command line, never overwrites a key or block file, and refuses to sign a payout the template
would refuse or that does not pay exactly what you are owed.

Seller:

```sh
crypt keygen --out seller.key            # base key: back it up
crypt commit --seller-key seller.key --secret-file secret.txt --out block.hex \
  --price <µT> --buyer-bond <µT> --seller-bond <µT> --listing-window <epochs> --delivery-window <epochs> --dispute-window <epochs>
# prints commitment, seller_key and list_c/list_z for
# list(commitment, price, buyer_bond, listing_window, delivery_window, dispute_window, seller_key, list_c, list_z, bond)
crypt seal --seller-key seller.key --commitment <m> --block block.hex --component <crypt> \
  --buyer-key <B'> --buy-c <c> --buy-z <z>     # the buyer key and proof from the buy transaction
# deliver(ephemeral, ephemeral_c, ephemeral_z, ciphertext, c, z)
crypt payout --seller-key seller.key --commitment <m> --component <crypt> --statement transfer.hex --owed <n>
# pay_seller(transfer, c, z); transfer.hex is the stealth transfer your wallet builds to pay you
crypt cancel --seller-key seller.key --commitment <m> --component <crypt>   # cancel(c, z), unsold only
```

Buyer:

```sh
crypt keygen --out buyer.key             # base key: back it up
crypt buy --base-key buyer.key --component <crypt>                         # buy(buyer_key, c, z, payment)
crypt open --base-key buyer.key --component <crypt> --ephemeral <R> --ciphertext <C> --commitment <m>
# prints the secret, or exits with status 2: "dispute: ..."
crypt accept  --base-key buyer.key --component <crypt> --ephemeral <R> --ciphertext <C> --commitment <m>  # accept(c, z)
crypt dispute --base-key buyer.key --component <crypt> --ephemeral <R> --registered <B'>
# dispute(shared, c, z), sent well before the deadline
crypt payout --base-key buyer.key --component <crypt> --statement transfer.hex --owed <n>  # pay_buyer
```

Anyone, once a window has passed: `claim_undelivered()`, `claim_uncontested()`.

## Layout

* `src/lib.rs`: the template (`tari_template_lib` 0.37).
* `core/`: `crypt_core`, the client side (keys, sealing, opening, the action proofs, the DLEQ proof, the
  payout digest) in `curve25519-dalek` + `sha2`.
* `cli/`: the `crypt` binary.
* `tests/`: the end-to-end suite, the attack battery and the hostile template. The client code produces
  every input: if the client and the template ever disagree on a byte, a test fails.
* `core/src/rules.rs`: the template's settlement rules in plain Rust; `tests/equivalence.rs` plays the same
  sequences in the engine and in the port and requires identical results.
* `demo/wasm/`: the demo engine (`crypt_core` + the rules) for the browser; `demo/web/`: the game (Vite +
  TypeScript), with Playwright tests of every ending on a desktop and a 360 px phone.
* `onchain/`: plays real sales on esmeralda with `ootle-rs` and records every transaction.

## Build and test

```sh
cargo test -p crypt_core -p crypt_cli                          # client cryptography, CLI
rustup target add wasm32-unknown-unknown
cargo build -p crypt --release --target wasm32-unknown-unknown # the template
cargo test -p crypt --tests                                    # Linux/macOS: the engine's JIT does not build on Windows

# the demo
cargo build -p crypt_wasm --release --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/crypt_wasm.wasm --target web --out-dir demo/wasm/pkg
cd demo/web && npm ci && npm run build && npx playwright test
```

## License

BSD-3-Clause.
