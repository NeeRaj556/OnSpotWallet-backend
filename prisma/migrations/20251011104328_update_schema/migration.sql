-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `profilePicture` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `locationUpdatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT '$',
    `balance` DOUBLE NOT NULL DEFAULT 0,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `receiverId` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `receivedAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
`transactedAt` DATETIME(3) NULL,
    `mode` ENUM('offline', 'online') NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
