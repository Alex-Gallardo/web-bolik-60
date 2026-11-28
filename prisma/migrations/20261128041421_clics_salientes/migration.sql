BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[OutboundClick] ADD [departmentId] INT;

-- CreateIndex
CREATE NONCLUSTERED INDEX [OutboundClick_variantId_idx] ON [dbo].[OutboundClick]([variantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OutboundClick_storeId_idx] ON [dbo].[OutboundClick]([storeId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OutboundClick_departmentId_idx] ON [dbo].[OutboundClick]([departmentId]);

-- AddForeignKey
ALTER TABLE [dbo].[OutboundClick] ADD CONSTRAINT [OutboundClick_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
