-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Subtask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "branch" TEXT,
    "prUrl" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    CONSTRAINT "Subtask_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubtaskLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subtaskId" TEXT NOT NULL,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stream" TEXT NOT NULL DEFAULT 'STDOUT',
    "line" TEXT NOT NULL,
    CONSTRAINT "SubtaskLog_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "Subtask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Subtask_jobId_idx" ON "Subtask"("jobId");

-- CreateIndex
CREATE INDEX "SubtaskLog_subtaskId_ts_idx" ON "SubtaskLog"("subtaskId", "ts");
