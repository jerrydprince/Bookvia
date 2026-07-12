export const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Strip all non-digits
  let cleanNumber = phone.replace(/\D/g, "");
  
  if (cleanNumber.length < 10) return null; // Reject anything too short
  
  // Auto-format local Nigerian to international
  if (cleanNumber.startsWith("0") && cleanNumber.length === 11) {
    cleanNumber = "234" + cleanNumber.slice(1);
  }
  
  // Termii requires valid international MSISDN format (11-15 digits typically)
  if (cleanNumber.length < 11 || cleanNumber.length > 15) return null;
  
  return cleanNumber;
};

export const sendTermiiSms = async (to, message) => {
  try {
    const formattedNumber = formatPhoneNumber(to);
    if (!formattedNumber) return null;
    
    const API_BASE = import.meta.env.VITE_API_URL || "/api";
    const response = await fetch(`${API_BASE}/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: formattedNumber, message })
    });
    
    const result = await response.json();
    return { success: response.ok, message_id: result.messageId, error: result.error, result };
  } catch (error) {
    console.error("Termii SMS Proxy Error:", error);
    return { success: false, error: error.message };
  }
};

export const sendBulkTermiiSms = async (toArray, message) => {
  try {
    if (!toArray || toArray.length === 0) return null;
    const validNumbers = toArray.map(formatPhoneNumber).filter(num => num !== null);
    if (validNumbers.length === 0) return null;

    const API_BASE = import.meta.env.VITE_API_URL || "/api";
    const response = await fetch(`${API_BASE}/sms/send/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: validNumbers, message })
    });
    
    const result = await response.json();
    return { success: response.ok, message_id: result.messageId, error: result.error, result };
  } catch (error) {
    console.error("Termii Bulk SMS Proxy Error:", error);
    return { success: false, error: error.message };
  }
};
