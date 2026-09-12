/**
 * Secure Credential Hashing Utility for Slotify Evaluator Accounts
 * Uses project's standard bcryptjs configuration (work factor: 10).
 * NEVER prints or logs plaintext passwords.
 */
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const BCRYPT_ROUNDS = 10;

// Evaluator Account Credentials (read securely from environment variables or non-committed local values)
const accounts = [
  {
    role: 'SYSTEM_OWNER',
    email: process.env.SEED_OWNER_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'superadmin@gmail.com',
    plaintextPassword: process.env.SEED_OWNER_PASSWORD || process.env.SUPER_ADMIN_PASSWORD || process.argv[2] || '',
  },
  {
    role: 'BUSINESS_ADMIN_1',
    email: process.env.SEED_ADMIN1_EMAIL || process.env.BUSINESS_ADMIN_1_EMAIL || 'admin1@gmail.com',
    plaintextPassword: process.env.SEED_ADMIN1_PASSWORD || process.env.BUSINESS_ADMIN_1_PASSWORD || process.argv[3] || '',
  },
  {
    role: 'BUSINESS_ADMIN_2',
    email: process.env.SEED_ADMIN2_EMAIL || process.env.BUSINESS_ADMIN_2_EMAIL || 'admin2@gmail.com',
    plaintextPassword: process.env.SEED_ADMIN2_PASSWORD || process.env.BUSINESS_ADMIN_2_PASSWORD || process.argv[4] || '',
  },
].filter((a) => Boolean(a.plaintextPassword));

console.log('====================================================');
console.log('Slotify Secure Credential Hashing Utility (Phase 12)');
console.log('====================================================');
console.log(`Bcrypt Work Factor: ${BCRYPT_ROUNDS}`);
console.log('Generating secure hashes (plaintext passwords are NEVER displayed)...\n');

const results = accounts.map(({ role, email, plaintextPassword }) => {
  const hash = bcryptjs.hashSync(plaintextPassword, BCRYPT_ROUNDS);
  // Verify hash correctness
  const isValid = bcryptjs.compareSync(plaintextPassword, hash);
  if (!isValid) {
    throw new Error(`Integrity check failed for ${email}`);
  }

  return {
    role,
    email,
    hash,
    verified: isValid,
  };
});

results.forEach((acc) => {
  console.log(`Role:       ${acc.role}`);
  console.log(`Email:      ${acc.email}`);
  console.log(`BcryptHash: ${acc.hash}`);
  console.log(`Verified:   ${acc.verified ? 'YES' : 'NO'}`);
  console.log('----------------------------------------------------');
});

console.log('\nAll hashes successfully generated and verified.');
console.log('Plaintext passwords were NOT printed and are NOT stored.');
