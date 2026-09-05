const storeToken = (token_name, token, max_age, res) => {
  res.cookie(token_name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Lax for local dev prevents some cross-site issues while allowing same-site, but since localhost front/back are cross-origin, we might need 'none' if they are different ports. Actually 'strict' breaks cross-origin fetch entirely if it's considered cross-site. Wait, localhost:3000 and localhost:5173 are considered same-site but cross-origin. Let's use strict or lax for dev.
    maxAge: max_age
  });
};
const storeCsrfToken = (token_name, token, max_age, res) => {
  res.cookie(token_name, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: max_age
  });
};

module.exports = { storeToken, storeCsrfToken };