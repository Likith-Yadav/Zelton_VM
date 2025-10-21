import { VALIDATION_RULES, PHONE_VALIDATION } from "../constants/constants";

// Validation helpers
export const validateEmail = (email) => {
  return VALIDATION_RULES.EMAIL.test(email);
};

export const validatePhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return PHONE_VALIDATION.PATTERN.test(cleaned) && cleaned.length === PHONE_VALIDATION.MAX_LENGTH;
};

export const formatPhoneInput = (text) => {
  // Remove all non-digit characters
  const cleaned = text.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = cleaned.slice(0, PHONE_VALIDATION.MAX_LENGTH);
  
  return limited;
};

export const isValidPhoneInput = (text) => {
  // Check if input contains only digits and is within length limit
  return PHONE_VALIDATION.ALLOWED_CHARS.test(text) && text.length <= PHONE_VALIDATION.MAX_LENGTH;
};

export const validatePAN = (pan) => {
  return VALIDATION_RULES.PAN.test(pan);
};

export const validateAadhar = (aadhar) => {
  return VALIDATION_RULES.AADHAR.test(aadhar);
};

export const validatePincode = (pincode) => {
  return VALIDATION_RULES.PINCODE.test(pincode);
};

export const validatePassword = (password) => {
  return password && password.length >= 8;
};

// Format helpers
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date, options = {}) => {
  if (!date) return "N/A";

  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date";
    }
    return new Intl.DateTimeFormat("en-IN", {
      ...defaultOptions,
      ...options,
    }).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error, "Date value:", date);
    return "Invalid Date";
  }
};

export const formatDateTime = (date) => {
  if (!date) return "N/A";

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date";
    }
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);
  } catch (error) {
    console.error("Error formatting datetime:", error, "Date value:", date);
    return "Invalid Date";
  }
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Format ordinal numbers (1st, 2nd, 3rd, 4th, etc.)
export const formatOrdinal = (number) => {
  if (number === null || number === undefined || isNaN(number)) {
    return "";
  }

  const num = parseInt(number);
  if (num < 1 || num > 31) {
    return num.toString();
  }

  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${num}th`;
  }

  switch (lastDigit) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
};

// String helpers
export const capitalizeFirst = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Array helpers
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

export const sortBy = (array, key, order = "asc") => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (order === "desc") {
      return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
    }
    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
  });
};

export const uniqueBy = (array, key) => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// Object helpers
export const pick = (obj, keys) => {
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
};

export const omit = (obj, keys) => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

export const isEmpty = (value) => {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};

// Number helpers
export const formatNumber = (num, decimals = 0) => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const parseNumber = (str) => {
  if (typeof str === "number") return str;
  if (typeof str === "string") {
    const cleaned = str.replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Date helpers
export const isToday = (date) => {
  if (!date) return false;
  try {
    const today = new Date();
    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) return false;
    return checkDate.toDateString() === today.toDateString();
  } catch (error) {
    return false;
  }
};

export const isYesterday = (date) => {
  if (!date) return false;
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) return false;
    return checkDate.toDateString() === yesterday.toDateString();
  } catch (error) {
    return false;
  }
};

export const isThisWeek = (date) => {
  if (!date) return false;
  try {
    const today = new Date();
    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) return false;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    return checkDate >= startOfWeek && checkDate <= endOfWeek;
  } catch (error) {
    return false;
  }
};

export const getRelativeTime = (date) => {
  if (!date) return "Unknown";
  try {
    const now = new Date();
    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) return "Invalid Date";

    const diffInSeconds = Math.floor((now - checkDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 604800)}w ago`;
    if (diffInSeconds < 31536000)
      return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  } catch (error) {
    return "Invalid Date";
  }
};

// Color helpers
export const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Storage helpers
export const getStorageKey = (key, defaultValue = null) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error("Error getting storage key:", error);
    return defaultValue;
  }
};

export const setStorageKey = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Error setting storage key:", error);
    return false;
  }
};

export const removeStorageKey = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Error removing storage key:", error);
    return false;
  }
};

// Debounce helper
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle helper
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
