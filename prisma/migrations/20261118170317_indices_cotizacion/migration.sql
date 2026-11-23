BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [QuoteItem_quoteId_idx] ON [dbo].[QuoteItem]([quoteId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [QuoteNote_quoteId_idx] ON [dbo].[QuoteNote]([quoteId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [QuoteRequest_assignedToId_idx] ON [dbo].[QuoteRequest]([assignedToId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [QuoteRequest_ipHash_createdAt_idx] ON [dbo].[QuoteRequest]([ipHash], [createdAt]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
