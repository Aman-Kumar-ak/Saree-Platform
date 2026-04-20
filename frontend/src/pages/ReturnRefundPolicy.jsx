import { LegalPage } from '../components/LegalPage.jsx'

const sections = [
  {
    heading: 'Return Eligibility',
    points: [
      'Return requests should be raised within the store-defined return window after delivery.',
      'Items must be unused, in original condition, and include tags/packaging where applicable.',
    ],
  },
  {
    heading: 'Non-Returnable Cases',
    points: [
      'Products damaged after use, missing original tags, or returned after the allowed window may be declined.',
      'Customized or altered products are generally non-returnable unless defective.',
    ],
  },
  {
    heading: 'Refund Process',
    points: [
      'Approved refunds are processed after quality checks and reflected according to the payment method.',
      'Cash-on-delivery refunds may be handled through bank transfer or agreed support process.',
    ],
  },
  {
    heading: 'How to Request',
    points: [
      'For returns or refunds, contact store support with your order number and issue details.',
    ],
  },
]

export default function ReturnRefundPolicy() {
  return (
    <LegalPage
      title="Return & Refund Policy"
      intro="This policy describes the conditions and process for returns, exchanges, and refunds."
      sections={sections}
    />
  )
}
