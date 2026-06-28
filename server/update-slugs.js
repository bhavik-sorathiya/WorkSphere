import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + crypto.randomBytes(2).toString('hex');
};

async function main() {
  console.log('Starting slug generation via raw SQL...');

  const orgs = await prisma.$queryRaw`SELECT id, name FROM "Organization" WHERE slug IS NULL`;
  for (const org of orgs) {
    const slug = generateSlug(org.name);
    await prisma.$executeRaw`UPDATE "Organization" SET slug = ${slug} WHERE id = ${org.id}`;
    console.log(`Updated Org: ${org.name} -> ${slug}`);
  }

  const projects = await prisma.$queryRaw`SELECT id, name FROM "Project" WHERE slug IS NULL`;
  for (const project of projects) {
    const slug = generateSlug(project.name);
    await prisma.$executeRaw`UPDATE "Project" SET slug = ${slug} WHERE id = ${project.id}`;
    console.log(`Updated Project: ${project.name} -> ${slug}`);
  }

  console.log('Finished updating slugs!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
