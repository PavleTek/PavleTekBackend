const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create roles (only if table is empty)
  console.log('📝 Creating roles...');
  const roleCount = await prisma.role.count();
  
  if (roleCount === 0) {
    const roleNames = ['admin', 'manager', 'operator', 'salesperson', 'accountant'];
    const roles = [];
    const createdRoles = [];

    for (const roleName of roleNames) {
      const newRole = await prisma.role.create({
        data: { name: roleName }
      });
      roles.push(newRole);
      createdRoles.push(roleName);
      console.log(`  ✅ Role "${roleName}" created`);
    }

    console.log(`✅ Created ${createdRoles.length} role(s): ${createdRoles.join(', ')}`);
  } else {
    console.log(`ℹ️  Roles table is not empty (${roleCount} role(s) exist), skipping role creation`);
  }

  // Create users (only if table is empty)
  console.log('👥 Creating users...');
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    // Get all roles (needed for user creation)
    const roles = await prisma.role.findMany();
    
    if (roles.length === 0) {
      console.log('  ⚠️  No roles found. Please create roles first before creating users.');
    } else {
      // Hash password for all users
      const hashedPassword = await bcrypt.hash('asdf', 12);
      
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

      const createdUsers = [];

      for (const userDef of userDefinitions) {
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

        await prisma.user.create({
          data: userData
        });
        createdUsers.push(userDef.username);
        console.log(`  ✅ User "${userDef.username}" (${userDef.email}) created with ${userDef.roleName} role(s)`);
      }

      console.log(`✅ Created ${createdUsers.length} user(s): ${createdUsers.join(', ')}`);
      console.log('  - All users have password: "asdf"');
      console.log('  - Super admin has all roles');
    }
  } else {
    console.log(`ℹ️  Users table is not empty (${userCount} user(s) exist), skipping user creation`);
  }

  // Create countries (only if table is empty)
  console.log('🌍 Creating countries...');
  const countryCount = await prisma.country.count();
  
  if (countryCount === 0) {
    const countryNames = ['Chile', 'USA', 'China'];
    const createdCountries = [];

    for (const countryName of countryNames) {
      await prisma.country.create({
        data: { name: countryName }
      });
      createdCountries.push(countryName);
      console.log(`  ✅ Country "${countryName}" created`);
    }

    console.log(`✅ Created ${createdCountries.length} countr${createdCountries.length === 1 ? 'y' : 'ies'}: ${createdCountries.join(', ')}`);
  } else {
    console.log(`ℹ️  Countries table is not empty (${countryCount} countr${countryCount === 1 ? 'y' : 'ies'} exist), skipping country creation`);
  }

  // Create languages (only if table is empty)
  console.log('🗣️  Creating languages...');
  const languageCount = await prisma.language.count();
  
  if (languageCount === 0) {
    const languageNames = ['Spanish', 'English'];
    const createdLanguages = [];

    for (const languageName of languageNames) {
      await prisma.language.create({
        data: { name: languageName }
      });
      createdLanguages.push(languageName);
      console.log(`  ✅ Language "${languageName}" created`);
    }

    console.log(`✅ Created ${createdLanguages.length} language(s): ${createdLanguages.join(', ')}`);
  } else {
    console.log(`ℹ️  Languages table is not empty (${languageCount} language(s) exist), skipping language creation`);
  }

  // Create currencies (only if table is empty)
  console.log('💰 Creating currencies...');
  const currencyCount = await prisma.currency.count();
  
  if (currencyCount === 0) {
    const currencyDefinitions = [
      { name: 'Chilean Peso', abbreviation: 'CLP' },
      { name: 'US Dollar', abbreviation: 'USD' }
    ];
    const createdCurrencies = [];

    for (const currencyDef of currencyDefinitions) {
      await prisma.currency.create({
        data: {
          name: currencyDef.name,
          abbreviation: currencyDef.abbreviation
        }
      });
      createdCurrencies.push(currencyDef.abbreviation);
      console.log(`  ✅ Currency "${currencyDef.abbreviation}" (${currencyDef.name}) created`);
    }

    console.log(`✅ Created ${createdCurrencies.length} currenc${createdCurrencies.length === 1 ? 'y' : 'ies'}: ${createdCurrencies.join(', ')}`);
  } else {
    console.log(`ℹ️  Currencies table is not empty (${currencyCount} currenc${currencyCount === 1 ? 'y' : 'ies'} exist), skipping currency creation`);
  }

  console.log('🎉 Database seeding completed successfully!');
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