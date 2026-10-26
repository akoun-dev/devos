-- Add optional metadata for projects imported from external source providers.
ALTER TABLE "Project" ADD COLUMN "sourceProvider" TEXT;
ALTER TABLE "Project" ADD COLUMN "sourceRepositoryId" TEXT;
ALTER TABLE "Project" ADD COLUMN "sourceRepositoryUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "sourceDefaultBranch" TEXT;

CREATE UNIQUE INDEX "Project_userId_sourceRepositoryId_key"
ON "Project"("userId", "sourceRepositoryId");
