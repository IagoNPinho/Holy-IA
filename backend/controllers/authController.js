const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha obrigatorios." });
  }

  if (email !== env.AUTH_EMAIL || password !== env.AUTH_PASSWORD) {
    return res.status(401).json({ error: "Credenciais invalidas." });
  }

  const token = jwt.sign({ email }, env.JWT_SECRET, { expiresIn: "12h" });
  return res.json({ token, email });
}

module.exports = { login };
