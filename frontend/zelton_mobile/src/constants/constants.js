//likith:
export const API_BASE_URL = "https://api.zelton.in";
//yusha wifi:
//export const API_BASE_URL = "http://192.168.0.102:8000/api";
//yusha hotspot:
// export const API_BASE_URL = "http://10.214.80.15:8000/api";
export const USER_ROLES = {
  OWNER: "owner",
  TENANT: "tenant",
};

export const PROPERTY_TYPES = [
  { label: "Apartment", value: "apartment" },
  { label: "House", value: "house" },
  { label: "Villa", value: "villa" },
  { label: "Commercial", value: "commercial" },
  { label: "Other", value: "other" },
];

export const UNIT_TYPES = [
  { label: "1 BHK", value: "1bhk" },
  { label: "2 BHK", value: "2bhk" },
  { label: "3 BHK", value: "3bhk" },
  { label: "4 BHK", value: "4bhk" },
  { label: "Studio", value: "studio" },
  { label: "Penthouse", value: "penthouse" },
];

export const UNIT_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export const PAYMENT_TYPES = {
  RENT: "rent",
  SUBSCRIPTION: "subscription",
  MAINTENANCE: "maintenance",
};

export const INVOICE_STATUS = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
};

export const SUBSCRIPTION_PLANS = {
  STARTER: "starter",
  GROWTH: "growth",
  BUSINESS: "business",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
  PREMIUM: "premium",
  ULTIMATE: "ultimate",
};

export const PHONEPE_CONFIG = {
  MERCHANT_ID: "ZELTONLIVINGS",
  MERCHANT_USER_ID: "ZELTON_USER",
  SALT_KEY: "YOUR_SALT_KEY",
  SALT_INDEX: 1,
  REDIRECT_URL: "https://zeltonlivings.com/payment/callback",
  CALLBACK_URL: "https://zeltonlivings.com/payment/callback",
};

export const SCREEN_NAMES = {
  LANDING: "Landing",
  AUTH: "Auth",
  ROLE_SELECTION: "RoleSelection",
  OWNER_REGISTRATION: "OwnerRegistration",
  TENANT_REGISTRATION: "TenantRegistration",
  OWNER_DASHBOARD: "OwnerDashboard",
  TENANT_DASHBOARD: "TenantDashboard",
  PROPERTY_MANAGEMENT: "PropertyManagement",
  UNIT_MANAGEMENT: "UnitManagement",
  TENANT_KEY_JOIN: "TenantKeyJoin",
  PAYMENT: "Payment",
  PAYMENT_TRANSACTIONS: "PaymentTransactions",
  PRICING: "Pricing",
  PROFILE: "Profile",
  ANALYTICS: "Analytics",
};

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[6-9]\d{9}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  AADHAR: /^[0-9]{12}$/,
  PINCODE: /^[1-9][0-9]{5}$/,
};

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Please enter a valid email address",
  INVALID_PHONE: "Please enter a valid 10-digit phone number",
  INVALID_PAN: "Please enter a valid PAN number",
  INVALID_AADHAR: "Please enter exactly 12 digits for Aadhar number",
  INVALID_PINCODE: "Please enter a valid 6-digit pincode",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters long",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  REGISTRATION_SUCCESS: "Registration successful",
  PROPERTY_ADDED: "Property added successfully",
  UNIT_ADDED: "Unit added successfully",
  TENANT_KEY_GENERATED: "Tenant key generated successfully",
  PAYMENT_INITIATED: "Payment initiated successfully",
  PAYMENT_SUCCESS: "Payment completed successfully",
  PROFILE_UPDATED: "Profile updated successfully",
  PROPERTY_UPDATED: "Property updated successfully",
  UNIT_UPDATED: "Unit updated successfully",
};

export const STORAGE_KEYS = {
  USER_TOKEN: "user_token",
  USER_ROLE: "user_role",
  USER_DATA: "user_data",
  PROPERTY_DATA: "property_data",
  ONBOARDING_COMPLETED: "onboarding_completed",
  THEME_PREFERENCE: "theme_preference",
  LANGUAGE_PREFERENCE: "language_preference",
};
