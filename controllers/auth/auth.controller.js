const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const prisma = require("../../utils/prisma");
const generateToken = require("../../utils/jwt");
const sendEmail = require("../../utils/sendEmail");

// Helper to generate 4-6 digit OTP (use 6 digits)
function generateOtp(digits = 6) {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please add all fields");
  }

  // Check if user exists
  const userExists = await prisma.user.findUnique({
    where: { email },
  });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user (isVerified defaults to false)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      // optional fields if provided
      phone: req.body.phone || null,
      address: req.body.address || null,
      isVerified: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid user data");
  }

  // Generate OTP and save it with expiry (expiryAt = now + 5 minutes)
  const otpValue = generateOtp(6);
  const expiryAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MIN || '5') * 60 * 1000));
  const hashedOtp = await bcrypt.hash(otpValue.toString(), 10);

  await prisma.otp.upsert({
    where: { userId: user.id },
    update: { pin: hashedOtp, expiryAt, lastSentAt: new Date(), resendCount: { increment: 1 } },
    create: { pin: hashedOtp, expiryAt, userId: user.id, lastSentAt: new Date(), resendCount: 0 },
  });

  // Send OTP email (best-effort)
  try {
    const subject = "Your OnSpotWallet verification code";
    const text = `Hello ${user.name},\n\nYour verification code is ${otpValue}. It will expire in ${process.env.OTP_EXPIRY_MIN || '5'} minutes.\n\nIf you did not request this, please ignore.`;
    await sendEmail({ to: user.email, subject, text });
  } catch (err) {
    // Log and continue - user created and OTP saved
    console.error("Failed to send OTP email:", err.message || err);
  }

  res.status(201).json({
    message: "User registered successfully. Please verify the OTP sent to your email.",
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

const UpdatePin = asyncHandler(async (req, res) => {
  const { pin, oldPin, newPin, confirmNewPin } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    res.status(401);
    throw new Error("Invalid user");
  }

  // Helper: validate 4-digit numeric PIN
  const validPin = (p) => typeof p === "string" && /^\d{4}$/.test(p);

   if (user.pin == null) {
    const providedPin = pin || newPin;
    if (!validPin(providedPin)) {
      res.status(400);
      throw new Error("Please provide a valid 4-digit PIN to set");
    }

    const hashedPin = await bcrypt.hash(providedPin, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { pin: hashedPin },
    });

    return res.status(201).json({ message: "PIN set successfully" });
  }

  // Otherwise require oldPin, newPin and confirmNewPin to update
  if (!validPin(oldPin) || !validPin(newPin) || !validPin(confirmNewPin)) {
    res.status(400);
    throw new Error("Old, new and confirm PIN must be 4-digit numbers");
  }

  if (newPin !== confirmNewPin) {
    res.status(400);
    throw new Error("New PIN and confirm PIN do not match");
  }

  const isMatch = await bcrypt.compare(oldPin, user.pin);
  if (!isMatch) {
    res.status(401);
    throw new Error("Old PIN is incorrect");
  }

  const hashedNewPin = await bcrypt.hash(newPin, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { pin: hashedNewPin },
  });

  res.status(200).json({ message: "PIN updated successfully" });
});

const updatePreferredOffPrice = asyncHandler(async (req, res) => {
  const { preferredOfflineBalance } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    res.status(401);
    throw new Error("Invalid user");
  }

  if (typeof preferredOfflineBalance !== "number" || preferredOfflineBalance < 0) {
    res.status(400);
    throw new Error("Please provide a valid preferred offline balance");
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { preferredOfflineBalance },
  });

  res.status(200).json({ message: "Preferred offline balance updated successfully" });
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password, latitude, longitude } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  // Check for user email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  // Check if password matches
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  // If user is not verified, generate/send OTP and prevent token issuance
  if (!user.isVerified) {
    const otpValue = generateOtp(6);
    const expiryAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MIN || '5') * 60 * 1000));

    await prisma.otp.upsert({
      where: { userId: user.id },
      update: { pin: otpValue, expiryAt },
      create: { pin: otpValue, expiryAt, userId: user.id },
    });

    try {
      const subject = 'OnSpotWallet verification code';
      const text = `Hello ${user.name},\n\nYour verification code is ${otpValue}. It will expire in ${process.env.OTP_EXPIRY_MIN || '5'} minutes.`;
      await sendEmail({ to: user.email, subject, text });
    } catch (err) {
      console.error('Failed to send OTP email during login:', err.message || err);
    }

    return res.status(403).json({
      message: 'Account not verified. A verification code has been sent to your email. Please verify to continue.'
    });
  }


  res.status(200).json({
    message: "User logged in successfully",
    data: {
      id: user.id,
      createdAt: user.createdAt,
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance : user.balance || 0, // Ensure position is nullable
        currency : user.currency || null, // Ensure position is nullable
        createdAt: user.createdAt,
        profilePicture: user.profilePicture || null,
        address: user.address || null,
        phone: user.phone || null,
      },
      //   loginLocation,
      token: generateToken(user.id),
    },
  });
});

