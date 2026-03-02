import { generateShiprocketToken } from "../utils/shiprocketService";

let cachedToken = null;
let tokenExpiry = null;

export const getShiprocketToken = async () => {
  // ✅ Reuse token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return { success: true, token: cachedToken };
  }

  const newToken = await generateShiprocketToken();

  if (newToken.success) {
    cachedToken = newToken.token;

    // ⏳ Set expiry (Shiprocket JWT usually long-lived)
    tokenExpiry = Date.now() + (8 * 24 * 60 * 60 * 1000);

    return { success: true, token: cachedToken };
  }

  return newToken;
};