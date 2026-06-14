-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Course_status_isPublic_idx" ON "Course"("status", "isPublic");
