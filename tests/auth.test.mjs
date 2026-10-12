import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../src/lib/auth-crypto.ts";

test("Auth: hashes password and verifies correctly", () => {
  const password = "myStudentSecretPassword456";
  const hash = hashPassword(password);

  assert.notEqual(hash, password);
  assert.ok(hash.includes(":"));
  assert.equal(verifyPassword(password, hash), true);
  assert.equal(verifyPassword("wrongPassword", hash), false);
});

test("Auth: creates and verifies tamper-proof session tokens", () => {
  const user = {
    id: "user_test_123",
    email: "student@amahas.internal",
    name: "Kishore",
    role: "student",
  };

  const token = createSessionToken(user);
  const verified = verifySessionToken(token);

  assert.ok(verified);
  assert.equal(verified?.id, user.id);
  assert.equal(verified?.email, user.email);

  // Tampered token test
  const tampered = token.replace(/a/g, "b");
  assert.equal(verifySessionToken(tampered), null);
});
