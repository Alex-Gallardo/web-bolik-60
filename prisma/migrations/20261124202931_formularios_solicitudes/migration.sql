BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[DistributorApplication] ALTER COLUMN [branches] VARCHAR(20) NULL;
ALTER TABLE [dbo].[DistributorApplication] ALTER COLUMN [monthlyVolume] VARCHAR(40) NULL;
ALTER TABLE [dbo].[DistributorApplication] ADD [nit] VARCHAR(20);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ContactMessage_ipHash_createdAt_idx] ON [dbo].[ContactMessage]([ipHash], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DistributorApplication_ipHash_createdAt_idx] ON [dbo].[DistributorApplication]([ipHash], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SchoolVisitRequest_ipHash_createdAt_idx] ON [dbo].[SchoolVisitRequest]([ipHash], [createdAt]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
