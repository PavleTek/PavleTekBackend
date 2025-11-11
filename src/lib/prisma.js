const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// When using prisma on any controller, it is adviced to import it from this file, in order to avoid multiple db connections.
module.exports = prisma;

