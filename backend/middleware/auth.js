const jwt = require("jsonwebtoken");
const authSecret = require("../utils/authSecret");

const getTokenFromHeader = (authorization) => {
  if (!authorization) return null;
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }
  return authorization.trim();
};

const auth = (req, res, next) => {
  const token = getTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, authSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const optionalAuth = (req, _res, next) => {
  const token = getTokenFromHeader(req.headers.authorization);

  if (!token) {
    return next();
  }

  try {
    req.user = jwt.verify(token, authSecret);
  } catch (_err) {
    req.user = undefined;
  }

  next();
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
