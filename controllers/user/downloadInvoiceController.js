const PDFDocument = require('pdfkit');
const Order = require('../../models/orderSchema');

const generateInvoicePDF = async (order) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  // Calculate totals based on your data structure
  const subtotal = order.totalAmount || 0;
  const originalTotal = order.orderedAmount || 0;
  const totalDiscount = order.totalDiscount || 0;
  const couponDiscount = order.couponDiscount || 0;
  const shippingFee = order.shippingFee || 0;
  const finalAmount = order.payableAmount || 0;

  // Header
  doc.fontSize(20).text('INVOICE', { align: 'right' }).moveDown();
  
  // Company Details (Left Side)
  doc.fontSize(10)
    .text('LaptopHub', 50, 100)
    .text('Company Address', 50, 115)
    .text('GSTIN: XXXXXXXXXXXXX', 50, 130);

  // Order Details (Right Side) - Adjusted positioning and width
  const rightColumnX = 300; // Moved left to prevent overflow
  doc.text('Invoice Date: ' + new Date(order.placedAt).toLocaleDateString(), rightColumnX, 100)
    .text('Invoice No: ' + (order.orderId || 'N/A'), rightColumnX, 115)
    .text('Order Status: ' + order.orderStatus, rightColumnX, 130)
    .text('Payment Method: ' + order.paymentMethod, rightColumnX, 145);

  // Customer Details
  doc.text('Billing To:', 50, 180)
    .text(order.shippingAddress?.name || 'N/A', 50, 195)
    .text(`${order.shippingAddress?.landmark || ''}`, 50, 210)
    .text(`${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}`, 50, 225)
    .text(`PIN: ${order.shippingAddress?.pincode || ''}`, 50, 240)
    .text(`Phone: ${order.shippingAddress?.phone || ''}`, 50, 255)
    .text(`Email: ${order.shippingAddress?.email || ''}`, 50, 270);

  // Invoice Table Header
  const invoiceTableTop = 310;
  doc.font('Helvetica-Bold')
    .text('Product', 50, invoiceTableTop)
    .text('Quantity', 250, invoiceTableTop)
    .text('Price', 350, invoiceTableTop)
    .text('Total', 450, invoiceTableTop);

  let position = invoiceTableTop + 20;
  doc.font('Helvetica');

  // Item Details
  (order.orderItems || []).forEach(item => {
    const price = item.price || 0;
    const quantity = item.quantity || 0;
    const discount = item.discount || 0;
    const discountAmount = (price * (discount / 100));
    const discountedPrice = price - discountAmount;
    const lineTotal = quantity * price;

    // Product details
    doc.text(item.productName || 'Unknown Product', 50, position)
      .text(quantity.toString(), 250, position);

    // Price with discount
    if (discount > 0) {
      doc.text(`₹${price.toFixed(2)}`, 350, position)
        .font('Helvetica')
        .fillColor('gray')
        .text(`(Original: ₹${(Math.floor((price*100)/(100-discount))).toFixed(2)})`, 350, position + 10, { size: 8 })
        .fillColor('black');
    } else {
      doc.text(`₹${price.toFixed(2)}`, 350, position);
    }

    doc.text(`₹${lineTotal.toFixed(2)}`, 450, position);
    position += discount > 0 ? 25 : 20;
  });

  // Totals Section
  position += 20;

  // Original Amount
  doc.text('Original Amount', 350, position)
    .text(`₹${(originalTotal+totalDiscount-shippingFee).toFixed(2)}`, 450, position);

  // Product Discount
  if (totalDiscount > 0) {
    position += 20;
    doc.text('Product Discount', 350, position)
      .text(`-₹${totalDiscount.toFixed(2)}`, 450, position);
  }

  // Coupon Details (only if coupon was applied)
  if (couponDiscount > 0) {
    position += 20;
    doc.text('Coupon Applied', 350, position)
      .text(`-₹${couponDiscount.toFixed(2)}`, 450, position);
  }

  // Shipping Fee
  if (shippingFee > 0) {
    position += 20;
    doc.text('Shipping Fee', 350, position)
      .text(`+₹${shippingFee.toFixed(2)}`, 450, position);
  }

  // Final Amount
  position += 20;
  doc.font('Helvetica-Bold')
    .text('Final Amount', 350, position)
    .text(`₹${originalTotal.toFixed(2)}`, 450, position);

  // Footer with Terms & Conditions
  const footerPosition = position + 40;
  doc.fontSize(8)
    .text('Terms & Conditions:', 50, footerPosition)
    .text('1. All prices are inclusive of GST', 50, footerPosition + 15)
    .text('2. This is a computer generated invoice', 50, footerPosition + 30);

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);
  });
};

module.exports = {
  generateInvoicePDF,
  downloadInvoice: async (req, res) => {
    try {
      console.log('Order ID Requested:', req.params.orderId);

      const order = await Order.findById(req.params.orderId)
        .populate('user')
        .populate('orderItems.product');

      if (!order) {
        console.log('No Order Found for ID:', req.params.orderId);
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.orderStatus !== 'Delivered') {
        return res.status(403).json({
          error: 'Invoice download not available',
          message: 'Invoice can only be downloaded for delivered orders'
        });
      }

      const pdfBuffer = await generateInvoicePDF(order);
      console.log('PDF Buffer Generated, Size:', pdfBuffer.length);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderId}.pdf`);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Full Invoice Download Error:', error);
      res.status(500).json({
        error: 'Invoice generation failed',
        details: error.message
      });
    }
  }
};