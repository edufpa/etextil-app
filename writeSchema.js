const fs = require('fs');
const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Service {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  type        String
  status      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Provider {
  id           Int      @id @default(autoincrement())
  businessName String
  contactName  String?
  phone        String?
  email        String?
  address      String?
  notes        String?
  status       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
`;
fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
