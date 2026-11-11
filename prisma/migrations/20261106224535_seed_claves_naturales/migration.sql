/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `Faq` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `HistoryMilestone` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[kitId,description]` on the table `KitItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,iconKey]` on the table `ProductBenefit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,mediaId]` on the table `ProductImage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,groupName,label]` on the table `ProductSpec` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key]` on the table `SchoolActivity` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `Faq` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `HistoryMilestone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `key` to the `SchoolActivity` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Faq] ADD [key] VARCHAR(80) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[HistoryMilestone] ADD [key] VARCHAR(60) NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[Kit] ADD [isSample] BIT NOT NULL CONSTRAINT [Kit_isSample_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[Product] ADD [isSample] BIT NOT NULL CONSTRAINT [Product_isSample_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[SchoolActivity] ADD [isSample] BIT NOT NULL CONSTRAINT [SchoolActivity_isSample_df] DEFAULT 0,
[key] VARCHAR(60) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[Faq] ADD CONSTRAINT [Faq_key_key] UNIQUE NONCLUSTERED ([key]);

-- CreateIndex
ALTER TABLE [dbo].[HistoryMilestone] ADD CONSTRAINT [HistoryMilestone_key_key] UNIQUE NONCLUSTERED ([key]);

-- CreateIndex
ALTER TABLE [dbo].[KitItem] ADD CONSTRAINT [KitItem_kitId_description_key] UNIQUE NONCLUSTERED ([kitId], [description]);

-- CreateIndex
ALTER TABLE [dbo].[ProductBenefit] ADD CONSTRAINT [ProductBenefit_productId_iconKey_key] UNIQUE NONCLUSTERED ([productId], [iconKey]);

-- CreateIndex
ALTER TABLE [dbo].[ProductImage] ADD CONSTRAINT [ProductImage_productId_mediaId_key] UNIQUE NONCLUSTERED ([productId], [mediaId]);

-- CreateIndex
ALTER TABLE [dbo].[ProductSpec] ADD CONSTRAINT [ProductSpec_productId_groupName_label_key] UNIQUE NONCLUSTERED ([productId], [groupName], [label]);

-- CreateIndex
ALTER TABLE [dbo].[SchoolActivity] ADD CONSTRAINT [SchoolActivity_key_key] UNIQUE NONCLUSTERED ([key]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
