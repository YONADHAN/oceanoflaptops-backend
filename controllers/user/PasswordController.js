const User = require("../../models/userSchema");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

const forgotPasswordController = {
  // Step 1: Request password reset
  requestPasswordReset: async (req, res) => {
    try {
      const { userId, email } = req.body;

      // Find user by ID
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Verify email matches user's registered email
      if (user.email !== email) {
        return res.status(400).json({
          success: false,
          message: "Email doesn't match your registered email",
        });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Update user with verification token
      user.resetPasswordToken = verificationToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Create the reset password link
      const resetPasswordLink = `http://localhost:5173/user/features/account/security/reset-password?token=${verificationToken}`;

      // Send verification email
      await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "Password Reset Request",
        html: `
          <h1>Password Reset Request</h1>
          <p>We received a request to reset your password.</p>
          <p>Click the Button below to reset your password:</p>
          
          <a href="${resetPasswordLink}" 
          style="
            display: inline-block;
            padding: 10px 20px;
            font-size: 16px;
            color: #ffffff;
            background-color: #007bff;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 10px;
          " 
       target="_blank">
      Reset Password
    </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      res.status(200).json({
        success: true,
        message: "A verification email has been sent. Please check your inbox.",
      });
    } catch (error) {
      console.error("Error in requestPasswordReset:", error);
      res
        .status(500)
        .json({ success: false, message: "Error sending verification email" });
    }
  },

  // Step 2: Verify email token
  verifyEmailToken: async (req, res) => {
    try {
      const { token } = req.body;

      // Find user by token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }, // Token not expired
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid or expired token" });
      }

      res
        .status(200)
        .json({ success: true, message: "Token verified successfully" });
    } catch (error) {
      console.error("Error in verifyEmailToken:", error);
      res
        .status(500)
        .json({ success: false, message: "Error verifying token" });
    }
  },

  // Step 3: Reset password
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      // Find user by token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }, // Token not expired
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid or expired token" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update user password and clear reset tokens
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Send confirmation email
      await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: user.email,
        subject: "Password Reset Successful",
        html: `
          <h1>Password Reset Successful</h1>
          <p>Your password has been successfully reset.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
        `,
      });

      res
        .status(200)
        .json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Error in resetPassword:", error);
      res
        .status(500)
        .json({ success: false, message: "Error resetting password" });
    }
  },

  passwordChange: async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    try {
      // Fetch user by ID
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if old password matches
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update the user's password
      user.password = hashedPassword;
      await user.save();

      // Respond with success
      res.status(200).json({ message: "Password changed successfully" });

      // Send confirmation email
      try {
        await transporter.sendMail({
          from: process.env.NODEMAILER_EMAIL,
          to: user.email,
          subject: "Password Reset Successful",
          html: `
          <h1>Password Reset Successful</h1>
          <p>Your password has been successfully reset.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
        `,
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Optional: Notify the user in the response about email failure.
      }
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
  requestPasswordResetFromSignin: async (req, res) => {
    try {
      console.log("Resetting password from signup...");
      // Implement the logic for this function
      const { email } = req.body;
      const lowercaseEmail = email.toLowerCase();
      // Find user by ID
      const user = await User.findOne({ email: lowercaseEmail });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // // Verify email matches user's registered email
      // if (user.email !== email) {
      //   return res
      //     .status(400)
      //     .json({
      //       success: false,
      //       message: "Email doesn't match your registered email",
      //     });
      // }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Update user with verification token
      user.resetPasswordToken = verificationToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Create the reset password link
      const resetPasswordLink = `http://localhost:5173/user/reset_password_signin?token=${verificationToken}`;

      // Send verification email
      // await transporter.sendMail({
      //   from: process.env.NODEMAILER_EMAIL,
      //   to: email,
      //   subject: "Password Reset Request",
      //   html: `
      //     <h1>Password Reset Request</h1>
      //     <p>We received a request to reset your password.</p>
      //     <p>Click the link below to reset your password:</p>
      //     <a href="${resetPasswordLink}" target="_blank">${resetPasswordLink}</a>
      //     <p>This link will expire in 1 hour.</p>
      //     <p>If you didn't request this, please ignore this email.</p>
      //   `,
      // });

      await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "🔒 Password Reset Request",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 50px auto;
                background: #ffffff;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                color: #333;
                margin-bottom: 20px;
              }
              .content {
                font-size: 16px;
                color: #555;
                line-height: 1.6;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                width: 200px;
                margin: 20px 0;
                padding: 12px 20px;
                text-align: center;
                background-color: #007bff;
                color: #ffffff;
                text-decoration: none;
                font-size: 16px;
                border-radius: 5px;
                transition: background-color 0.3s ease;
              }
            
              .footer {
                margin-top: 30px;
                font-size: 14px;
                text-align: center;
                color: #777;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="header">🔒 Password Reset Request</h2>
              <p class="content">
                We received a request to reset your password. If this was you, click the button below to reset it:
              </p>
              <div style="text-align: center;">
                <a href="${resetPasswordLink}" class="button" target="_blank" rel="noopener noreferrer">Reset Password</a>
              </div>
              <p class="content">
                This link will expire in <strong>1 hour</strong>. If you did not request this change, please ignore this email or contact our support team.
              </p>
              <p class="footer">
                Need help? Contact us at <a href="mailto:yonadhanmm0@example.com">yonadhanmm0@example.com</a>
              </p>
            </div>
          </body>
          </html>
        `,
      });
      

      res.status(200).json({
        success: true,
        message: "A verification email has been sent. Please check your inbox.",
      });
    } catch (error) {
      console.error("Error in requestPasswordResetFromSignup:", error);
      res
        .status(500)
        .json({ success: false, message: "Error sending verification email" });
    }
  },

  resetPasswordFromSignin: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      console.log("tokens are: ", token, "  new password is:", newPassword);
      // Find user by token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }, // Token not expired
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid or expired token" });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update user password and clear reset tokens
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Send confirmation email
      await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: user.email,
        subject: "Password Reset Successful",
        html: `
            <h1>Password Reset Successful</h1>
            <p>Your password has been successfully reset.</p>
            <p>If you didn't make this change, please contact our support team immediately.</p>
          `,
      });

      res
        .status(200)
        .json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Error in resetPasswordFromSignup:", error);
      res
        .status(500)
        .json({ success: false, message: "Error resetting password" });
    }
  },
};

module.exports = forgotPasswordController;
