const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Static users to seed
  const users = [
    {
      name: "Sangram Thapa",
      email: "sangram@gmail.com",
      role:"user",
      password: await bcrypt.hash("sangram12345", 10),
      address: "Panauti",
      phone: "9800000000",
      profilePicture: null,
      balance: 1000,
      currency: "$",
    },
    {
      name: "Mohan Krishna",
      email: "mohan@example.com",
      role:"user",
      password: await bcrypt.hash("mohankrishna123", 10),
       address: "Bhakundebesi",
      phone: "9812345678",
      profilePicture: null,
      balance: 1000,
      currency: "$",
    },
    {
      name: "NeeRaj",
      email: "neeraj@gmail.com",
      role:"user",
      password: await bcrypt.hash("neeraj123", 10),
       address: "Dhapakhel",
      phone: "9849541785",
      profilePicture: null,
      balance: 1000,
      currency: "$",
    },
    {
      name: "onSpotWallet",
      email: "onspot@gmail.com",
      role:"user",
      password: await bcrypt.hash("onspot123", 10),
       address: "Dhapakhel",
      phone: "9849541785",
      profilePicture: null,
      balance: 1000,
      currency: "$",
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
         address: user.address,
        phone: user.phone,
        profilePicture: user.profilePicture,
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
