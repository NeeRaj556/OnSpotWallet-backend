const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const prisma = require("../utils/prisma");
const generateToken = require("../utils/jwt");

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
        position : user.position || null, // Ensure position is nullable
        createdAt: user.createdAt,
        profilePicture: user.profilePicture || null,
        address: user.address || null,
        phoneNumber: user.phoneNumber || null,
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
  // req.user was set in the auth middleware
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
  getUsers, // Add this new export
};
