const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Static users to seed
  const users = [
    {
      name: "Admin User",
      email: "admin@example.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
      address: "123 Admin St, Admin City, AD 12345",
      phone: "123-456-7890",
      profilePicture: null,
    },
    {
      name: "Staff User",
      email: "staff@example.com",
      password: await bcrypt.hash("staff123", 10),
      role: "staff",
      address: "456 Staff Rd, Staff City, ST 67890",
      phone: "987-654-3210",
      profilePicture: null,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        address: user.address,
        phone: user.phone,
        profilePicture: user.profilePicture,
      },
    });
  }

  // Seed attendance times if not present
  const attendanceTimes = await prisma.attendanceTimes.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      checkInTime: "09:00:00",
      checkOutTime: "17:00:00",
    },
  });

  // Seed API settings
  const apiSettings = [
    {
      key: "API_SECURITY_ENABLED",
      value: process.env.NODE_ENV === "production" ? "true" : "false",
      description: "Enable or disable API signature verification",
      isEditable: true,
    },
    {
      key: "ALLOWED_BOOTSTRAP_TOKENS",
      value: "react,flutter,web,mobile",
      description: "Comma-separated list of valid bootstrap tokens",
      isEditable: true,
    },
    {
      key: "CORS_DOMAINS",
      value: process.env.FRONTEND_URL || "*",
      description: "Allowed CORS domains (comma-separated, or * for all)",
      isEditable: true,
    },
    {
      key: "SIGNATURE_TIME_WINDOW",
      value: "30000",
      description: "Time window in milliseconds for signature validity",
      isEditable: true,
    },
  ];

  for (const setting of apiSettings) {
    await prisma.apiSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        isEditable: setting.isEditable,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
