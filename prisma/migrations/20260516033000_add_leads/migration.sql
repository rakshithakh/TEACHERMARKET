-- Persist student requirements/leads in the database.

CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'APPROVED', 'PUBLISHED', 'HIDDEN', 'CLOSED');

CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "requirementType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileName" TEXT,
    "fileData" TEXT,
    "fileType" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "applyCount" INTEGER NOT NULL DEFAULT 0,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadApplication" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "coinsSpent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FAQ" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadApplication_leadId_teacherId_key" ON "LeadApplication"("leadId", "teacherId");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