// @desc Verify OTP sent to user's email
// @route POST /api/auth/verify
// @access Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error("Please provide email and otp");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const record = await prisma.otp.findUnique({ where: { userId: user.id } });
  if (!record) {
    res.status(400);
    throw new Error("No OTP found for this user or it has expired");
  }

  // Check expiry first
  if (new Date(record.expiryAt) < new Date()) {
    // delete expired otp
    await prisma.otp.delete({ where: { userId: user.id } });
    res.status(400);
    throw new Error("OTP has expired");
  }

  // Enforce max attempts
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '5');
  if (record.attempts >= maxAttempts) {
    await prisma.otp.delete({ where: { userId: user.id } });
    res.status(429);
    throw new Error("Maximum OTP verification attempts exceeded. Request a new code.");
  }

  const isValid = await bcrypt.compare(otp.toString(), record.pin);
  // update attempt count and lastAttemptAt
  await prisma.otp.update({ where: { userId: user.id }, data: { attempts: { increment: 1 }, lastAttemptAt: new Date() } });

  if (!isValid) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  // Mark user as verified and delete otp record
  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
  await prisma.otp.delete({ where: { userId: user.id } });

  res.status(200).json({ message: "Email verified successfully" });
});

// @desc Resend OTP for verification
// @route POST /api/auth/resend-otp
// @access Public
const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Please provide an email');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.isVerified) {
    return res.status(200).json({ message: 'User already verified' });
  }

  const otpValue = generateOtp(6);
  const expiryAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MIN || '5') * 60 * 1000));

  // Enforce resend cooldown
  const cooldownSec = parseInt(process.env.OTP_RESEND_COOLDOWN_SEC || '60');
  const existing = await prisma.otp.findUnique({ where: { userId: user.id } });
  if (existing && existing.lastSentAt) {
    const lastSent = new Date(existing.lastSentAt);
    if (Date.now() - lastSent.getTime() < cooldownSec * 1000) {
      const wait = Math.ceil((cooldownSec * 1000 - (Date.now() - lastSent.getTime())) / 1000);
      res.status(429);
      throw new Error(`Please wait ${wait} seconds before requesting a new code`);
    }
  }

  const hashed = await bcrypt.hash(otpValue.toString(), 10);

  await prisma.otp.upsert({
    where: { userId: user.id },
    update: { pin: hashed, expiryAt, lastSentAt: new Date(), resendCount: { increment: 1 } },
    create: { pin: hashed, expiryAt, userId: user.id, lastSentAt: new Date(), resendCount: 0 },
  });

  try {
    const subject = 'Your OnSpotWallet verification code';
    const text = `Hello ${user.name},\n\nYour new verification code is ${otpValue}. It will expire in ${process.env.OTP_EXPIRY_MIN || '5'} minutes.`;
    await sendEmail({ to: user.email, subject, text });
  } catch (err) {
    console.error('Failed to send OTP email on resend:', err.message || err);
  }

  res.status(200).json({ message: 'Verification code sent' });
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
   res.status(200).json({
    message: "User profile",
    data: req.user,
  });
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await prisma.user.count();

    // Get users with order counts
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        address: true,
        phone: true,
        profilePicture: true,
        onlineBalance:true,
        offlineBalance:true,
        balance:true,
        currency:true,
        onlineLimit:true,
        offlineBalance:true,
        createdAt: true,
        _count: {
          select: {
            Order: true,
          },
        },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      message: "Users fetched successfully",
      data: users,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getUsers, 
  UpdatePin,
  updatePreferredOffPrice,
  verifyOtp,
  resendOtp,
};
