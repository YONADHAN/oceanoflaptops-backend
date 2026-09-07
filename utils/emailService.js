const nodemailer = require("nodemailer");

const sendOrderConfirmationEmail = async ({ email, name, orderId, items, totalAmount }) => {
  try {
    const pass = (process.env.NODEMAILER_PASSWORD || "").replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: pass,
      },
    });

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.productName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #4F46E5; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Confirmed!</h1>
            <p style="color: #e0e7ff; margin-top: 10px; font-size: 16px;">Thank you for shopping with Ocean Of Laptops</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">We're excited to let you know that we've received your order and are getting it ready for shipment.</p>
            
            <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 25px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Order ID</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; color: #111827; font-weight: bold; font-family: monospace;">${orderId}</p>
            </div>
            
            <h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-top: 30px;">Order Summary</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr>
                  <th style="text-align: left; padding: 10px 12px; background-color: #f8fafc; color: #64748b; font-size: 14px;">Item</th>
                  <th style="text-align: center; padding: 10px 12px; background-color: #f8fafc; color: #64748b; font-size: 14px;">Qty</th>
                  <th style="text-align: right; padding: 10px 12px; background-color: #f8fafc; color: #64748b; font-size: 14px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="text-align: right; padding: 15px 12px; font-weight: bold; color: #333;">Total Amount:</td>
                  <td style="text-align: right; padding: 15px 12px; font-weight: bold; color: #4F46E5; font-size: 18px;">₹${totalAmount}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="margin-top: 40px; text-align: center;">
              <p style="font-size: 14px; color: #6b7280;">If you have any questions about your order, please contact our support team.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: '"Ocean Of Laptops" <' + process.env.NODEMAILER_EMAIL + '>',
      to: email,
      subject: "Your Order is Confirmed! 🚀 - " + orderId,
      html: htmlContent,
    });
    console.log(` Order confirmation email successfully sent to: ${email}`);
  } catch (error) {
    console.error("Email service error (ignored):", error);
  }
};

const sendOrderFailureEmail = async ({ email, name, orderId, totalAmount }) => {
  try {
    const pass = (process.env.NODEMAILER_PASSWORD || "").replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: pass,
      },
    });

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #EF4444; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Failed</h1>
            <p style="color: #fee2e2; margin-top: 10px; font-size: 16px;">Action Required for Ocean Of Laptops</p>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">We noticed that the payment for your recent order attempt was unsuccessful. Your account has not been charged.</p>
            
            <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 25px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Order ID</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; color: #111827; font-weight: bold; font-family: monospace;">${orderId}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; color: #333;">Attempted Amount: <strong>₹${totalAmount}</strong></p>
            </div>
            
            <div style="margin-top: 40px; text-align: center;">
              <p style="font-size: 14px; color: #6b7280;">You can try placing the order again from your cart or contact our support team if you need assistance.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: '"Ocean Of Laptops" <' + process.env.NODEMAILER_EMAIL + '>',
      to: email,
      subject: "Action Required: Payment Failed - " + orderId,
      html: htmlContent,
    });
    console.log(` Order failure email successfully sent to: ${email}`);
  } catch (error) {
    console.error("Email service error (ignored):", error);
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderFailureEmail
};
