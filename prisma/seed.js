const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create roles (check if they exist first)
  console.log('📝 Creating roles...');
  const roleNames = ['admin', 'manager', 'operator', 'salesperson', 'accountant'];
  const roles = [];
  const createdRoles = [];
  const existingRoles = [];

  for (const roleName of roleNames) {
    const existingRole = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (existingRole) {
      roles.push(existingRole);
      existingRoles.push(roleName);
    } else {
      const newRole = await prisma.role.create({
        data: { name: roleName }
      });
      roles.push(newRole);
      createdRoles.push(roleName);
      console.log(`  ✅ Role "${roleName}" created`);
    }
  }

  if (createdRoles.length > 0) {
    console.log(`✅ Created ${createdRoles.length} new role(s): ${createdRoles.join(', ')}`);
  }
  if (existingRoles.length === roleNames.length) {
    console.log(`ℹ️  Roles already initialized`);
  }

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('asdf', 12);

  // Create users with individual roles (check if they exist first)
  console.log('👥 Creating users...');
  
  const userDefinitions = [
    {
      email: 'admin@example.com',
      username: 'admin',
      name: 'Admin',
      lastName: 'User',
      roleIndex: 0, // admin role
      roleName: 'admin'
    },
    {
      email: 'manager@example.com',
      username: 'manager',
      name: 'Manager',
      lastName: 'User',
      roleIndex: 1, // manager role
      roleName: 'manager'
    },
    {
      email: 'operator@example.com',
      username: 'operator',
      name: 'Operator',
      lastName: 'User',
      roleIndex: 2, // operator role
      roleName: 'operator'
    },
    {
      email: 'salesperson@example.com',
      username: 'salesperson',
      name: 'Sales',
      lastName: 'Person',
      roleIndex: 3, // salesperson role
      roleName: 'salesperson'
    },
    {
      email: 'accountant@example.com',
      username: 'accountant',
      name: 'Accountant',
      lastName: 'User',
      roleIndex: 4, // accountant role
      roleName: 'accountant'
    },
    {
      email: 'superadmin@example.com',
      username: 'superadmin',
      name: 'Super',
      lastName: 'Admin',
      roleIndex: null, // all roles
      roleName: 'all roles'
    }
  ];

  const users = [];
  const createdUsers = [];
  const existingUsers = [];

  for (const userDef of userDefinitions) {
    // Check if user exists by email or username
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userDef.email },
          { username: userDef.username }
        ]
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (existingUser) {
      users.push(existingUser);
      existingUsers.push(userDef.username);
    } else {
      const userData = {
        email: userDef.email,
        username: userDef.username,
        hashedPassword,
        name: userDef.name,
        lastName: userDef.lastName,
        userRoles: {
          create: userDef.roleIndex === null
            ? roles.map(role => ({ roleId: role.id }))
            : [{ roleId: roles[userDef.roleIndex].id }]
        }
      };

      const newUser = await prisma.user.create({
        data: userData
      });
      users.push(newUser);
      createdUsers.push(userDef.username);
      console.log(`  ✅ User "${userDef.username}" (${userDef.email}) created with ${userDef.roleName} role(s)`);
    }
  }

  if (createdUsers.length > 0) {
    console.log(`✅ Created ${createdUsers.length} new user(s): ${createdUsers.join(', ')}`);
  }
  if (existingUsers.length === userDefinitions.length) {
    console.log(`ℹ️  Users already initialized`);
  }

  // Create countries (check if they exist first)
  console.log('🌍 Creating countries...');
  const countryNames = ['Chile', 'USA', 'China'];
  const countries = [];
  const createdCountries = [];
  const existingCountries = [];

  for (const countryName of countryNames) {
    const existingCountry = await prisma.country.findUnique({
      where: { name: countryName }
    });

    if (existingCountry) {
      countries.push(existingCountry);
      existingCountries.push(countryName);
    } else {
      const newCountry = await prisma.country.create({
        data: { name: countryName }
      });
      countries.push(newCountry);
      createdCountries.push(countryName);
      console.log(`  ✅ Country "${countryName}" created`);
    }
  }

  if (createdCountries.length > 0) {
    console.log(`✅ Created ${createdCountries.length} new country(ies): ${createdCountries.join(', ')}`);
  }
  if (existingCountries.length === countryNames.length) {
    console.log(`ℹ️  Countries already initialized`);
  }

  // Create languages (check if they exist first)
  console.log('🗣️  Creating languages...');
  const languageNames = ['Spanish', 'English'];
  const languages = [];
  const createdLanguages = [];
  const existingLanguages = [];

  for (const languageName of languageNames) {
    const existingLanguage = await prisma.language.findUnique({
      where: { name: languageName }
    });

    if (existingLanguage) {
      languages.push(existingLanguage);
      existingLanguages.push(languageName);
    } else {
      const newLanguage = await prisma.language.create({
        data: { name: languageName }
      });
      languages.push(newLanguage);
      createdLanguages.push(languageName);
      console.log(`  ✅ Language "${languageName}" created`);
    }
  }

  if (createdLanguages.length > 0) {
    console.log(`✅ Created ${createdLanguages.length} new language(s): ${createdLanguages.join(', ')}`);
  }
  if (existingLanguages.length === languageNames.length) {
    console.log(`ℹ️  Languages already initialized`);
  }

  // Create currencies (check if they exist first)
  console.log('💰 Creating currencies...');
  const currencyDefinitions = [
    { name: 'Chilean Peso', abbreviation: 'CLP' },
    { name: 'US Dollar', abbreviation: 'USD' }
  ];
  const currencies = [];
  const createdCurrencies = [];
  const existingCurrencies = [];

  for (const currencyDef of currencyDefinitions) {
    const existingCurrency = await prisma.currency.findUnique({
      where: { abbreviation: currencyDef.abbreviation }
    });

    if (existingCurrency) {
      currencies.push(existingCurrency);
      existingCurrencies.push(currencyDef.abbreviation);
    } else {
      const newCurrency = await prisma.currency.create({
        data: {
          name: currencyDef.name,
          abbreviation: currencyDef.abbreviation
        }
      });
      currencies.push(newCurrency);
      createdCurrencies.push(currencyDef.abbreviation);
      console.log(`  ✅ Currency "${currencyDef.abbreviation}" (${currencyDef.name}) created`);
    }
  }

  if (createdCurrencies.length > 0) {
    console.log(`✅ Created ${createdCurrencies.length} new currency(ies): ${createdCurrencies.join(', ')}`);
  }
  if (existingCurrencies.length === currencyDefinitions.length) {
    console.log(`ℹ️  Currencies already initialized`);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Summary:');
  if (createdRoles.length > 0) {
    console.log(`  - ${createdRoles.length} new role(s) created`);
  }
  if (existingRoles.length === roleNames.length) {
    console.log(`  - Roles already initialized`);
  }
  if (createdUsers.length > 0) {
    console.log(`  - ${createdUsers.length} new user(s) created`);
    console.log('  - All new users have password: "asdf"');
  }
  if (existingUsers.length === userDefinitions.length) {
    console.log(`  - Users already initialized`);
  }
  if (createdUsers.length > 0) {
    console.log('  - Super admin has all roles');
  }
  if (createdCountries.length > 0) {
    console.log(`  - ${createdCountries.length} new country(ies) created`);
  }
  if (existingCountries.length === countryNames.length) {
    console.log(`  - Countries already initialized`);
  }
  if (createdLanguages.length > 0) {
    console.log(`  - ${createdLanguages.length} new language(s) created`);
  }
  if (existingLanguages.length === languageNames.length) {
    console.log(`  - Languages already initialized`);
  }
  if (createdCurrencies.length > 0) {
    console.log(`  - ${createdCurrencies.length} new currency(ies) created`);
  }
  if (existingCurrencies.length === currencyDefinitions.length) {
    console.log(`  - Currencies already initialized`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });