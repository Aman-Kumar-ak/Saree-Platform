import { LegalPage } from '../components/LegalPage.jsx'

const sections = [
  {
    heading: 'Information We Collect',
    points: [
      'We collect only the details required to process your orders, including name, phone number, address, and order history.',
      'For login, phone verification is handled through Firebase authentication.',
    ],
  },
  {
    heading: 'How We Use Data',
    points: [
      'Your data is used to confirm orders, coordinate delivery, provide support, and improve store operations.',
      'We do not sell your personal data to third parties.',
    ],
  },
  {
    heading: 'Data Security',
    points: [
      'Sensitive secrets and service credentials are stored in secure server environment variables.',
      'Only authorized admin users can access order-management tools.',
    ],
  },
  {
    heading: 'Contact',
    points: [
      'If you need corrections or deletion requests, contact the store support team using the contact details provided by the business.',
    ],
  },
]

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what customer data we use, why we use it, and how we keep it protected."
      sections={sections}
    />
  )
}
