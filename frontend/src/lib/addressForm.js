export const INDIA_STATE_OPTIONS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]

const INDIA_STATE_SET = new Set(INDIA_STATE_OPTIONS)
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/
const INDIAN_PIN_REGEX = /^\d{6}$/

export const ADDRESS_FIELD_HELPERS = {
  fullName: 'Enter the recipient name exactly as it should appear on the delivery address.',
  phone: 'Use a 10-digit Indian mobile number. Numbers only, no +91 or spaces.',
  line1: 'Add house number, street, area, or locality so the delivery is easy to find.',
  city: 'Enter the city, town, or village name.',
  state: 'Select your state or union territory from the list.',
  pincode: 'Enter the 6-digit PIN code for this delivery address.',
}

export function createEmptyAddressForm() {
  return {
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  }
}

export function sanitizeAddressField(field, value) {
  if (field === 'phone' || field === 'pincode') {
    return String(value).replace(/\D/g, '')
  }

  return value
}

export function normalizeAddressForm(form) {
  return {
    fullName: String(form.fullName ?? '').trim(),
    phone: String(form.phone ?? '').replace(/\D/g, ''),
    line1: String(form.line1 ?? '').trim(),
    line2: String(form.line2 ?? '').trim(),
    city: String(form.city ?? '').trim(),
    state: String(form.state ?? '').trim(),
    pincode: String(form.pincode ?? '').replace(/\D/g, ''),
    isDefault: Boolean(form.isDefault),
  }
}

export function validateAddressForm(form) {
  const address = normalizeAddressForm(form)

  if (!address.fullName) {
    return 'Please enter the full name for this address.'
  }
  if (address.fullName.length > 120) {
    return 'Full name must be 120 characters or fewer.'
  }
  if (!INDIAN_PHONE_REGEX.test(address.phone)) {
    return 'Phone number must be a valid 10-digit Indian mobile number.'
  }
  if (!address.line1) {
    return 'Please enter address line 1.'
  }
  if (address.line1.length > 200) {
    return 'Address line 1 must be 200 characters or fewer.'
  }
  if (address.line2.length > 200) {
    return 'Address line 2 must be 200 characters or fewer.'
  }
  if (!address.city) {
    return 'Please enter the city.'
  }
  if (address.city.length > 80) {
    return 'City must be 80 characters or fewer.'
  }
  if (!INDIA_STATE_SET.has(address.state)) {
    return 'Please select a valid Indian state or union territory.'
  }
  if (!INDIAN_PIN_REGEX.test(address.pincode)) {
    return 'PIN code must be exactly 6 digits.'
  }

  return null
}
