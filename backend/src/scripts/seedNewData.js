import { config } from 'dotenv'
config()

import mongoose from 'mongoose'
import { Category } from '../models/Category.js'
import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { Order } from '../models/Order.js'
import { Address } from '../models/Address.js'

const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/saree'

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB...')
    await mongoose.connect(mongoUrl)
    console.log('✓ Connected to MongoDB')

    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      User.deleteMany({}),
      Order.deleteMany({}),
      Address.deleteMany({}),
    ])
    console.log('✓ Data cleared')

    // Create Categories
    console.log('📂 Creating categories...')
    const categories = await Category.create([
      {
        name: 'Banarasi Sarees',
        slug: 'banarasi-sarees',
        description:
          'Traditional Banarasi silk sarees with intricate zari work and designs',
      },
      {
        name: 'Cotton Sarees',
        slug: 'cotton-sarees',
        description: 'Comfortable and breathable cotton sarees for everyday wear',
      },
      {
        name: 'Silk Sarees',
        slug: 'silk-sarees',
        description: 'Luxurious silk sarees with elegant patterns and colors',
      },
      {
        name: 'Printed Sarees',
        slug: 'printed-sarees',
        description: 'Contemporary printed sarees with modern designs',
      },
      {
        name: 'Designer Sarees',
        slug: 'designer-sarees',
        description: 'Exclusive designer sarees for special occasions',
      },
    ])
    console.log(`✓ Created ${categories.length} categories`)

    // Create Products with TagIDs
    console.log('👗 Creating products...')
    const products = await Product.create([
      // Banarasi Sarees
      {
        name: 'Emerald Green Banarasi',
        slug: 'emerald-green-banarasi',
        tagId: 'BAR-001-EMG',
        description:
          'Beautiful emerald green Banarasi saree with traditional gold zari work',
        price: 4999,
        category: categories[0]._id,
        images: [
          'https://via.placeholder.com/400?text=Emerald+Banarasi',
        ],
        stock: 8,
        color: 'Emerald Green',
        material: 'Silk Banarasi',
        size: '5.5m',
        sku: 'BAR-001-EMG-SLK',
      },
      {
        name: 'Ruby Red Banarasi Silk',
        slug: 'ruby-red-banarasi-silk',
        tagId: 'BAR-002-RRD',
        description:
          'Stunning ruby red Banarasi with intricate paisley zari patterns',
        price: 5499,
        category: categories[0]._id,
        images: [
          'https://via.placeholder.com/400?text=Ruby+Banarasi',
        ],
        stock: 5,
        color: 'Ruby Red',
        material: 'Pure Silk Banarasi',
        size: '5.5m',
        sku: 'BAR-002-RRD-PSL',
      },
      {
        name: 'Gold Zari Banarasi',
        slug: 'gold-zari-banarasi',
        tagId: 'BAR-003-GLD',
        description: 'Classic gold Banarasi saree with heavy zari embellishments',
        price: 6999,
        category: categories[0]._id,
        images: [
          'https://via.placeholder.com/400?text=Gold+Banarasi',
        ],
        stock: 6,
        color: 'Gold',
        material: 'Silk Banarasi',
        size: '5.5m',
        sku: 'BAR-003-GLD-ZRI',
      },

      // Cotton Sarees
      {
        name: 'Blue Striped Cotton',
        slug: 'blue-striped-cotton',
        tagId: 'COT-001-BLU',
        description: 'Lightweight blue striped cotton saree perfect for summer',
        price: 1299,
        category: categories[1]._id,
        images: [
          'https://via.placeholder.com/400?text=Blue+Cotton',
        ],
        stock: 15,
        color: 'Blue',
        material: 'Cotton',
        size: '5.5m',
        sku: 'COT-001-BLU-CTN',
      },
      {
        name: 'White Cotton with Red Border',
        slug: 'white-cotton-red-border',
        tagId: 'COT-002-WHT',
        description: 'Classic white cotton saree with vibrant red border design',
        price: 1599,
        category: categories[1]._id,
        images: [
          'https://via.placeholder.com/400?text=White+Cotton',
        ],
        stock: 12,
        color: 'White',
        material: 'Cotton',
        size: '5.5m',
        sku: 'COT-002-WHT-RDB',
      },
      {
        name: 'Cream Checks Cotton',
        slug: 'cream-checks-cotton',
        tagId: 'COT-003-CRM',
        description: 'Elegant cream colored cotton with traditional check pattern',
        price: 1499,
        category: categories[1]._id,
        images: [
          'https://via.placeholder.com/400?text=Cream+Cotton',
        ],
        stock: 10,
        color: 'Cream',
        material: 'Cotton',
        size: '5.5m',
        sku: 'COT-003-CRM-CHK',
      },

      // Silk Sarees
      {
        name: 'Purple Silk with Gold Flowers',
        slug: 'purple-silk-gold-flowers',
        tagId: 'SLK-001-PUR',
        description: 'Luxurious purple silk saree with golden floral embroidery',
        price: 3499,
        category: categories[2]._id,
        images: [
          'https://via.placeholder.com/400?text=Purple+Silk',
        ],
        stock: 7,
        color: 'Purple',
        material: 'Pure Silk',
        size: '5.5m',
        sku: 'SLK-001-PUR-SLK',
      },
      {
        name: 'Maroon Silk Saree',
        slug: 'maroon-silk-saree',
        tagId: 'SLK-002-MRN',
        description: 'Rich maroon silk saree with subtle texture and sheen',
        price: 3299,
        category: categories[2]._id,
        images: [
          'https://via.placeholder.com/400?text=Maroon+Silk',
        ],
        stock: 9,
        color: 'Maroon',
        material: 'Pure Silk',
        size: '5.5m',
        sku: 'SLK-002-MRN-TXT',
      },
      {
        name: 'Navy Blue Silk',
        slug: 'navy-blue-silk',
        tagId: 'SLK-003-NAV',
        description: 'Deep navy blue silk saree with elegant drape',
        price: 3699,
        category: categories[2]._id,
        images: [
          'https://via.placeholder.com/400?text=Navy+Silk',
        ],
        stock: 8,
        color: 'Navy Blue',
        material: 'Pure Silk',
        size: '5.5m',
        sku: 'SLK-003-NAV-DRP',
      },

      // Printed Sarees
      {
        name: 'Floral Print Casual',
        slug: 'floral-print-casual',
        tagId: 'PRT-001-FLR',
        description: 'Vibrant floral printed saree for casual everyday wear',
        price: 1799,
        category: categories[3]._id,
        images: [
          'https://via.placeholder.com/400?text=Floral+Print',
        ],
        stock: 20,
        color: 'Multi-color',
        material: 'Cotton Blend',
        size: '5.5m',
        sku: 'PRT-001-FLR-CBL',
      },
      {
        name: 'Geometric Pattern Saree',
        slug: 'geometric-pattern-saree',
        tagId: 'PRT-002-GEO',
        description: 'Modern geometric pattern saree with contemporary look',
        price: 2099,
        category: categories[3]._id,
        images: [
          'https://via.placeholder.com/400?text=Geometric',
        ],
        stock: 14,
        color: 'Multi-color',
        material: 'Cotton Blend',
        size: '5.5m',
        sku: 'PRT-002-GEO-MDN',
      },
      {
        name: 'Abstract Art Printed',
        slug: 'abstract-art-printed',
        tagId: 'PRT-003-ABS',
        description: 'Artistic abstract printed saree with creative design',
        price: 2299,
        category: categories[3]._id,
        images: [
          'https://via.placeholder.com/400?text=Abstract',
        ],
        stock: 11,
        color: 'Multi-color',
        material: 'Cotton Blend',
        size: '5.5m',
        sku: 'PRT-003-ABS-ART',
      },

      // Designer Sarees
      {
        name: 'Designer Festive Gold',
        slug: 'designer-festive-gold',
        tagId: 'DES-001-FES',
        description: 'Exclusive designer saree with golden embellishments for festive occasions',
        price: 7999,
        category: categories[4]._id,
        images: [
          'https://via.placeholder.com/400?text=Designer+Gold',
        ],
        stock: 4,
        color: 'Gold',
        material: 'Silk with Embroidery',
        size: '5.5m',
        sku: 'DES-001-FES-EMB',
      },
      {
        name: 'Bridal Silver Elegance',
        slug: 'bridal-silver-elegance',
        tagId: 'DES-002-BRD',
        description: 'Stunning bridal saree with silver and crystal embellishments',
        price: 9999,
        category: categories[4]._id,
        images: [
          'https://via.placeholder.com/400?text=Bridal+Silver',
        ],
        stock: 3,
        color: 'Silver',
        material: 'Pure Silk with Stones',
        size: '5.5m',
        sku: 'DES-002-BRD-STN',
      },
      {
        name: 'Party Wear Emerald',
        slug: 'party-wear-emerald',
        tagId: 'DES-003-PTY',
        description: 'Elegant party wear emerald saree with sophisticated design',
        price: 8499,
        category: categories[4]._id,
        images: [
          'https://via.placeholder.com/400?text=Party+Emerald',
        ],
        stock: 5,
        color: 'Emerald',
        material: 'Silk with Embroidery',
        size: '5.5m',
        sku: 'DES-003-PTY-SGN',
      },
    ])
    console.log(`✓ Created ${products.length} products`)

    console.log('\n✅ Database seeding completed successfully!')
    console.log(`   - Categories: ${categories.length}`)
    console.log(`   - Products: ${products.length}`)
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

seed()
