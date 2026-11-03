BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[AdminUser] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] NVARCHAR(160) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [passwordHash] VARCHAR(100) NOT NULL,
    [role] VARCHAR(20) NOT NULL CONSTRAINT [AdminUser_role_df] DEFAULT 'editor',
    [active] BIT NOT NULL CONSTRAINT [AdminUser_active_df] DEFAULT 1,
    [failedLogins] INT NOT NULL CONSTRAINT [AdminUser_failedLogins_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [lastLoginAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdminUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AdminUser_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AdminUser_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT,
    [action] VARCHAR(40) NOT NULL,
    [entity] VARCHAR(40) NOT NULL,
    [entityId] VARCHAR(60) NOT NULL,
    [diff] NVARCHAR(max),
    [ipHash] VARCHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MediaAsset] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] VARCHAR(200) NOT NULL,
    [kind] VARCHAR(20) NOT NULL CONSTRAINT [MediaAsset_kind_df] DEFAULT 'image',
    [originalName] NVARCHAR(200) NOT NULL,
    [mime] VARCHAR(60) NOT NULL,
    [width] INT,
    [height] INT,
    [bytes] INT NOT NULL,
    [blurDataUrl] VARCHAR(max),
    [dominantColor] VARCHAR(9),
    [defaultAlt] NVARCHAR(200),
    [uploadedById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MediaAsset_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [MediaAsset_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MediaAsset_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[Category] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] VARCHAR(80) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [lineGroup] VARCHAR(20) NOT NULL,
    [shortText] NVARCHAR(200) NOT NULL,
    [intro] NVARCHAR(max),
    [imageId] INT,
    [seoTitle] NVARCHAR(70),
    [seoDescription] NVARCHAR(170),
    [sortOrder] INT NOT NULL CONSTRAINT [Category_sortOrder_df] DEFAULT 0,
    [published] BIT NOT NULL CONSTRAINT [Category_published_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Category_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Category_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Category_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[Product] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] VARCHAR(100) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [tagline] NVARCHAR(160),
    [shortDescription] NVARCHAR(300) NOT NULL,
    [description] NVARCHAR(max),
    [keyFacts] NVARCHAR(max),
    [safetyWarning] NVARCHAR(max),
    [categoryId] INT NOT NULL,
    [featured] BIT NOT NULL CONSTRAINT [Product_featured_df] DEFAULT 0,
    [published] BIT NOT NULL CONSTRAINT [Product_published_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [Product_sortOrder_df] DEFAULT 0,
    [seoTitle] NVARCHAR(70),
    [seoDescription] NVARCHAR(170),
    [erpSyncedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Product_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Product_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Product_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[ProductVariant] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [sku] VARCHAR(30) NOT NULL,
    [barcode] VARCHAR(20),
    [erpName] NVARCHAR(200),
    [colorKey] VARCHAR(30) NOT NULL,
    [colorName] NVARCHAR(40) NOT NULL,
    [colorHex] VARCHAR(9) NOT NULL,
    [isDefault] BIT NOT NULL CONSTRAINT [ProductVariant_isDefault_df] DEFAULT 0,
    [erpActive] BIT NOT NULL CONSTRAINT [ProductVariant_erpActive_df] DEFAULT 1,
    [published] BIT NOT NULL CONSTRAINT [ProductVariant_published_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [ProductVariant_sortOrder_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ProductVariant_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductVariant_sku_key] UNIQUE NONCLUSTERED ([sku]),
    CONSTRAINT [ProductVariant_productId_colorKey_key] UNIQUE NONCLUSTERED ([productId],[colorKey])
);

-- CreateTable
CREATE TABLE [dbo].[ProductSpec] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [groupName] NVARCHAR(60) NOT NULL CONSTRAINT [ProductSpec_groupName_df] DEFAULT 'General',
    [label] NVARCHAR(80) NOT NULL,
    [value] NVARCHAR(300) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [ProductSpec_sortOrder_df] DEFAULT 0,
    CONSTRAINT [ProductSpec_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProductDimension] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [partKey] VARCHAR(30) NOT NULL,
    [label] NVARCHAR(80) NOT NULL,
    [valueMm] DECIMAL(8,2) NOT NULL,
    [tolerance] VARCHAR(20),
    [sortOrder] INT NOT NULL CONSTRAINT [ProductDimension_sortOrder_df] DEFAULT 0,
    CONSTRAINT [ProductDimension_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductDimension_productId_partKey_key] UNIQUE NONCLUSTERED ([productId],[partKey])
);

-- CreateTable
CREATE TABLE [dbo].[Packaging] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [code] VARCHAR(20) NOT NULL,
    [name] NVARCHAR(80) NOT NULL,
    [unitsPerPack] INT NOT NULL,
    [innerPacks] INT,
    [lengthMm] DECIMAL(8,2),
    [widthMm] DECIMAL(8,2),
    [heightMm] DECIMAL(8,2),
    [weightG] DECIMAL(8,2),
    [barcode] VARCHAR(20),
    [isWholesale] BIT NOT NULL CONSTRAINT [Packaging_isWholesale_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [Packaging_sortOrder_df] DEFAULT 0,
    CONSTRAINT [Packaging_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Packaging_productId_code_key] UNIQUE NONCLUSTERED ([productId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[ProductImage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [variantId] INT,
    [mediaId] INT NOT NULL,
    [kind] VARCHAR(20) NOT NULL CONSTRAINT [ProductImage_kind_df] DEFAULT 'main',
    [alt] NVARCHAR(200) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [ProductImage_sortOrder_df] DEFAULT 0,
    CONSTRAINT [ProductImage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProductBenefit] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [iconKey] VARCHAR(40) NOT NULL,
    [title] NVARCHAR(80) NOT NULL,
    [text] NVARCHAR(200),
    [sortOrder] INT NOT NULL CONSTRAINT [ProductBenefit_sortOrder_df] DEFAULT 0,
    CONSTRAINT [ProductBenefit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UseTag] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] VARCHAR(40) NOT NULL,
    [name] NVARCHAR(60) NOT NULL,
    CONSTRAINT [UseTag_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UseTag_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[ProductUse] (
    [productId] INT NOT NULL,
    [useTagId] INT NOT NULL,
    CONSTRAINT [ProductUse_pkey] PRIMARY KEY CLUSTERED ([productId],[useTagId])
);

-- CreateTable
CREATE TABLE [dbo].[ProductRelation] (
    [fromId] INT NOT NULL,
    [toId] INT NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [ProductRelation_sortOrder_df] DEFAULT 0,
    CONSTRAINT [ProductRelation_pkey] PRIMARY KEY CLUSTERED ([fromId],[toId])
);

-- CreateTable
CREATE TABLE [dbo].[Faq] (
    [id] INT NOT NULL IDENTITY(1,1),
    [scope] VARCHAR(20) NOT NULL,
    [categoryId] INT,
    [productId] INT,
    [question] NVARCHAR(200) NOT NULL,
    [answer] NVARCHAR(max) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [Faq_sortOrder_df] DEFAULT 0,
    [published] BIT NOT NULL CONSTRAINT [Faq_published_df] DEFAULT 1,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Faq_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Department] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] VARCHAR(40) NOT NULL,
    [name] NVARCHAR(60) NOT NULL,
    [country] VARCHAR(2) NOT NULL CONSTRAINT [Department_country_df] DEFAULT 'GT',
    [lat] DECIMAL(9,6) NOT NULL,
    [lng] DECIMAL(9,6) NOT NULL,
    [intro] NVARCHAR(max),
    CONSTRAINT [Department_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Department_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[Store] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] VARCHAR(100) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [type] VARCHAR(20) NOT NULL,
    [departmentId] INT NOT NULL,
    [municipality] NVARCHAR(80),
    [address] NVARCHAR(250),
    [phone] VARCHAR(30),
    [websiteUrl] VARCHAR(300),
    [onlineShopUrl] VARCHAR(300),
    [lat] DECIMAL(9,6),
    [lng] DECIMAL(9,6),
    [openingHours] NVARCHAR(200),
    [isVerified] BIT NOT NULL CONSTRAINT [Store_isVerified_df] DEFAULT 0,
    [published] BIT NOT NULL CONSTRAINT [Store_published_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [Store_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Store_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Store_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Store_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[Kit] (
    [id] INT NOT NULL IDENTITY(1,1),
    [slug] VARCHAR(80) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [level] VARCHAR(30) NOT NULL,
    [season] INT NOT NULL,
    [description] NVARCHAR(400) NOT NULL,
    [suggestedPrice] DECIMAL(10,2),
    [priceVisible] BIT NOT NULL CONSTRAINT [Kit_priceVisible_df] DEFAULT 0,
    [imageId] INT,
    [published] BIT NOT NULL CONSTRAINT [Kit_published_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [Kit_sortOrder_df] DEFAULT 0,
    CONSTRAINT [Kit_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Kit_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[KitItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [kitId] INT NOT NULL,
    [variantId] INT,
    [description] NVARCHAR(120) NOT NULL,
    [quantity] INT NOT NULL CONSTRAINT [KitItem_quantity_df] DEFAULT 1,
    [sortOrder] INT NOT NULL CONSTRAINT [KitItem_sortOrder_df] DEFAULT 0,
    CONSTRAINT [KitItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[KitStore] (
    [kitId] INT NOT NULL,
    [storeId] INT NOT NULL,
    CONSTRAINT [KitStore_pkey] PRIMARY KEY CLUSTERED ([kitId],[storeId])
);

-- CreateTable
CREATE TABLE [dbo].[QuoteRequest] (
    [id] INT NOT NULL IDENTITY(1,1),
    [folio] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [QuoteRequest_status_df] DEFAULT 'nueva',
    [customerType] VARCHAR(20) NOT NULL,
    [organization] NVARCHAR(160) NOT NULL,
    [contactName] NVARCHAR(120) NOT NULL,
    [phone] VARCHAR(30),
    [email] NVARCHAR(160),
    [departmentId] INT,
    [municipality] NVARCHAR(80),
    [notes] NVARCHAR(2000),
    [source] VARCHAR(20) NOT NULL CONSTRAINT [QuoteRequest_source_df] DEFAULT 'web',
    [utmSource] VARCHAR(80),
    [utmMedium] VARCHAR(80),
    [utmCampaign] VARCHAR(120),
    [landingPath] VARCHAR(300),
    [ipHash] VARCHAR(64),
    [assignedToId] INT,
    [erpStatus] VARCHAR(20) NOT NULL CONSTRAINT [QuoteRequest_erpStatus_df] DEFAULT 'pendiente',
    [erpRef] VARCHAR(40),
    [erpLastError] NVARCHAR(1000),
    [erpAttempts] INT NOT NULL CONSTRAINT [QuoteRequest_erpAttempts_df] DEFAULT 0,
    [erpSentAt] DATETIME2,
    [emailSentAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [QuoteRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [QuoteRequest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [QuoteRequest_folio_key] UNIQUE NONCLUSTERED ([folio])
);

-- CreateTable
CREATE TABLE [dbo].[QuoteItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [quoteId] INT NOT NULL,
    [itemType] VARCHAR(20) NOT NULL,
    [variantId] INT,
    [kitId] INT,
    [categoryId] INT,
    [packagingCode] VARCHAR(20),
    [description] NVARCHAR(250) NOT NULL,
    [quantity] INT NOT NULL,
    [unitLabel] NVARCHAR(30) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [QuoteItem_sortOrder_df] DEFAULT 0,
    CONSTRAINT [QuoteItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[QuoteNote] (
    [id] INT NOT NULL IDENTITY(1,1),
    [quoteId] INT NOT NULL,
    [authorId] INT NOT NULL,
    [text] NVARCHAR(2000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [QuoteNote_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [QuoteNote_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SchoolVisitRequest] (
    [id] INT NOT NULL IDENTITY(1,1),
    [folio] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [SchoolVisitRequest_status_df] DEFAULT 'nueva',
    [schoolName] NVARCHAR(160) NOT NULL,
    [level] VARCHAR(30) NOT NULL,
    [studentsApprox] INT,
    [departmentId] INT,
    [municipality] NVARCHAR(80) NOT NULL,
    [contactName] NVARCHAR(120) NOT NULL,
    [phone] VARCHAR(30),
    [email] NVARCHAR(160),
    [preferredMonth] VARCHAR(20),
    [notes] NVARCHAR(2000),
    [utmSource] VARCHAR(80),
    [ipHash] VARCHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SchoolVisitRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SchoolVisitRequest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SchoolVisitRequest_folio_key] UNIQUE NONCLUSTERED ([folio])
);

-- CreateTable
CREATE TABLE [dbo].[DistributorApplication] (
    [id] INT NOT NULL IDENTITY(1,1),
    [folio] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [DistributorApplication_status_df] DEFAULT 'nueva',
    [businessName] NVARCHAR(160) NOT NULL,
    [businessType] VARCHAR(30) NOT NULL,
    [branches] VARCHAR(20) NOT NULL,
    [monthlyVolume] VARCHAR(40) NOT NULL,
    [currentBrands] NVARCHAR(300),
    [departmentId] INT,
    [municipality] NVARCHAR(80) NOT NULL,
    [contactName] NVARCHAR(120) NOT NULL,
    [phone] VARCHAR(30),
    [email] NVARCHAR(160),
    [notes] NVARCHAR(2000),
    [ipHash] VARCHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DistributorApplication_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DistributorApplication_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [DistributorApplication_folio_key] UNIQUE NONCLUSTERED ([folio])
);

-- CreateTable
CREATE TABLE [dbo].[ContactMessage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [status] VARCHAR(20) NOT NULL CONSTRAINT [ContactMessage_status_df] DEFAULT 'nuevo',
    [name] NVARCHAR(120) NOT NULL,
    [email] NVARCHAR(160),
    [phone] VARCHAR(30),
    [subject] VARCHAR(30) NOT NULL,
    [message] NVARCHAR(3000) NOT NULL,
    [ipHash] VARCHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ContactMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ContactMessage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[HeroChapter] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] VARCHAR(30) NOT NULL,
    [label] NVARCHAR(40) NOT NULL,
    [hint] NVARCHAR(60) NOT NULL,
    [eyebrow] NVARCHAR(80) NOT NULL,
    [line] NVARCHAR(220) NOT NULL,
    [ctaLabel] NVARCHAR(40) NOT NULL,
    [ctaKind] VARCHAR(10) NOT NULL,
    [ctaHref] VARCHAR(200),
    [ctaQuoteType] VARCHAR(20),
    [videoDesktop] VARCHAR(300),
    [videoMobile] VARCHAR(300),
    [posterKey] VARCHAR(200),
    [sortOrder] INT NOT NULL CONSTRAINT [HeroChapter_sortOrder_df] DEFAULT 0,
    [published] BIT NOT NULL CONSTRAINT [HeroChapter_published_df] DEFAULT 1,
    CONSTRAINT [HeroChapter_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [HeroChapter_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[SiteStat] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] VARCHAR(30) NOT NULL,
    [value] INT NOT NULL,
    [prefix] NVARCHAR(5),
    [suffix] NVARCHAR(5),
    [label] NVARCHAR(80) NOT NULL,
    [sourceNote] NVARCHAR(200),
    [sortOrder] INT NOT NULL CONSTRAINT [SiteStat_sortOrder_df] DEFAULT 0,
    [published] BIT NOT NULL CONSTRAINT [SiteStat_published_df] DEFAULT 1,
    CONSTRAINT [SiteStat_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SiteStat_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[HistoryMilestone] (
    [id] INT NOT NULL IDENTITY(1,1),
    [year] INT NOT NULL,
    [title] NVARCHAR(120) NOT NULL,
    [description] NVARCHAR(400) NOT NULL,
    [imageId] INT,
    [isVerified] BIT NOT NULL CONSTRAINT [HistoryMilestone_isVerified_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [HistoryMilestone_sortOrder_df] DEFAULT 0,
    [published] BIT NOT NULL CONSTRAINT [HistoryMilestone_published_df] DEFAULT 1,
    CONSTRAINT [HistoryMilestone_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SchoolActivity] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(120) NOT NULL,
    [description] NVARCHAR(400) NOT NULL,
    [colorKey] VARCHAR(20) NOT NULL,
    [iconKey] VARCHAR(40) NOT NULL,
    [imageId] INT,
    [sortOrder] INT NOT NULL CONSTRAINT [SchoolActivity_sortOrder_df] DEFAULT 0,
    [published] BIT NOT NULL CONSTRAINT [SchoolActivity_published_df] DEFAULT 1,
    CONSTRAINT [SchoolActivity_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SectionAppearance] (
    [sectionKey] VARCHAR(50) NOT NULL,
    [backgroundPreset] VARCHAR(20) NOT NULL CONSTRAINT [SectionAppearance_backgroundPreset_df] DEFAULT 'paper',
    [tone] VARCHAR(10) NOT NULL CONSTRAINT [SectionAppearance_tone_df] DEFAULT 'light',
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SectionAppearance_pkey] PRIMARY KEY CLUSTERED ([sectionKey])
);

-- CreateTable
CREATE TABLE [dbo].[SiteSetting] (
    [key] VARCHAR(60) NOT NULL,
    [value] NVARCHAR(max) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SiteSetting_pkey] PRIMARY KEY CLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[Redirect] (
    [id] INT NOT NULL IDENTITY(1,1),
    [fromPath] VARCHAR(450) NOT NULL,
    [toPath] VARCHAR(450) NOT NULL,
    [statusCode] INT NOT NULL CONSTRAINT [Redirect_statusCode_df] DEFAULT 301,
    [hits] INT NOT NULL CONSTRAINT [Redirect_hits_df] DEFAULT 0,
    [lastHitAt] DATETIME2,
    [active] BIT NOT NULL CONSTRAINT [Redirect_active_df] DEFAULT 1,
    [note] NVARCHAR(200),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Redirect_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Redirect_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Redirect_fromPath_key] UNIQUE NONCLUSTERED ([fromPath])
);

-- CreateTable
CREATE TABLE [dbo].[NotFoundLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [path] VARCHAR(450) NOT NULL,
    [hits] INT NOT NULL CONSTRAINT [NotFoundLog_hits_df] DEFAULT 1,
    [referer] VARCHAR(450),
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [NotFoundLog_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NotFoundLog_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NotFoundLog_path_key] UNIQUE NONCLUSTERED ([path])
);

-- CreateTable
CREATE TABLE [dbo].[OutboundClick] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [kind] VARCHAR(20) NOT NULL,
    [target] VARCHAR(60),
    [variantId] INT,
    [storeId] INT,
    [path] VARCHAR(300) NOT NULL,
    [deviceType] VARCHAR(10),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OutboundClick_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OutboundClick_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SyncRun] (
    [id] INT NOT NULL IDENTITY(1,1),
    [kind] VARCHAR(20) NOT NULL,
    [status] VARCHAR(20) NOT NULL,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [SyncRun_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [finishedAt] DATETIME2,
    [itemsRead] INT NOT NULL CONSTRAINT [SyncRun_itemsRead_df] DEFAULT 0,
    [itemsCreated] INT NOT NULL CONSTRAINT [SyncRun_itemsCreated_df] DEFAULT 0,
    [itemsUpdated] INT NOT NULL CONSTRAINT [SyncRun_itemsUpdated_df] DEFAULT 0,
    [errors] NVARCHAR(max),
    CONSTRAINT [SyncRun_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[IndexNowSubmission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [url] VARCHAR(450) NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [IndexNowSubmission_status_df] DEFAULT 'pendiente',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [IndexNowSubmission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [sentAt] DATETIME2,
    CONSTRAINT [IndexNowSubmission_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entity_entityId_idx] ON [dbo].[AuditLog]([entity], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_categoryId_published_sortOrder_idx] ON [dbo].[Product]([categoryId], [published], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductVariant_barcode_idx] ON [dbo].[ProductVariant]([barcode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductSpec_productId_sortOrder_idx] ON [dbo].[ProductSpec]([productId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductImage_productId_variantId_sortOrder_idx] ON [dbo].[ProductImage]([productId], [variantId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Faq_scope_published_sortOrder_idx] ON [dbo].[Faq]([scope], [published], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Store_departmentId_published_idx] ON [dbo].[Store]([departmentId], [published]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [QuoteRequest_status_createdAt_idx] ON [dbo].[QuoteRequest]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [QuoteRequest_erpStatus_idx] ON [dbo].[QuoteRequest]([erpStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SchoolVisitRequest_status_createdAt_idx] ON [dbo].[SchoolVisitRequest]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [DistributorApplication_status_createdAt_idx] ON [dbo].[DistributorApplication]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ContactMessage_status_createdAt_idx] ON [dbo].[ContactMessage]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OutboundClick_kind_createdAt_idx] ON [dbo].[OutboundClick]([kind], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IndexNowSubmission_status_createdAt_idx] ON [dbo].[IndexNowSubmission]([status], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[AdminUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MediaAsset] ADD CONSTRAINT [MediaAsset_uploadedById_fkey] FOREIGN KEY ([uploadedById]) REFERENCES [dbo].[AdminUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Category] ADD CONSTRAINT [Category_imageId_fkey] FOREIGN KEY ([imageId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductVariant] ADD CONSTRAINT [ProductVariant_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductSpec] ADD CONSTRAINT [ProductSpec_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductDimension] ADD CONSTRAINT [ProductDimension_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Packaging] ADD CONSTRAINT [Packaging_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductImage] ADD CONSTRAINT [ProductImage_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductImage] ADD CONSTRAINT [ProductImage_variantId_fkey] FOREIGN KEY ([variantId]) REFERENCES [dbo].[ProductVariant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProductImage] ADD CONSTRAINT [ProductImage_mediaId_fkey] FOREIGN KEY ([mediaId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProductBenefit] ADD CONSTRAINT [ProductBenefit_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductUse] ADD CONSTRAINT [ProductUse_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductUse] ADD CONSTRAINT [ProductUse_useTagId_fkey] FOREIGN KEY ([useTagId]) REFERENCES [dbo].[UseTag]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductRelation] ADD CONSTRAINT [ProductRelation_fromId_fkey] FOREIGN KEY ([fromId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductRelation] ADD CONSTRAINT [ProductRelation_toId_fkey] FOREIGN KEY ([toId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Faq] ADD CONSTRAINT [Faq_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Faq] ADD CONSTRAINT [Faq_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Store] ADD CONSTRAINT [Store_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Kit] ADD CONSTRAINT [Kit_imageId_fkey] FOREIGN KEY ([imageId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[KitItem] ADD CONSTRAINT [KitItem_kitId_fkey] FOREIGN KEY ([kitId]) REFERENCES [dbo].[Kit]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[KitItem] ADD CONSTRAINT [KitItem_variantId_fkey] FOREIGN KEY ([variantId]) REFERENCES [dbo].[ProductVariant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[KitStore] ADD CONSTRAINT [KitStore_kitId_fkey] FOREIGN KEY ([kitId]) REFERENCES [dbo].[Kit]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[KitStore] ADD CONSTRAINT [KitStore_storeId_fkey] FOREIGN KEY ([storeId]) REFERENCES [dbo].[Store]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[QuoteRequest] ADD CONSTRAINT [QuoteRequest_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[QuoteRequest] ADD CONSTRAINT [QuoteRequest_assignedToId_fkey] FOREIGN KEY ([assignedToId]) REFERENCES [dbo].[AdminUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[QuoteItem] ADD CONSTRAINT [QuoteItem_quoteId_fkey] FOREIGN KEY ([quoteId]) REFERENCES [dbo].[QuoteRequest]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[QuoteItem] ADD CONSTRAINT [QuoteItem_variantId_fkey] FOREIGN KEY ([variantId]) REFERENCES [dbo].[ProductVariant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[QuoteItem] ADD CONSTRAINT [QuoteItem_kitId_fkey] FOREIGN KEY ([kitId]) REFERENCES [dbo].[Kit]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[QuoteItem] ADD CONSTRAINT [QuoteItem_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[QuoteNote] ADD CONSTRAINT [QuoteNote_quoteId_fkey] FOREIGN KEY ([quoteId]) REFERENCES [dbo].[QuoteRequest]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[QuoteNote] ADD CONSTRAINT [QuoteNote_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[AdminUser]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SchoolVisitRequest] ADD CONSTRAINT [SchoolVisitRequest_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DistributorApplication] ADD CONSTRAINT [DistributorApplication_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HistoryMilestone] ADD CONSTRAINT [HistoryMilestone_imageId_fkey] FOREIGN KEY ([imageId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[SchoolActivity] ADD CONSTRAINT [SchoolActivity_imageId_fkey] FOREIGN KEY ([imageId]) REFERENCES [dbo].[MediaAsset]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OutboundClick] ADD CONSTRAINT [OutboundClick_variantId_fkey] FOREIGN KEY ([variantId]) REFERENCES [dbo].[ProductVariant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OutboundClick] ADD CONSTRAINT [OutboundClick_storeId_fkey] FOREIGN KEY ([storeId]) REFERENCES [dbo].[Store]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
