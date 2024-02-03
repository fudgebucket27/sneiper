import {MerkleTree} from "merkletreejs";
import {keccak_256} from '@noble/hashes/sha3';

export function generateMerkleProof(wallets,address)
{
    if (wallets.indexOf(address) === -1) {
        //console.log("Address not found in mint group..")
        return null;
    }
    
    // Hash wallet addresses
    let hashedWallets = wallets.map(keccak_256)

    // Generate Merkle tree
    const tree = new MerkleTree(hashedWallets, keccak_256, { sortPairs: true })
    const merkleRoot = tree.getRoot().toString('hex')
    
    // Generate Merkle proof
    const proof = tree.getProof(Buffer.from(keccak_256(address))).map(element => element.data.toString('hex'))
    const merkleProof = proof.map((p) => Array.from(Buffer.from(p, 'hex')))
    return merkleProof;
}

export function generateMerkleRoot(wallets, address) {
    
    if (wallets.indexOf(address) === -1) {
        // Address not found in mint group
        return null;
    }

    // Hash wallet addresses
    let hashedWallets = wallets.map(addr => keccak_256(Buffer.from(addr)));

    // Generate Merkle tree
    const tree = new MerkleTree(hashedWallets, keccak_256, { sortPairs: true });
    const merkleRoot = tree.getRoot().toString('hex');
    const merkleRootArray = Array.from(Buffer.from(merkleRoot, 'hex')).map(byte => byte);
    return merkleRootArray;
}

export function isMatchingMerkle(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
    return arr1.every((element, index) => element === arr2[index]);
  }