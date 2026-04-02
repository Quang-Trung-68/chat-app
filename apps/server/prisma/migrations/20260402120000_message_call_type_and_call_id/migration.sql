-- AlterEnum
ALTER TYPE "message_type" ADD VALUE 'CALL';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "call_id" TEXT;

CREATE UNIQUE INDEX "messages_call_id_key" ON "messages"("call_id");
