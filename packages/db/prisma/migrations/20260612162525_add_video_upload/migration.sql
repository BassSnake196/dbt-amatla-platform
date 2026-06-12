-- CreateTable
CREATE TABLE "VideoUpload" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "detail" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoUpload_uid_key" ON "VideoUpload"("uid");

-- CreateIndex
CREATE INDEX "VideoUpload_lessonId_idx" ON "VideoUpload"("lessonId");

-- CreateIndex
CREATE INDEX "VideoUpload_status_idx" ON "VideoUpload"("status");

-- AddForeignKey
ALTER TABLE "VideoUpload" ADD CONSTRAINT "VideoUpload_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
