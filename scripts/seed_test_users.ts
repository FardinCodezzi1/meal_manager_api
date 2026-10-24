import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function seedTestData() {
  console.log('Connecting to Neon Database...');
  
  // 1. Find Fardin
  const fardin = await prisma.user.findUnique({
    where: { email: 'fardin1.codezzi@gmail.com' },
  });

  if (!fardin) {
    console.error('Fardin account not found!');
    return;
  }
  console.log('Found Fardin:', fardin.id, fardin.email);

  // 2. Clean up test users and old messes
  console.log('Cleaning up old test data...');
  // Delete all other users
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'fardin1.codezzi@gmail.com',
      },
    },
  });

  // Check Fardin mess
  let mess = await prisma.mess.findFirst({
    where: { managerId: fardin.id },
  });

  if (!mess) {
    mess = await prisma.mess.create({
      data: {
        name: 'Bache Lorr Mess',
        inviteCode: 'MESS-BLORR',
        managerId: fardin.id,
      },
    });
    console.log('Created fresh mess for Fardin:', mess.name, mess.inviteCode);
  } else {
    console.log('Existing mess for Fardin:', mess.name, mess.inviteCode);
  }

  // Ensure Fardin is active MANAGER
  let fardinMember = await prisma.messMember.findFirst({
    where: { messId: mess.id, userId: fardin.id },
  });

  if (!fardinMember) {
    fardinMember = await prisma.messMember.create({
      data: {
        messId: mess.id,
        userId: fardin.id,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });
  } else {
    await prisma.messMember.update({
      where: { id: fardinMember.id },
      data: { role: 'MANAGER', status: 'ACTIVE' },
    });
  }

  // 3. Create 3 test users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const testUsersData = [
    { name: 'Tanvir Hasan', email: 'tanvir@example.com', phone: '01711111111' },
    { name: 'Shakil Ahmed', email: 'shakil@example.com', phone: '01722222222' },
    { name: 'Rahat Chowdhury', email: 'rahat@example.com', phone: '01733333333' },
  ];

  const testMembers = [fardinMember];

  for (const u of testUsersData) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash,
      },
    });
    console.log('Created test user:', user.name, user.email);

    const member = await prisma.messMember.create({
      data: {
        messId: mess.id,
        userId: user.id,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    testMembers.push(member);
  }

  // 4. Create active MessMonth for October 2026
  const monthKey = '2026-10';
  let messMonth = await prisma.messMonth.findUnique({
    where: {
      messId_monthKey: {
        messId: mess.id,
        monthKey,
      },
    },
  });

  if (!messMonth) {
    messMonth = await prisma.messMonth.create({
      data: {
        messId: mess.id,
        monthKey,
      },
    });
  }

  // 5. Seed Daily Meals for Today (2026-10-24)
  const todayDate = new Date('2026-10-24T00:00:00.000Z');

  // Clean old daily meals for today
  await prisma.dailyMeal.deleteMany({
    where: {
      messMonthId: messMonth.id,
      date: todayDate,
    },
  });

  // Fardin: 1 lunch, 1 dinner
  await prisma.dailyMeal.create({
    data: {
      messMonthId: messMonth.id,
      memberId: fardinMember.id,
      date: todayDate,
      lunch: 1.0,
      dinner: 1.0,
    },
  });

  // Tanvir: 1 lunch, 1 dinner
  await prisma.dailyMeal.create({
    data: {
      messMonthId: messMonth.id,
      memberId: testMembers[1].id,
      date: todayDate,
      lunch: 1.0,
      dinner: 1.0,
    },
  });

  // Shakil: 1 lunch, 0 dinner
  await prisma.dailyMeal.create({
    data: {
      messMonthId: messMonth.id,
      memberId: testMembers[2].id,
      date: todayDate,
      lunch: 1.0,
      dinner: 0.0,
    },
  });

  // Rahat: 0.5 lunch, 1 dinner
  await prisma.dailyMeal.create({
    data: {
      messMonthId: messMonth.id,
      memberId: testMembers[3].id,
      date: todayDate,
      lunch: 0.5,
      dinner: 1.0,
    },
  });

  console.log('Seeded daily meals for 2026-10-24 for all 4 members!');

  // 6. Clean and seed sample Bazar and Deposits
  await prisma.bazarEntry.deleteMany({ where: { messMonthId: messMonth.id } });
  await prisma.deposit.deleteMany({ where: { messMonthId: messMonth.id } });

  // Bazar
  await prisma.bazarEntry.create({
    data: {
      messMonthId: messMonth.id,
      memberId: fardinMember.id,
      amount: 1450,
      category: 'Fish & Groceries',
      date: new Date('2026-10-22T00:00:00.000Z'),
      notes: 'Hilsha fish, rice, spices',
      status: 'APPROVED',
      mode: 'QUICK',
    },
  });

  await prisma.bazarEntry.create({
    data: {
      messMonthId: messMonth.id,
      memberId: testMembers[1].id,
      amount: 1850,
      category: 'Chicken & Vegetables',
      date: new Date('2026-10-23T00:00:00.000Z'),
      notes: 'Broiler chicken, potatoes, onion, oil',
      status: 'APPROVED',
      mode: 'QUICK',
    },
  });

  // Deposits: 2000 tk for each member
  for (const m of testMembers) {
    await prisma.deposit.create({
      data: {
        messMonthId: messMonth.id,
        memberId: m.id,
        amount: 2000,
        date: new Date('2026-10-01T00:00:00.000Z'),
        notes: 'Monthly advance deposit',
      },
    });
  }

  console.log('Seeded sample bazar (3300 tk total) and deposits (8000 tk total)!');
  console.log('🎉 Database seeding complete!');
}

seedTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
