-- AlterTable
ALTER TABLE "OrderCapture" ADD COLUMN     "customerPhone" TEXT;

-- AlterTable
ALTER TABLE "ReviewRequest" ADD COLUMN     "customerPhone" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appSecretEnc" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateLanguage" TEXT NOT NULL DEFAULT 'en',
    "templateVarOrder" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelSuppression" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_shop_key" ON "WhatsAppConnection"("shop");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_wabaId_idx" ON "WhatsAppConnection"("wabaId");

-- CreateIndex
CREATE INDEX "ChannelSuppression_shop_idx" ON "ChannelSuppression"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelSuppression_shop_channel_identifier_key" ON "ChannelSuppression"("shop", "channel", "identifier");
