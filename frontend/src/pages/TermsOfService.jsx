import { LegalPage } from '../components/LegalPage.jsx'

const sections = [
  {
    heading: 'Order Acceptance',
    points: [
      'Placing an order means you confirm that delivery details are accurate and complete.',
      'The store may contact you for order confirmation before dispatch.',
    ],
  },
  {
    heading: 'Pricing and Availability',
    points: [
      'Product prices and stock can change without prior notice.',
      'If an item becomes unavailable after placing an order, the store will contact you with alternatives or cancellation options.',
    ],
  },
  {
    heading: 'Delivery Terms',
    points: [
      'Delivery timelines are estimates and may vary due to courier or regional conditions.',
      'Tracking information is shared once available.',
    ],
  },
  {
    heading: 'Account Use',
    points: [
      'Users are responsible for securing access to their phone number used for login.',
      'Misuse, fraud, or abusive activity can lead to order cancellation or account restrictions.',
    ],
  },
]

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern how customers use this store and how orders are processed."
      sections={sections}
    />
  )
}
