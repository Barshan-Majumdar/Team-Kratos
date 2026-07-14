/**
 * Strict Indian KYC Validation Rules
 * Returns true if valid, false if invalid, and null if empty.
 */
export const validateField = (name, value) => {
  if (!value || value.trim() === '') return null; // Empty fields are null (neutral)

  const val = value.trim().toUpperCase();

  switch (name) {
    case 'panNo':
      // 5 Letters, 4 Digits, 1 Letter (e.g., ABCDE1234F)
      return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val);
      
    case 'aadharNo':
      // Exactly 12 Digits (e.g., 123456789012)
      return /^\d{12}$/.test(val.replace(/\s/g, '')); // Ignore spaces if user types them
      
    case 'voterIdNo':
      // 3 Letters followed by 7 Digits (e.g., ABC1234567)
      return /^[A-Z]{3}[0-9]{7}$/.test(val);
      
    case 'uanNo':
      // Exactly 12 Digits (e.g., 123456789012)
      return /^\d{12}$/.test(val);
      
    case 'ifscCode':
      // 4 Letters, a zero '0', and 6 alphanumeric (e.g., HDFC0000001)
      return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val);
      
    case 'accountNumber':
      // Only digits, strictly between 9 and 18 numbers
      return /^\d{9,18}$/.test(val);

    default:
      return null;
  }
};
