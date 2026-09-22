import "../src/lib/env.js";
import { PrismaClient, type UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const staff: Array<{
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  password: string;
}> = [
  {
    first_name: "Super",
    last_name: "Admin",
    username: "superadmin",
    email: "superadmin@niyenin.local",
    phone: "+8801700000001",
    role: "super_admin",
    password: "SuperAdmin123!",
  },
  {
    first_name: "Site",
    last_name: "Admin",
    username: "admin",
    email: "admin@niyenin.local",
    phone: "+8801700000002",
    role: "admin",
    password: "Admin123!",
  },
  {
    first_name: "Mod",
    last_name: "Erator",
    username: "moderator",
    email: "moderator@niyenin.local",
    phone: "+8801700000003",
    role: "moderator",
    password: "Moderator123!",
  },
  {
    first_name: "Demo",
    last_name: "Vendor",
    username: "vendor",
    email: "vendor@niyenin.local",
    phone: "+8801700000004",
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
        username: account.username,
        phone: account.phone,
        role: account.role,
        password,
        status: "active",
        deleted_at: null,
      },
      create: {
        first_name: account.first_name,
        last_name: account.last_name,
        username: account.username,
        email: account.email,
        phone: account.phone,
        role: account.role,
        password,
        status: "active",
      },
    });
    console.log(
      `Seeded ${account.role}: ${account.username} / ${account.email} / ${account.phone}`,
    );
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
