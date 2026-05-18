import mongoose from 'mongoose'
import { Router } from 'express'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { cartSnapshotFromUser, normalizeCartItems } from '../lib/cart.js'

const router = Router()

async function loadWishlistProducts(userId) {
  const user = await User.findById(userId)
    .select('wishlistItems')
    .lean()
    .exec()

  if (!user) {
    return null
  }

  const wishlistItems = Array.isArray(user.wishlistItems)
    ? user.wishlistItems
    : []
  const productIds = wishlistItems
    .map((item) => item?.productId)
    .filter(Boolean)

  if (productIds.length === 0) {
    return []
  }

  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  })
    .populate('category')
    .lean()
    .exec()

  const productMap = new Map(products.map((product) => [String(product._id), product]))
  return productIds
    .map((id) => productMap.get(String(id)))
    .filter(Boolean)
}

async function loadCartSnapshot(userId) {
  const user = await User.findById(userId)
    .select('cartItems cartUpdatedAt')
    .lean()
    .exec()

  if (!user) {
    return null
  }

  return cartSnapshotFromUser(user)
}

// Get all orders for logged-in user
router.get('/orders', requireAuth, async (req, res, next) => {
  try {
    const userId = req.authUser._id

    // Get user's order IDs
    const user = await User.findById(userId).select('orderIds').lean().exec()
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const orderIds = user.orderIds || []
    const orders = await Order.find({ _id: { $in: orderIds } })
      .sort({ createdAt: -1 })
      .select(
        'orderNumber items subtotal shipping totalAmount address paymentMethod paymentStatus orderStatus trackingId statusHistory createdAt updatedAt'
      )
      .lean()
      .exec()

    res.json({
      orders: orders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        totalAmount: order.totalAmount,
        address: order.address,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        trackingId: order.trackingId,
        statusHistory: order.statusHistory || [],
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/wishlist', requireAuth, async (req, res, next) => {
  try {
    const items = await loadWishlistProducts(req.authUser._id)
    if (items === null) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ items })
  } catch (err) {
    next(err)
  }
})

router.get('/cart', requireAuth, async (req, res, next) => {
  try {
    const cart = await loadCartSnapshot(req.authUser._id)
    if (cart === null) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(cart)
  } catch (err) {
    next(err)
  }
})

router.put('/cart', requireAuth, async (req, res, next) => {
  try {
    const items = normalizeCartItems(req.body?.items)
    const user = await User.findById(req.authUser._id).exec()
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    user.cartItems = items
    user.cartUpdatedAt = new Date()
    await user.save()

    const cart = cartSnapshotFromUser(user)
    res.json(cart)
  } catch (err) {
    next(err)
  }
})

router.post('/wishlist/:productId', requireAuth, async (req, res, next) => {
  try {
    const { productId } = req.params
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product id' })
    }

    const user = await User.findById(req.authUser._id).exec()
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    }).lean()
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const alreadySaved = (user.wishlistItems || []).some(
      (item) => String(item.productId) === String(productId)
    )
    if (!alreadySaved) {
      user.wishlistItems.push({
        productId,
        addedAt: new Date(),
      })
      await user.save()
    }

    const items = await loadWishlistProducts(req.authUser._id)
    res.json({ items })
  } catch (err) {
    next(err)
  }
})

router.delete('/wishlist/:productId', requireAuth, async (req, res, next) => {
  try {
    const { productId } = req.params
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product id' })
    }

    const user = await User.findById(req.authUser._id).exec()
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    user.wishlistItems = (user.wishlistItems || []).filter(
      (item) => String(item.productId) !== String(productId)
    )
    await user.save()

    const items = await loadWishlistProducts(req.authUser._id)
    res.json({ items })
  } catch (err) {
    next(err)
  }
})

export const userRouter = router
