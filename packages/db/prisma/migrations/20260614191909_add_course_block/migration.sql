-- CreateTable
CREATE TABLE "CourseBlock" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "blockedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseBlock_courseId_idx" ON "CourseBlock"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseBlock_studentId_courseId_key" ON "CourseBlock"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "CourseBlock" ADD CONSTRAINT "CourseBlock_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseBlock" ADD CONSTRAINT "CourseBlock_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
