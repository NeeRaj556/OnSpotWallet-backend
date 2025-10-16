const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const prisma = require("../../utils/prisma");
const generateToken = require("../../utils/jwt");

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

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone:phone,
      address:address,
     },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (user) {
    res.status(201).json({
      message: "User registered successfully",
      data: {
        ...user,
        token: generateToken(user.id),
      },
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
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
};
