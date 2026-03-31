-- CreateTable
CREATE TABLE "pinned_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "pinned_by" TEXT NOT NULL,
    "pinned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pinned_messages_message_id_key" ON "pinned_messages"("message_id");

-- CreateIndex
CREATE INDEX "pinned_messages_conversation_id_pinned_at_idx" ON "pinned_messages"("conversation_id", "pinned_at" DESC);

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pinned_messages" ADD CONSTRAINT "pinned_messages_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
