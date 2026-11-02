BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[FolioSequence] (
    [prefix] VARCHAR(5) NOT NULL,
    [year] INT NOT NULL,
    [lastValue] INT NOT NULL CONSTRAINT [FolioSequence_lastValue_df] DEFAULT 0,
    CONSTRAINT [FolioSequence_pkey] PRIMARY KEY CLUSTERED ([prefix],[year])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
