export const INDIA_STATE_OPTIONS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const INDIA_STATE_SET = new Set(INDIA_STATE_OPTIONS);
const INDIAN_PIN_REGEX = /^\d{6}$/;
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

export function validateIndianAddress(input, options = {}) {
  const { includeIsDefault = false } = options;
  const source = input && typeof input === "object" ? input : {};

  const address = {
    fullName: String(source.fullName ?? "").trim(),
    phone: String(source.phone ?? "").replace(/\D/g, ""),
    line1: String(source.line1 ?? "").trim(),
    line2: String(source.line2 ?? "").trim(),
    city: String(source.city ?? "").trim(),
    state: String(source.state ?? "").trim(),
    pincode: String(source.pincode ?? "").replace(/\D/g, ""),
    ...(includeIsDefault ? { isDefault: Boolean(source.isDefault) } : {}),
  };

  if (!address.fullName || address.fullName.length > 120) {
    return { ok: false, error: "Full name is required and must be 120 characters or fewer" };
  }
  if (!INDIAN_PHONE_REGEX.test(address.phone)) {
    return { ok: false, error: "Phone must be a valid 10-digit Indian mobile number" };
  }
  if (!address.line1 || address.line1.length > 200) {
    return { ok: false, error: "Address line 1 is required and must be 200 characters or fewer" };
  }
  if (address.line2.length > 200) {
    return { ok: false, error: "Address line 2 must be 200 characters or fewer" };
  }
  if (!address.city || address.city.length > 80) {
    return { ok: false, error: "City is required and must be 80 characters or fewer" };
  }
  if (!INDIA_STATE_SET.has(address.state)) {
    return { ok: false, error: "Please select a valid Indian state or union territory" };
  }
  if (!INDIAN_PIN_REGEX.test(address.pincode)) {
    return { ok: false, error: "PIN code must be exactly 6 digits" };
  }

  return { ok: true, address };
}
