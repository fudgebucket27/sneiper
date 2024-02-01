import MerkleTree from "merkletreejs";
import {keccak_256} from '@noble/hashes/sha3';

export function generateMerkleProof(wallets,address)
{
    if (wallets.length === 0) {
        console.log("This mint group has no allow list..")
        return null;
    }

    if (wallets.indexOf(address) === -1) {
        console.log("Address not found in mint group..")
        return null;
    }
    
    // Hash wallet addresses
    let hashedWallets = wallets.map(keccak_256)

    // Generate Merkle tree
    const tree = new MerkleTree(hashedWallets, keccak_256, { sortPairs: true })
    //const merkleRoot = tree.getRoot().toString('hex')
    
    // Generate Merkle proof
    const proof = tree.getProof(Buffer.from(keccak_256(wallet))).map(element => element.data.toString('hex'))
    const merkleProof = proof.map((p) => Array.from(Buffer.from(p, 'hex')))
    return merkleProof;
}