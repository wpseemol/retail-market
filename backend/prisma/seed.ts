import "../src/lib/env.js";
import { PrismaClient, type UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const staff: Array<{
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  password: string;
}> = [
  {
    first_name: "Super",
    last_name: "Admin",
    email: "superadmin@niyenin.local",
    role: "super_admin",
    password: "SuperAdmin123!",
  },
  {
    first_name: "Site",
    last_name: "Admin",
    email: "admin@niyenin.local",
    role: "admin",
    password: "Admin123!",
  },
  {
    first_name: "Mod",
    last_name: "Erator",
    email: "moderator@niyenin.local",
    role: "moderator",
    password: "Moderator123!",
  },
  {
    first_name: "Demo",
    last_name: "Vendor",
    email: "vendor@niyenin.local",
    role: "vendor",
    password: "Vendor123!",
  },
];

async function main() {
  for (const account of staff) {
    const password = await hashPassword(account.password);
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        first_name: account.first_name,
        last_name: account.last_name,
        role: account.role,
        password,
        status: "active",
        deleted_at: null,
      },
      create: {
        first_name: account.first_name,
        last_name: account.last_name,
        email: account.email,
        role: account.role,
        password,
        status: "active",
      },
    });
    console.log(`Seeded ${account.role}: ${account.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
